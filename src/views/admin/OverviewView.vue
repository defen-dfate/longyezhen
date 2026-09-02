<template>
  <div class="grid" style="gap: 14px">
    <!-- 概览指标 -->
    <div class="grid grid-4">
      <div class="stat accent">
        <div class="k">模块总数</div>
        <div class="v">{{ MODULES.length }}</div>
        <div class="d">4 大分区</div>
      </div>
      <div class="stat">
        <div class="k">健康模块</div>
        <div class="v" style="color: var(--success)">{{ okCount }}</div>
        <div class="d">{{ warnCount }} 告警 · {{ errorCount }} 异常</div>
      </div>
      <div class="stat">
        <div class="k">累计访问</div>
        <div class="v">{{ app.totalVisits }}</div>
        <div class="d">本会话页面访问</div>
      </div>
      <div class="stat">
        <div class="k">压缩节省</div>
        <div class="v" style="color: var(--primary)">{{ fmtBytes(app.savedBytes) }}</div>
        <div class="d">图像工具累计</div>
      </div>
    </div>

    <!-- 操作 -->
    <section class="card">
      <div class="card-bd row between wrap" style="gap: 12px">
        <div class="row" style="gap: 10px">
          <button class="btn primary" :disabled="checking" @click="runCheck">
            <AppIcon name="refresh" :size="14" />{{ checking ? '检测中…' : '运行健康检查' }}
          </button>
          <span v-if="lastChecked" class="dim small mono">最近检测：{{ fmtAgo(lastChecked) }}</span>
        </div>
        <div class="row" style="gap: 10px">
          <span class="tag success">{{ okCount }} 正常</span>
          <span class="tag warning">{{ warnCount }} 告警</span>
          <span class="tag danger">{{ errorCount }} 异常</span>
        </div>
      </div>
    </section>

    <!-- 分区状态 -->
    <div class="grid grid-4">
      <section v-for="g in groups" :key="g.key" class="card">
        <div class="card-bd">
          <div class="row between">
            <strong style="font-size: 14px">{{ g.name }}</strong>
            <span class="tag" :class="groupTone(g.key)">{{ groupCount(g.key) }} 模块</span>
          </div>
          <p class="dim small mt-sm">{{ g.desc }}</p>
          <div class="row between mt-sm">
            <span class="dim small">正常</span>
            <span class="mono small" style="color: var(--success)">{{ groupOk(g.key) }}</span>
          </div>
          <div class="row between">
            <span class="dim small">异常</span>
            <span class="mono small" style="color: var(--danger)">{{ groupErr(g.key) }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- 模块明细 -->
    <section class="card">
      <div class="card-hd"><h3>模块运行状态</h3><span class="sub">点击行前往对应模块</span></div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr><th>模块</th><th>分区</th><th>状态</th><th class="num">访问</th><th class="num">延迟(ms)</th><th>说明</th><th class="num">检测时间</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="m in moduleRows"
              :key="m.key"
              class="click"
              @click="go(m.path)"
            >
              <td>{{ m.name }}</td>
              <td><span class="dim small">{{ groupName(m.group) }}</span></td>
              <td><span class="tag" :class="statusTone(m.status)">{{ statusLabel(m.status) }}</span></td>
              <td class="num mono">{{ app.visits[m.path] || 0 }}</td>
              <td class="num mono">{{ m.latency || '-' }}</td>
              <td class="dim small truncate" style="max-width: 260px">{{ m.note }}</td>
              <td class="num dim small mono">{{ m.checkedAt ? fmtAgo(m.checkedAt) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 最近日志 -->
    <section class="card">
      <div class="card-hd">
        <h3>最近运行日志</h3>
        <span class="sub">{{ app.logs.length }} 条记录</span>
      </div>
      <div class="card-bd flush">
        <div v-if="!app.logs.length" class="empty">暂无日志，操作各模块后会在此记录</div>
        <table v-else class="table">
          <thead><tr><th class="num">时间</th><th>级别</th><th>模块</th><th>消息</th></tr></thead>
          <tbody>
            <tr v-for="l in app.logs.slice(0, 8)" :key="l.id">
              <td class="num mono dim small">{{ fmtTime(l.ts, false) }}</td>
              <td><span class="tag" :class="levelTone(l.level)">{{ levelLabel(l.level) }}</span></td>
              <td class="mono small">{{ l.module }}</td>
              <td class="small">{{ l.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { GROUPS, MODULES, type ModuleGroup } from '@/config/modules'
import { runHealthChecks, statusTone } from '@/utils/health'
import { fmtBytes, fmtTime, fmtAgo } from '@/utils/format'
import { useAppStore, type ModuleHealth } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const checking = ref(false)

const groups = GROUPS

const healthList = computed(() =>
  MODULES.map((m) => app.moduleHealth[m.key]).filter(Boolean) as ModuleHealth[]
)
const okCount = computed(() => healthList.value.filter((h) => h.status === 'ok').length)
const warnCount = computed(() => healthList.value.filter((h) => h.status === 'warn').length)
const errorCount = computed(() => healthList.value.filter((h) => h.status === 'error').length)
const lastChecked = computed(() => {
  const ts = healthList.value.map((h) => h.checkedAt || 0).filter(Boolean)
  return ts.length ? Math.max(...ts) : null
})

const moduleRows = computed(() =>
  MODULES.map((m) => ({
    key: m.key,
    name: m.name,
    path: m.path,
    group: m.group,
    status: app.moduleHealth[m.key]?.status || ('unknown' as const),
    latency: app.moduleHealth[m.key]?.latency || 0,
    note: app.moduleHealth[m.key]?.note || '尚未检测',
    checkedAt: app.moduleHealth[m.key]?.checkedAt || null
  }))
)

function groupName(g: ModuleGroup) {
  return GROUPS.find((x) => x.key === g)?.name || g
}
function groupCount(g: ModuleGroup) {
  return MODULES.filter((m) => m.group === g).length
}
function groupOk(g: ModuleGroup) {
  return healthList.value.filter((h) => h.group === g && h.status === 'ok').length
}
function groupErr(g: ModuleGroup) {
  return healthList.value.filter((h) => h.group === g && h.status === 'error').length
}
function groupTone(g: ModuleGroup) {
  const err = groupErr(g)
  const warn = healthList.value.filter((h) => h.group === g && h.status === 'warn').length
  if (err) return 'danger'
  if (warn) return 'warning'
  if (healthList.value.some((h) => h.group === g)) return 'success'
  return ''
}

function statusLabel(s: string) {
  return s === 'ok' ? '正常' : s === 'warn' ? '告警' : s === 'error' ? '异常' : '未检测'
}
function levelLabel(l: string) {
  return l === 'info' ? '信息' : l === 'warn' ? '警告' : l === 'error' ? '错误' : '成功'
}
function levelTone(l: string) {
  return l === 'info' ? 'info' : l === 'warn' ? 'warning' : l === 'error' ? 'danger' : 'success'
}

function go(path: string) {
  router.push(path)
}

function runCheck() {
  checking.value = true
  // 模拟异步检测
  setTimeout(() => {
    const res = runHealthChecks()
    res.forEach((h) => {
      h.visits = app.visits[h.path] || 0
      app.setHealth(h)
    })
    app.log('success', 'admin', `完成 ${res.length} 个模块的健康检查`)
    checking.value = false
  }, 600)
}
</script>

<style scoped>
.click { cursor: pointer; }
.truncate { display: inline-block; max-width: 260px; }
</style>
