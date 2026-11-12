import { computed, reactive, ref, watch } from 'vue'
import { platformService, type PlatformUserItem } from '@/services/platform.service'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_POLICY_HINT,
  isPasswordValid,
  passwordPolicyError,
} from '@/lib/passwordPolicy'
import { toMessage } from '@/lib/errors'

export interface PlatformUserFormPayload {
  name: string
  email?: string
  password?: string
  phone: string
  companyId: string
  roleId: string
  isActive?: boolean
}

interface FormState {
  name: string
  email: string
  phone: string
  password: string
  companyId: string
  roleId: string
  isActive: boolean
}

interface PlatformUserFormProps {
  open: boolean
  mode: 'create' | 'edit'
  user: PlatformUserItem | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 50
const MAX_EMAIL_LENGTH = 30
const MAX_PHONE_LENGTH = 20

export function usePlatformUserForm(
  props: PlatformUserFormProps,
  onSubmit: (payload: PlatformUserFormPayload) => void,
) {
  const form = reactive<FormState>({
    name: '',
    email: '',
    phone: '',
    password: '',
    companyId: '',
    roleId: '',
    isActive: true,
  })
  const roles = ref<Array<{ label: string; value: string }>>([])
  const localError = ref<string | null>(null)
  const loadingRoles = ref(false)
  const submitted = ref(false)

  const errors = computed<Record<string, string | null>>(() => ({
    name:
      (submitted.value || form.name.length > 0) && !form.name.trim()
        ? 'Nama wajib diisi'
        : form.name.length > MAX_NAME_LENGTH
          ? `Maksimal ${MAX_NAME_LENGTH} karakter`
          : null,
    email:
      (submitted.value || form.email.length > 0) && !form.email.trim()
        ? 'Email wajib diisi'
        : form.email.length > MAX_EMAIL_LENGTH
          ? `Maksimal ${MAX_EMAIL_LENGTH} karakter`
          : form.email && !EMAIL_PATTERN.test(form.email.trim())
            ? 'Format email tidak valid'
            : null,
    phone: form.phone.length > MAX_PHONE_LENGTH ? `Maksimal ${MAX_PHONE_LENGTH} karakter` : null,
    password:
      props.mode === 'create' && (submitted.value || form.password.length > 0)
        ? !form.password
          ? 'Password wajib diisi'
          : form.password.length > PASSWORD_MAX_LENGTH
            ? `Maksimal ${PASSWORD_MAX_LENGTH} karakter`
            : passwordPolicyError(form.password)
        : null,
    companyId: submitted.value && !form.companyId ? 'Company wajib dipilih' : null,
    roleId: submitted.value && !form.roleId ? 'Role wajib dipilih' : null,
  }))

  const isFormValid = computed(
    () =>
      Boolean(form.name.trim()) &&
      form.name.length <= MAX_NAME_LENGTH &&
      Boolean(form.email.trim()) &&
      form.email.length <= MAX_EMAIL_LENGTH &&
      EMAIL_PATTERN.test(form.email.trim()) &&
      form.phone.length <= MAX_PHONE_LENGTH &&
      Boolean(form.companyId) &&
      Boolean(form.roleId) &&
      (props.mode === 'edit' ||
        (form.password.length <= PASSWORD_MAX_LENGTH && isPasswordValid(form.password))),
  )

  async function loadRoles(): Promise<void> {
    roles.value = []
    form.roleId = ''
    if (!form.companyId) return
    loadingRoles.value = true
    try {
      const result = await platformService.listRoles(form.companyId)
      roles.value = result.map((role) => ({
        label: `${role.name} ${role.isActive ? '' : ' — inactive'}`,
        value: role.id,
      }))
      if (props.user?.companyId === form.companyId && props.user.roleId) {
        form.roleId = props.user.roleId
      }
    } catch (error) {
      localError.value = toMessage(error)
    } finally {
      loadingRoles.value = false
    }
  }

  watch(
    () => [props.open, props.user] as const,
    ([open]) => {
      if (!open) return
      form.name = props.user?.name ?? ''
      form.email = props.user?.email ?? ''
      form.phone = props.user?.phone ?? ''
      form.password = ''
      form.companyId = props.user?.companyId ?? ''
      form.roleId = ''
      form.isActive = props.user?.isActive ?? true
      localError.value = null
      submitted.value = false
      void loadRoles()
    },
    { immediate: true },
  )

  watch(
    () => form.companyId,
    () => {
      if (props.open) void loadRoles()
    },
  )

  function submit(): void {
    submitted.value = true
    if (!isFormValid.value) {
      localError.value = 'Periksa kembali field yang ditandai.'
      return
    }
    localError.value = null
    const payload: PlatformUserFormPayload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      companyId: form.companyId,
      roleId: form.roleId,
    }
    if (props.mode === 'create') {
      payload.email = form.email.trim()
      payload.password = form.password
    } else {
      payload.isActive = form.isActive
    }
    onSubmit(payload)
  }

  return {
    form,
    roles,
    localError,
    loadingRoles,
    errors,
    submit,
    passwordPolicyHint: PASSWORD_POLICY_HINT,
  }
}
