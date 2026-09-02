<template>
  <div class="page">
    <div class="page-hd">
      <h2>综合管理模式</h2>
      <p>
        各业务模块运行状态监测 · 节点/接口健康检测 · 真实运行时指标与系统日志
      </p>
    </div>
    <ModuleTabs :items="tabs" class="mb" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ModuleTabs from '@/components/ModuleTabs.vue'
import { modulesOf } from '@/config/modules'

const tabs = modulesOf('admin')
</script>

<style scoped>
.mb { margin-bottom: 14px; }
</style>
