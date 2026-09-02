<template>
  <div class="page">
    <div class="page-hd">
      <h2>自我介绍</h2>
      <p>共 5 个板块 · 内容集中在 <code>src/data/resume.ts</code>，改数据即可，无需动页面</p>
    </div>
    <ModuleTabs :items="tabs" class="mb" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ModuleTabs from '@/components/ModuleTabs.vue'
import { modulesOf } from '@/config/modules'

const tabs = modulesOf('resume')
</script>

<style scoped>
.mb { margin-bottom: 14px; }
code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-soft);
  font-family: var(--mono);
  font-size: 11px;
  color: var(--primary);
}
</style>
