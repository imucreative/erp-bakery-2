<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="User Profile" />

    <div class="page-card">
      <h3 class="card-title mb-5 lg:mb-7">Profile</h3>
      <ProfileCard />
      <CompanyCard />
      <Security />
      <DangerZone />
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ProfileCard from '@/components/profile/ProfileCard.vue'
import CompanyCard from '@/components/profile/CompanyCard.vue'
import Security from '@/components/profile/Security.vue'
import DangerZone from '@/components/profile/DangerZone.vue'
</script>
