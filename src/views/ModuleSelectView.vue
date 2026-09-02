<template>
  <div class="select">
    <header class="top">
      <div class="brand">
        <div class="logo"><AppIcon name="layers" :size="18" /></div>
        <strong>WorkBench</strong>
      </div>
      <div class="user" @click="showMenu = !showMenu">
        <span class="ava">{{ initial }}</span>
        <span class="uname truncate">{{ auth.displayName }}</span>
        <AppIcon name="chevron" :size="12" class="arrow" :class="{ open: showMenu }" />
        <div v-if="showMenu" class="menu card" @click.stop>
          <button class="mi danger" @click="onLogout">
            <AppIcon name="logout" :size="14" /> 退出登录
          </button>
        </div>
      </div>
    </header>

    <main class="body">
      <div class="head">
        <h1>选择一个模块</h1>
        <p>登录成功，请选择要进入的工作区</p>
      </div>

      <div class="grid">
        <button
          v-for="g in cards"
          :key="g.key"
          class="card"
          :style="{ '--accent': g.color }"
          @click="enter(g.path)"
        >
          <div class="art" v-html="g.art"></div>
          <div class="name">{{ g.name }}</div>
          <div class="desc">{{ g.desc }}</div>
          <div class="go">
            进入 <AppIcon name="chevron" :size="14" class="rt" />
          </div>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { GROUPS, type ModuleGroup } from '@/config/modules'

const router = useRouter()
const auth = useAuthStore()
const showMenu = ref(false)

const COLORS: Record<ModuleGroup, string> = {
  resume: '#5b8bff',
  gis: '#e0863a',
  tools: '#22b07d',
  admin: '#a855c9'
}

const ARTS: Record<ModuleGroup, string> = {
  resume: `<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="12" y="14" width="96" height="44" rx="9" stroke="currentColor" stroke-width="3"/>
    <circle cx="34" cy="33" r="10" stroke="currentColor" stroke-width="3"/>
    <path d="M24 47c2-7 14-7 16 0" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
    <line x1="54" y1="28" x2="92" y2="28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <line x1="54" y1="40" x2="92" y2="40" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".45"/>
    <line x1="54" y1="50" x2="78" y2="50" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".45"/>
  </svg>`,
  gis: `<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="30" r="5" fill="currentColor"/>
    <circle cx="60" cy="30" r="13" stroke="currentColor" stroke-width="2.4" opacity=".45"/>
    <circle cx="60" cy="30" r="22" stroke="currentColor" stroke-width="2.4" opacity=".22"/>
    <path d="M6 60h26l4-12 5 22 5-30 4 20h40" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
  </svg>`,
  tools: `<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="16" y="12" width="48" height="36" rx="8" stroke="currentColor" stroke-width="3"/>
    <circle cx="30" cy="24" r="4" fill="currentColor" opacity=".6"/>
    <path d="M24 42l10-11 7 7 11-13" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M86 18v30m0 0l-8-9m8 9l8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  admin: `<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="12" y="12" width="96" height="48" rx="9" stroke="currentColor" stroke-width="3"/>
    <line x1="12" y1="27" x2="108" y2="27" stroke="currentColor" stroke-width="1.8" opacity=".4"/>
    <rect x="24" y="38" width="14" height="14" rx="2.5" fill="currentColor" opacity=".55"/>
    <rect x="44" y="32" width="14" height="20" rx="2.5" fill="currentColor"/>
    <rect x="64" y="44" width="14" height="8" rx="2.5" fill="currentColor" opacity=".4"/>
    <path d="M82 50l8-11 7 6 9-15" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

const cards = GROUPS.map((g) => ({
  key: g.key,
  name: g.name,
  desc: g.desc,
  path: g.path,
  art: ARTS[g.key],
  color: COLORS[g.key]
}))

const initial = computed(() => (auth.displayName || 'U').slice(0, 1).toUpperCase())

function enter(path: string) {
  router.push(path)
}

async function onLogout() {
  showMenu.value = false
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<style scoped>
.select {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  background:
    radial-gradient(1100px 560px at 12% -10%, rgba(91, 139, 255, .12), transparent 55%),
    radial-gradient(1000px 520px at 100% 110%, rgba(168, 85, 201, .12), transparent 55%),
    var(--bg);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  flex: 0 0 auto;
  padding: 0 22px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elev);
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand .logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
}
.brand strong { font-size: 15px; }

.user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
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
}
.uname { font-size: 13px; max-width: 110px; }
.arrow { transition: transform .2s; opacity: .6; }
.arrow.open { transform: rotate(-90deg); }
.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 180px;
  padding: 6px;
  box-shadow: var(--shadow-lg);
}
.mi {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.mi:hover { background: var(--bg-soft); }
.mi.danger:hover { color: var(--danger); background: var(--danger-soft); }

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 30px 34px 38px;
}
.head { text-align: center; margin-bottom: 26px; }
.head h1 { font-size: 28px; letter-spacing: -.3px; }
.head p { margin-top: 8px; font-size: 14px; color: var(--text-3); }

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
  min-height: 0;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  padding: 34px 30px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, var(--bg-elev)), var(--bg-elev));
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  overflow: hidden;
  transition: transform .2s, box-shadow .2s, border-color .2s;
}
.card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: var(--accent);
  opacity: .85;
}
.card:hover {
  transform: translateY(-6px);
  border-color: var(--accent);
  box-shadow: 0 18px 40px -16px color-mix(in srgb, var(--accent) 60%, transparent);
}
.art {
  width: 100%;
  height: 104px;
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-elev));
  color: var(--accent);
  overflow: hidden;
}
.art :deep(svg) {
  width: 64%;
  max-height: 80px;
  height: auto;
}
.name { font-size: 24px; font-weight: 700; letter-spacing: -.2px; }
.desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-3);
}
.go {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  padding-top: 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}
.rt { transform: rotate(-90deg); transition: transform .2s; }
.card:hover .rt { transform: rotate(-90deg) translateX(3px); }

@media (max-width: 1100px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-content: start; }
  .card { height: 280px; }
}
@media (max-width: 560px) {
  .body { padding: 22px 18px 28px; }
  .grid { grid-template-columns: 1fr; }
  .card { height: 240px; }
}
</style>
