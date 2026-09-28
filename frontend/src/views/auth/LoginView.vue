<script setup lang="ts">
/**
 * LoginView — VeeValidate + Zod form. On submit: POST /auth/login, persist
 * tokens, decode the JWT for identity/permissions, load GET /companies/me, then
 * redirect to the dashboard (or the original `redirect` query). Errors are
 * surfaced inline and via a toast; the user stays on the page (doc 21 §3).
 */
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import {
  ERPButton,
  ERPCard,
  ERPForm,
  ERPFormActions,
  ERPFormField,
  ERPInput,
  ERPPasswordInput,
} from '@/components/erp';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { ApiClientError } from '@/lib/api';
import { loginSchema } from './login.schema';

const auth = useAuthStore();
const notify = useNotificationStore();
const router = useRouter();
const route = useRoute();

const submitting = ref<boolean>(false);
const formError = ref<string | null>(null);

const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '' },
});

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true;
  formError.value = null;
  try {
    await auth.login({ email: values.email, password: values.password });
    notify.notifySuccess('Signed in', `Welcome back, ${auth.user?.email ?? ''}`);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    await router.push(redirect ?? { name: 'dashboard-owner' });
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : 'Unable to sign in. Please try again.';
    formError.value = message;
    notify.notifyError('Sign in failed', message);
  } finally {
    submitting.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">Bakery ERP</h1>
        <p class="mt-1 text-sm text-muted">Sign in to continue</p>
      </div>

      <ERPCard>
        <ERPForm :on-submit="onSubmit">
          <p
            v-if="formError"
            class="rounded-input border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {{ formError }}
          </p>

          <ERPFormField
            name="email"
            label="Email"
            v-slot="{ id, value, setValue, onBlur, invalid }"
          >
            <ERPInput
              :id="id"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              :model-value="value"
              :invalid="invalid"
              @update:model-value="setValue"
              @blur="onBlur"
            />
          </ERPFormField>

          <ERPFormField
            name="password"
            label="Password"
            v-slot="{ id, value, setValue, onBlur, invalid }"
          >
            <ERPPasswordInput
              :id="id"
              placeholder="••••••••"
              :model-value="value"
              :invalid="invalid"
              @update:model-value="setValue"
              @blur="onBlur"
            />
          </ERPFormField>

          <ERPFormActions>
            <ERPButton type="submit" :loading="submitting" block>
              Sign in
            </ERPButton>
          </ERPFormActions>
        </ERPForm>
      </ERPCard>
    </div>
  </div>
</template>
