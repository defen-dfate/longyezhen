<template>
  <div class="page">
    <div class="page-hd">
      <h2>实用工具</h2>
      <p>全部在浏览器本地运行，不上传任何数据 · 持续扩充中</p>
    </div>
    <ModuleTabs :items="tabs" class="mb" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ModuleTabs from '@/components/ModuleTabs.vue'
import { modulesOf } from '@/config/modules'

const tabs = modulesOf('tools')
</script>

<style scoped>
.mb { margin-bottom: 14px; }
</style>
