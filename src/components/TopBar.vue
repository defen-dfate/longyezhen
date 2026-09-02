<template>
  <header class="top">
    <button class="icon-btn" title="收起/展开侧边栏" @click="app.toggleSider()">
      <AppIcon name="menu" :size="17" />
    </button>

    <div class="crumb">
      <span class="dim">{{ groupName }}</span>
      <AppIcon name="chevron" :size="13" class="dim" />
      <span class="cur">{{ pageTitle }}</span>
    </div>

    <div class="grow"></div>

    <div class="meta" :title="modeTip">
      <span class="tag" :class="app.isBackend ? 'success' : 'info'">
        <AppIcon name="activity" :size="11" />
        {{ modeLabel }}
      </span>
    </div>

    <button class="icon-btn" :title="app.theme === 'light' ? '切换深色' : '切换浅色'" @click="app.toggleTheme()">
      <AppIcon :name="app.theme === 'light' ? 'moon' : 'sun'" :size="16" />
    </button>

    <div class="user" @click="showMenu = !showMenu">
      <span class="ava">{{ initial }}</span>
      <span class="uname truncate">{{ auth.displayName }}</span>
      <AppIcon name="chevron" :size="12" class="arrow" :class="{ open: showMenu }" />

      <div v-if="showMenu" class="menu card" @click.stop>
        <div class="menu-hd">
          <div class="ava lg">{{ initial }}</div>
          <div>
            <div class="nm">{{ auth.displayName }}</div>
            <div class="dim small">@{{ auth.user?.username }} · {{ roleLabel }}</div>
          </div>
        </div>
        <div class="menu-ft">
          <button class="mi danger" @click="onLogout">
            <AppIcon name="logout" :size="14" /> 退出登录
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { AUTH_MODE } from '@/api/auth'
import { GROUPS } from '@/config/modules'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const showMenu = ref(false)

const pageTitle = computed(() => (route.meta.title as string) || 'WorkBench')
const groupName = computed(
  () => GROUPS.find((g) => g.key === route.meta.group)?.name || 'WorkBench'
)
const initial = computed(() => (auth.displayName || 'U').slice(0, 1).toUpperCase())
const roleLabel = computed(() => (auth.user?.role === 'admin' ? '管理员' : '普通用户'))

const modeLabel = computed(() => (AUTH_MODE === 'api' ? '后端模式' : '本地模式'))
const modeTip = computed(() =>
  AUTH_MODE === 'api'
    ? '已接入真实后端 API'
    : '本地模拟认证（静态部署），可在设置页切换为后端模式'
)

async function onLogout() {
  showMenu.value = false
  app.log('info', 'auth', `用户 ${auth.user?.username} 退出登录`)
  await auth.logout()
  router.replace({ name: 'login' })
}

function closeMenu(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (!t.closest('.user')) showMenu.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
</script>

<style scoped>
.top {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--top-h);
  padding: 0 16px;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
  position: relative;
  z-index: 20;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}
.icon-btn:hover { background: var(--bg-soft); color: var(--primary); border-color: var(--border); }

.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.crumb .cur { font-weight: 500; }

.meta { display: flex; }

.user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
  transition: background .15s;
}
.user:hover { background: var(--bg-soft); }

.ava {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex: 0 0 auto;
}
.ava.lg { width: 34px; height: 34px; font-size: 14px; }
.uname { font-size: 13px; max-width: 110px; }
.arrow { transition: transform .2s; opacity: .6; }
.arrow.open { transform: rotate(-90deg); }

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 220px;
  padding: 0;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.menu-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.menu-hd .nm { font-size: 13px; font-weight: 500; }
.menu-bd, .menu-ft { padding: 6px; }
.menu-ft { border-top: 1px solid var(--border-soft); }

.mi {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
}
.mi:hover { background: var(--bg-soft); color: var(--text); }
.mi.danger:hover { color: var(--danger); background: var(--danger-soft); }
</style>
