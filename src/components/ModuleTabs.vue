<template>
  <div class="mtabs">
    <router-link
      v-for="m in items"
      :key="m.key"
      :to="m.path"
      class="mtab"
      :class="{ on: isActive(m.path) }"
      :title="m.desc"
    >
      {{ m.name }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { ModuleDef } from '@/config/modules'

defineProps<{ items: ModuleDef[] }>()
const route = useRoute()
const isActive = (p: string) => route.path === p
</script>

<style scoped>
.mtabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
}
.mtab {
  flex: 0 0 auto;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: 13px;
  white-space: nowrap;
  transition: all .15s;
}
.mtab:hover { color: var(--text); background: var(--bg-elev); }
.mtab.on {
  background: var(--bg-elev);
  color: var(--primary);
  font-weight: 500;
  box-shadow: var(--shadow);
}
[data-theme="dark"] .mtab.on { background: var(--primary-soft); }
</style>
