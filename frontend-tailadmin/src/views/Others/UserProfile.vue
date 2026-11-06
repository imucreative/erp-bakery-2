<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Profile" desc="Kelola profile, company dan keamanan akun Anda.">
      <ProfileCard />
      <CompanyCard />
      <Security />
      <DangerZone />
    </ComponentCard>
  </AdminLayout>
</template>

<script setup lang="ts">
const pageTitle = 'User Profile'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ProfileCard from '@/components/profile/ProfileCard.vue'
import CompanyCard from '@/components/profile/CompanyCard.vue'
import Security from '@/components/profile/Security.vue'
import DangerZone from '@/components/profile/DangerZone.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
</script>
