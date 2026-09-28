<script setup lang="ts">
/**
 * UsersFormDialog — create/edit user modal. Composes ERPFormDialog + ERPForm +
 * ERPFormField + ERPInput/ERPPasswordInput + ERPSelect + ERPMultiSelect +
 * ERPStatusBadge + ERPButton (foundation). No raw controls or primitives here
 * (doc 19 §5).
 *
 * Form behaviour (doc 38):
 *  - Validation via VeeValidate + Zod (`toTypedSchema`).
 *  - CREATE: email + password required (password min 8); email is editable.
 *  - EDIT: email is shown read-only (backend PUT does not accept it) and there
 *    is no password field; an "Active" toggle is offered.
 *  - `roleId` is required in both modes and chosen via ERPSelect.
 *  - `outletIds` are assigned via ERPMultiSelect (full-sync on save).
 *
 * On submit the parent runs the mutation and controls `submitting`. When the
 * mutation fails the parent keeps the dialog open with the current values so
 * the user does not lose their input (doc 21 §3).
 */
import { computed, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import {
  ERPFormDialog,
  ERPForm,
  ERPFormField,
  ERPFormSection,
  ERPFormActions,
  ERPInput,
  ERPPasswordInput,
  ERPSelect,
  ERPMultiSelect,
  ERPButton,
  type ERPSelectOption,
  type ERPMultiSelectOption,
} from '@/components/erp';
import type { Role } from '@/types/role';
import type { Outlet } from '@/types/outlet';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserDetail,
} from '@/types/user';

type Mode = 'create' | 'edit';

/**
 * Superset of all form fields across both modes. Email/password are only used
 * (and validated) in create mode; isActive only in edit mode. A hidden `mode`
 * flag lives in the values so a single stable Zod schema can validate
 * conditionally — this keeps `useForm`'s type parameter constant (no union
 * schema) and `values`/`setFieldValue` paths stable.
 */
interface UserFormValues {
  mode: Mode;
  name: string;
  email: string;
  password: string;
  phone: string;
  roleId: string;
  isActive: boolean;
  outletIds: string[];
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: Mode;
    /** Prefill source for edit mode; null while loading or in create mode. */
    user: UserDetail | null;
    detailLoading?: boolean;
    roles: Role[];
    outlets: Outlet[];
    submitting?: boolean;
  }>(),
  { user: null, detailLoading: false, submitting: false },
);

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void;
  (event: 'submit-create', payload: CreateUserPayload): void;
  (event: 'submit-edit', payload: UpdateUserPayload): void;
}>();

const isEdit = computed<boolean>(() => props.mode === 'edit');

const title = computed<string>(() => (isEdit.value ? 'Edit user' : 'Add user'));
const description = computed<string>(() =>
  isEdit.value
    ? 'Update the user, reassign their role, or change outlet access.'
    : 'Invite a user to your company and assign their role and outlets.',
);

// A single stable schema: email/password rules apply only in create mode via
// conditional refinement keyed on the hidden `mode` field.
const userFormSchema = z
  .object({
    mode: z.enum(['create', 'edit']),
    name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
    email: z.string().trim().max(100, 'Max 100 characters'),
    password: z.string(),
    phone: z.string().trim().max(30, 'Max 30 characters'),
    roleId: z.string().uuid('Select a role'),
    isActive: z.boolean(),
    outletIds: z.array(z.string().uuid()),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'create') {
      const email = data.email.trim();
      if (email.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Email is required',
        });
      } else if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Enter a valid email',
        });
      }
      if (data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password must be at least 8 characters',
        });
      }
    }
  });

const validationSchema = toTypedSchema(userFormSchema);

const { handleSubmit, resetForm, values, setFieldValue } = useForm<UserFormValues>({
  validationSchema,
});

// outletIds is managed outside VeeValidate field wiring (a plain selection
// list); isActive is a toggle. Both live in the form values so reset/submit
// stay in one place.
const outletIds = computed<string[]>(() => values.outletIds ?? []);
const isActive = computed<boolean>(() => Boolean(values.isActive));

const roleOptions = computed<ERPSelectOption[]>(() =>
  props.roles.map((role) => ({ value: role.id, label: role.name })),
);

// Offer active outlets plus any already-assigned (possibly inactive) outlet so
// an existing assignment is never silently dropped from the picker.
const outletOptions = computed<ERPMultiSelectOption[]>(() => {
  const seen = new Set<string>();
  const options: ERPMultiSelectOption[] = [];

  for (const outlet of props.outlets) {
    seen.add(outlet.id);
    options.push({
      value: outlet.id,
      label: outlet.name,
      hint: outlet.code,
      disabled: false,
    });
  }

  if (isEdit.value && props.user) {
    for (const assigned of props.user.outlets) {
      if (!seen.has(assigned.outletId)) {
        seen.add(assigned.outletId);
        options.push({
          value: assigned.outletId,
          label: assigned.name,
          hint: `${assigned.code} · inactive`,
          disabled: false,
        });
      }
    }
  }

  return options;
});

/** Resets the form to the appropriate defaults for the current mode/user. */
function syncForm(): void {
  if (isEdit.value && props.user) {
    resetForm({
      values: {
        mode: 'edit',
        name: props.user.name,
        email: props.user.email,
        password: '',
        phone: props.user.phone ?? '',
        roleId: props.user.roleId ?? '',
        isActive: props.user.isActive,
        outletIds: props.user.outlets.map((outlet) => outlet.outletId),
      },
    });
    return;
  }
  resetForm({
    values: {
      mode: 'create',
      name: '',
      email: '',
      password: '',
      phone: '',
      roleId: '',
      isActive: true,
      outletIds: [],
    },
  });
}

// Re-seed the form whenever the dialog opens, the mode changes, or the detail
// arrives (edit mode opens before the detail query resolves).
watch(
  () => [props.open, props.mode, props.user] as const,
  ([open]) => {
    if (open) {
      syncForm();
    }
  },
  { immediate: true },
);

function onOutletIdsChange(next: string[]): void {
  setFieldValue('outletIds', next);
}

function onActiveChange(next: boolean): void {
  setFieldValue('isActive', next);
}

const onSubmit = handleSubmit((formValues) => {
  const phone = formValues.phone.trim();

  if (isEdit.value) {
    const payload: UpdateUserPayload = {
      name: formValues.name.trim(),
      phone: phone.length > 0 ? phone : undefined,
      roleId: formValues.roleId,
      isActive: formValues.isActive,
      outletIds: formValues.outletIds,
    };
    emit('submit-edit', payload);
    return;
  }

  const payload: CreateUserPayload = {
    name: formValues.name.trim(),
    email: formValues.email.trim(),
    password: formValues.password,
    phone: phone.length > 0 ? phone : undefined,
    roleId: formValues.roleId,
    outletIds: formValues.outletIds,
  };
  emit('submit-create', payload);
});

function onClose(): void {
  emit('update:open', false);
}

function onUpdateOpen(value: boolean): void {
  emit('update:open', value);
}
</script>

<template>
  <ERPFormDialog
    :open="open"
    :title="title"
    :description="description"
    :loading="isEdit && detailLoading"
    loading-label="Loading user..."
    @update:open="onUpdateOpen"
  >
    <ERPForm :on-submit="onSubmit">
      <ERPFormSection>
        <ERPFormField name="name" label="Name" v-slot="{ id, value, setValue, onBlur, invalid }">
          <ERPInput
            :id="id"
            :model-value="value"
            placeholder="Full name"
            :invalid="invalid"
            @update:model-value="setValue"
            @blur="onBlur"
          />
        </ERPFormField>

        <ERPFormField
          v-if="!isEdit"
          name="email"
          label="Email"
          v-slot="{ id, value, setValue, onBlur, invalid }"
        >
          <ERPInput
            :id="id"
            :model-value="value"
            type="email"
            placeholder="name@company.com"
            autocomplete="off"
            :invalid="invalid"
            @update:model-value="setValue"
            @blur="onBlur"
          />
        </ERPFormField>

        <div v-else class="space-y-1.5">
          <span class="block text-sm font-medium text-foreground">Email</span>
          <p class="rounded-input border border-border bg-background px-3.5 py-2.5 text-sm text-muted">
            {{ user?.email ?? '—' }}
          </p>
        </div>

        <ERPFormField
          v-if="!isEdit"
          name="password"
          label="Password"
          v-slot="{ id, value, setValue, onBlur, invalid }"
        >
          <ERPPasswordInput
            :id="id"
            :model-value="value"
            placeholder="At least 8 characters"
            autocomplete="new-password"
            :invalid="invalid"
            @update:model-value="setValue"
            @blur="onBlur"
          />
        </ERPFormField>

        <ERPFormField name="phone" label="Phone (optional)" v-slot="{ id, value, setValue, onBlur, invalid }">
          <ERPInput
            :id="id"
            :model-value="value"
            placeholder="0812-3456-7890"
            :invalid="invalid"
            @update:model-value="setValue"
            @blur="onBlur"
          />
        </ERPFormField>

        <ERPFormField name="roleId" label="Role" v-slot="{ id, value, setValue, onBlur, invalid }">
          <ERPSelect
            :id="id"
            :model-value="value"
            :options="roleOptions"
            placeholder="Select a role"
            :invalid="invalid"
            @update:model-value="setValue"
            @blur="onBlur"
          />
        </ERPFormField>
      </ERPFormSection>

      <ERPFormSection title="Outlet access" description="Choose which outlets this user can access.">
        <ERPMultiSelect
          :model-value="outletIds"
          :options="outletOptions"
          empty-label="No outlets available for this company."
          @update:model-value="onOutletIdsChange"
        />
      </ERPFormSection>

      <ERPFormSection v-if="isEdit" title="Status">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm text-foreground">
              {{ isActive ? 'User is active' : 'User is inactive' }}
            </p>
            <p class="text-xs text-muted">
              Inactive users cannot sign in but their records are kept.
            </p>
          </div>
          <ERPButton
            variant="secondary"
            size="sm"
            @click="onActiveChange(!isActive)"
          >
            {{ isActive ? 'Deactivate' : 'Activate' }}
          </ERPButton>
        </div>
      </ERPFormSection>

      <ERPFormActions>
        <ERPButton variant="secondary" :disabled="submitting" @click="onClose">
          Cancel
        </ERPButton>
        <ERPButton type="submit" :loading="submitting">
          {{ isEdit ? 'Save changes' : 'Create user' }}
        </ERPButton>
      </ERPFormActions>
    </ERPForm>
  </ERPFormDialog>
</template>
