<template>
  <div class="grid" style="gap: 14px">
    <section class="card">
      <div class="card-bd row between wrap" style="gap: 12px">
        <div class="row wrap" style="gap: 12px">
          <div>
            <label class="lbl">分区筛选</label>
            <select v-model="filterGroup" class="select" style="width: 130px">
              <option value="">全部分区</option>
              <option v-for="g in GROUPS" :key="g.key" :value="g.key">{{ g.name }}</option>
            </select>
          </div>
          <div>
            <label class="lbl">状态筛选</label>
            <select v-model="filterStatus" class="select" style="width: 120px">
              <option value="">全部状态</option>
              <option value="ok">正常</option>
              <option value="warn">告警</option>
              <option value="error">异常</option>
              <option value="unknown">未检测</option>
            </select>
          </div>
        </div>
        <div class="row" style="gap: 10px">
          <button class="btn primary" :disabled="checking" @click="runCheck">
            <AppIcon name="refresh" :size="14" />{{ checking ? '检测中…' : '重新检测' }}
          </button>
          <span v-if="lastChecked" class="dim small mono">最近：{{ fmtAgo(lastChecked) }}</span>
        </div>
      </div>
    </section>

    <!-- 健康概览环 -->
    <div class="grid grid-4">
      <div class="stat accent"><div class="k">检测总数</div><div class="v">{{ rows.length }}</div><div class="d">已覆盖模块</div></div>
      <div class="stat"><div class="k">正常</div><div class="v" style="color: var(--success)">{{ okCount }}</div><div class="d">{{ okPct }}%</div></div>
      <div class="stat"><div class="k">告警</div><div class="v" style="color: var(--warning)">{{ warnCount }}</div><div class="d">需关注</div></div>
      <div class="stat"><div class="k">异常</div><div class="v" style="color: var(--danger)">{{ errorCount }}</div><div class="d">需排查</div></div>
    </div>

    <!-- 探针明细 -->
    <section class="card">
      <div class="card-hd"><h3>逐模块探针</h3><span class="sub">演示性探测，可替换为真实接口探活</span></div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr>
              <th>模块</th><th>分区</th><th>状态</th>
              <th class="num">延迟(ms)</th><th>诊断</th><th class="num">检测时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.key">
              <td>{{ r.name }}</td>
              <td><span class="dim small">{{ groupName(r.group) }}</span></td>
              <td><span class="tag" :class="statusTone(r.status)">{{ statusLabel(r.status) }}</span></td>
              <td class="num mono">{{ r.status === 'error' ? '—' : r.latency }}</td>
              <td class="dim small" style="max-width: 280px">{{ r.note }}</td>
              <td class="num dim small mono">{{ r.checkedAt ? fmtTime(r.checkedAt) : '—' }}</td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="6" class="empty">无匹配模块</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 异常重点 -->
    <section v-if="errorRows.length" class="card">
      <div class="card-hd"><h3>重点排查</h3><span class="sub">{{ errorRows.length }} 个异常模块</span></div>
      <div class="card-bd">
        <div v-for="r in errorRows" :key="r.key" class="alert">
          <AppIcon name="alert" :size="14" />
          <div class="grow">
            <strong style="font-size: 13px">{{ r.name }}</strong>
            <span class="dim small"> · {{ groupName(r.group) }}</span>
            <div class="small muted mt-sm">{{ r.note }}</div>
          </div>
          <button class="btn sm" @click="runCheck"><AppIcon name="refresh" :size="12" />重试</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { GROUPS, MODULES, type ModuleGroup } from '@/config/modules'
import { runHealthChecks, statusTone } from '@/utils/health'
import { fmtTime, fmtAgo } from '@/utils/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const checking = ref(false)
const filterGroup = ref<ModuleGroup | ''>('')
const filterStatus = ref<string>('')

const rows = computed(() =>
  MODULES.map((m) => ({
    key: m.key,
    name: m.name,
    group: m.group,
    status: app.moduleHealth[m.key]?.status || ('unknown' as const),
    latency: app.moduleHealth[m.key]?.latency || 0,
    note: app.moduleHealth[m.key]?.note || '尚未检测',
    checkedAt: app.moduleHealth[m.key]?.checkedAt || null
  }))
)

const filtered = computed(() =>
  rows.value.filter((r) => (!filterGroup.value || r.group === filterGroup.value) && (!filterStatus.value || r.status === filterStatus.value))
)
const errorRows = computed(() => rows.value.filter((r) => r.status === 'error'))
const okCount = computed(() => rows.value.filter((r) => r.status === 'ok').length)
const warnCount = computed(() => rows.value.filter((r) => r.status === 'warn').length)
const errorCount = computed(() => rows.value.filter((r) => r.status === 'error').length)
const okPct = computed(() => (rows.value.length ? Math.round((okCount.value / rows.value.length) * 100) : 0))
const lastChecked = computed(() => {
  const ts = rows.value.map((r) => r.checkedAt || 0).filter(Boolean)
  return ts.length ? Math.max(...ts) : null
})

function groupName(g: ModuleGroup) {
  return GROUPS.find((x) => x.key === g)?.name || g
}
function statusLabel(s: string) {
  return s === 'ok' ? '正常' : s === 'warn' ? '告警' : s === 'error' ? '异常' : '未检测'
}

function runCheck() {
  checking.value = true
  setTimeout(() => {
    runHealthChecks().forEach((h) => app.setHealth(h))
    app.log('success', 'admin', '已重新执行健康检测')
    checking.value = false
  }, 500)
}
</script>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid var(--danger);
  color: var(--danger);
  margin-bottom: 8px;
}
.alert:last-child { margin-bottom: 0; }
.muted { color: var(--text-2); }
</style>
