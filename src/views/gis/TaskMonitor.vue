<template>
  <div class="grid" style="gap: 14px">
    <!-- 汇总 -->
    <div class="grid grid-4">
      <div class="stat accent">
        <div class="k">进行中</div>
        <div class="v">{{ running.length }}</div>
        <div class="d">正在计算</div>
      </div>
      <div class="stat">
        <div class="k">排队中</div>
        <div class="v">{{ queued.length }}</div>
        <div class="d">等待调度</div>
      </div>
      <div class="stat">
        <div class="k">已完成</div>
        <div class="v">{{ success.length }}</div>
        <div class="d">成功结束</div>
      </div>
      <div class="stat">
        <div class="k">失败</div>
        <div class="v" style="color: var(--danger)">{{ failed.length }}</div>
        <div class="d">需排查</div>
      </div>
    </div>

    <!-- 操作 -->
    <section class="card">
      <div class="card-bd row between wrap" style="gap: 12px">
        <div class="row" style="gap: 10px">
          <button class="btn" :class="{ primary: auto }" @click="toggleAuto">
            <AppIcon name="activity" :size="14" />{{ auto ? '停止自动模拟' : '自动模拟推进' }}
          </button>
          <button class="btn" @click="stepOnce"><AppIcon name="zap" :size="14" />推进一轮</button>
        </div>
        <div class="row" style="gap: 10px">
          <span class="dim small mono">集群：{{ nodes.length }} 节点</span>
          <span class="tag info">GPU ×{{ gpuCount }}</span>
          <span class="tag">CPU ×{{ cpuCount }}</span>
        </div>
      </div>
    </section>

    <!-- 任务列表 -->
    <section class="card">
      <div class="card-hd">
        <h3>计算任务队列</h3>
        <span class="sub">{{ tasks.length }} 个任务 · 最近提交优先</span>
      </div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr>
              <th>任务编号</th><th>名称</th><th>类型</th>
              <th>状态</th><th class="num" style="width: 220px">进度</th>
              <th>调度节点</th><th>预计耗时</th><th class="num">提交时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.id">
              <td class="mono">{{ t.id }}</td>
              <td>{{ t.name }}</td>
              <td>{{ t.type }}</td>
              <td><span class="tag" :class="statusTone(t.status)">{{ statusLabel(t.status) }}</span></td>
              <td>
                <div class="row" style="gap: 8px">
                  <div class="bar grow"><i :style="{ width: t.progress + '%', background: barColor(t.status) }"></i></div>
                  <span class="mono small dim" style="width: 34px; text-align: right">{{ t.progress }}%</span>
                </div>
              </td>
              <td class="mono">{{ t.node }}</td>
              <td class="mono small">{{ t.cost }}</td>
              <td class="mono dim small">{{ fmtAgo(t.submitAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 节点负载 -->
    <section class="card">
      <div class="card-hd"><h3>计算节点负载</h3><span class="sub">演示状态</span></div>
      <div class="card-bd">
        <div class="grid grid-4">
          <div v-for="n in nodes" :key="n.name" class="node">
            <div class="row between">
              <span class="mono small">{{ n.name }}</span>
              <span class="tag" :class="n.busy ? 'warning' : 'success'">{{ n.busy ? '繁忙' : '空闲' }}</span>
            </div>
            <div class="bar mt-sm"><i :style="{ width: n.load + '%' }"></i></div>
            <div class="dim small mt-sm mono">负载 {{ n.load }}% · {{ n.kind }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { tasks as baseTasks, type TaskItem } from '@/data/gis'
import { fmtAgo } from '@/utils/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

// 本地可变副本（模拟推进）
const tasks = ref<TaskItem[]>(baseTasks.map((t) => ({ ...t })))

const running = computed(() => tasks.value.filter((t) => t.status === 'running'))
const queued = computed(() => tasks.value.filter((t) => t.status === 'queued'))
const success = computed(() => tasks.value.filter((t) => t.status === 'success'))
const failed = computed(() => tasks.value.filter((t) => t.status === 'failed'))

const nodes = ref([
  { name: 'gpu-01', kind: 'GPU A100', load: 72, busy: true },
  { name: 'gpu-02', kind: 'GPU A100', load: 38, busy: false },
  { name: 'cpu-01', kind: 'CPU 64C', load: 55, busy: true },
  { name: 'cpu-02', kind: 'CPU 64C', load: 21, busy: false },
  { name: 'cpu-03', kind: 'CPU 64C', load: 64, busy: true },
  { name: 'cpu-04', kind: 'CPU 64C', load: 12, busy: false }
])
const gpuCount = computed(() => nodes.value.filter((n) => n.kind.includes('GPU')).length)
const cpuCount = computed(() => nodes.value.filter((n) => n.kind.includes('CPU')).length)

function statusTone(s: TaskItem['status']) {
  return s === 'running' ? 'info' : s === 'queued' ? 'warning' : s === 'success' ? 'success' : 'danger'
}
function statusLabel(s: TaskItem['status']) {
  return s === 'running' ? '计算中' : s === 'queued' ? '排队' : s === 'success' ? '完成' : '失败'
}
function barColor(s: TaskItem['status']) {
  return s === 'failed' ? 'var(--danger)' : s === 'success' ? 'var(--success)' : s === 'queued' ? 'var(--warning)' : 'var(--info)'
}

/** 推进一轮模拟 */
function stepOnce() {
  let promoted = false
  tasks.value = tasks.value.map((t) => {
    if (t.status === 'running') {
      const inc = Math.round(4 + Math.random() * 12)
      const np = Math.min(100, t.progress + inc)
      if (np >= 100) {
        app.log('success', 'gis', `任务 ${t.id}（${t.name}）已完成`)
        return { ...t, progress: 100, status: 'success' as const }
      }
      return { ...t, progress: np }
    }
    return t
  })
  // 排队 → 运行
  const q = tasks.value.find((t) => t.status === 'queued')
  if (q) {
    const node = nodes.value.find((n) => n.kind.includes('CPU') && !n.busy) || nodes.value[0]
    node.busy = true
    node.load = Math.min(95, node.load + 20)
    tasks.value = tasks.value.map((t) =>
      t.id === q.id ? { ...t, status: 'running' as const, progress: 1, node: node.name } : t
    )
    promoted = true
  }
  // 节点负载轻微波动
  nodes.value = nodes.value.map((n) => ({
    ...n,
    load: Math.max(5, Math.min(98, n.load + Math.round((Math.random() - 0.5) * 8)))
  }))
  if (promoted) app.log('info', 'gis', `任务 ${q!.id} 已调度至 ${q!.node}`)
}

const auto = ref(false)
let timer: number | null = null
function toggleAuto() {
  auto.value = !auto.value
  if (auto.value) {
    timer = window.setInterval(stepOnce, 1500)
  } else if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.bar > i { transition: width .3s; }
.node {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
}
</style>
