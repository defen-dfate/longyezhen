<template>
  <nav class="nav">
    <router-link to="/select" class="back" title="返回模块选择">
      <AppIcon name="chevron" :size="13" class="lt" />
      <span>模块选择</span>
    </router-link>

    <div v-if="current" class="grp">
      <div class="grp-title" :style="{ '--accent': accent }">
        <span class="ic"><AppIcon :name="groupIcon(current.key)" :size="15" /></span>
        <span class="grow truncate">{{ current.name }}</span>
      </div>
      <div class="grp-bd">
        <router-link
          v-for="m in currentModules"
          :key="m.key"
          :to="m.path"
          class="item"
          :class="{ active: isActive(m.path) }"
          :title="m.desc"
        >
          <i class="dot"></i>
          <span class="truncate">{{ m.name }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { GROUPS, modulesOf, type ModuleGroup } from '@/config/modules'

const route = useRoute()

const activeGroup = computed<ModuleGroup>(() => (route.meta.group as ModuleGroup) || 'resume')
const current = computed(() => GROUPS.find((g) => g.key === activeGroup.value))
const currentModules = computed(() => modulesOf(activeGroup.value))

const ACCENTS: Record<ModuleGroup, string> = {
  resume: '#5b8bff',
  tools: '#22b07d',
  gis: '#e0863a',
  admin: '#a855c9'
}
const accent = computed(() => ACCENTS[activeGroup.value])

function isActive(path: string) {
  return route.path === path
}
function groupIcon(key: ModuleGroup) {
  return { resume: 'user', tools: 'tools', gis: 'globe', admin: 'gauge' }[key]
}
</script>

<style scoped>
.nav { padding: 10px 10px; overflow-y: auto; }
.back {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 10px;
  margin-bottom: 10px;
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: 12.5px;
  text-decoration: none;
  transition: all .15s;
}
.back:hover { background: var(--bg-soft); color: var(--text); }
.back .lt { transform: rotate(90deg); }

.grp { margin-bottom: 4px; }
.grp-title {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}
.grp-title .ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  flex: 0 0 auto;
}
.grp-bd { padding: 2px 0 4px 6px; }
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: 13px;
  text-decoration: none;
  transition: all .15s;
}
.item:hover { background: var(--bg-soft); color: var(--text); }
.item.active { color: var(--primary); background: var(--primary-soft); font-weight: 500; }

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-3);
  flex: 0 0 auto;
}
.item.active .dot { background: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
</style>
