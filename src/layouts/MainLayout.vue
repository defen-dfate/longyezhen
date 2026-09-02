<template>
  <div class="shell" :class="{ collapsed: app.siderCollapsed }">
    <aside class="sider">
      <router-link to="/select" class="brand" title="返回模块选择">
        <div class="logo">
          <AppIcon name="layers" :size="18" />
        </div>
        <div class="bt">
          <strong>WorkBench</strong>
          <small>个人工作门户</small>
        </div>
      </router-link>
      <SideNav />
      <div class="sider-ft">
        <div class="ver">v1.0.0 · Vue 3 + Vite</div>
      </div>
    </aside>

    <div class="body">
      <TopBar />
      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <SmartAssistant />
  </div>
</template>

<script setup lang="ts">
import SideNav from '@/components/SideNav.vue'
import TopBar from '@/components/TopBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import SmartAssistant from '@/components/SmartAssistant.vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
</script>

<style scoped>
.shell {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.sider {
  display: flex;
  flex-direction: column;
  width: var(--side-w);
  flex: 0 0 var(--side-w);
  background: var(--bg-elev);
  border-right: 1px solid var(--border);
  transition: width .2s, flex-basis .2s;
  overflow: hidden;
}
.shell.collapsed .sider { width: 0; flex-basis: 0; border-right: none; }

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--top-h);
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  flex: 0 0 auto;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}
.brand:hover { background: var(--bg-soft); }
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
  flex: 0 0 auto;
}
.bt { display: flex; flex-direction: column; line-height: 1.25; }
.bt strong { font-size: 14px; }
.bt small { font-size: 11px; color: var(--text-3); }

.sider-ft {
  margin-top: auto;
  padding: 10px 16px;
  border-top: 1px solid var(--border-soft);
}
.ver { font-size: 11px; color: var(--text-3); white-space: nowrap; }

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
