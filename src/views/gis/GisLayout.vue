<template>
  <div class="page">
    <div class="page-hd">
      <h2>水库地震监测</h2>
    </div>
    <ModuleTabs :items="tabs" class="mb" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ModuleTabs from '@/components/ModuleTabs.vue'
import { modulesOf } from '@/config/modules'

const tabs = modulesOf('gis')
</script>

<style scoped>
.mb { margin-bottom: 14px; }
</style>
