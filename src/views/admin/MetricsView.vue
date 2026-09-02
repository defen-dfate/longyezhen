<template>
  <div class="grid" style="gap: 14px">
    <!-- 加载性能 -->
    <div class="grid grid-4">
      <div class="stat accent">
        <div class="k">DOM 就绪</div>
        <div class="v">{{ nav.dom }} <span style="font-size: 13px">ms</span></div>
        <div class="d">DOMContentLoaded</div>
      </div>
      <div class="stat">
        <div class="k">完全加载</div>
        <div class="v">{{ nav.load }} <span style="font-size: 13px">ms</span></div>
        <div class="d">load 事件结束</div>
      </div>
      <div class="stat">
        <div class="k">首字节</div>
        <div class="v">{{ nav.ttfb }} <span style="font-size: 13px">ms</span></div>
        <div class="d">响应开始</div>
      </div>
      <div class="stat">
        <div class="k">JS 堆内存</div>
        <div class="v">{{ memLabel }} <span style="font-size: 13px" v-if="mem">MB</span></div>
        <div class="d">{{ mem ? '当前占用' : '浏览器未暴露' }}</div>
      </div>
    </div>

    <!-- 操作 + 基准 -->
    <section class="card">
      <div class="card-bd row between wrap" style="gap: 12px">
        <div class="row" style="gap: 10px">
          <button class="btn" @click="runBenchmark">
            <AppIcon name="zap" :size="14" />{{ bench.busy ? '运行中…' : '运行性能基准' }}
          </button>
          <span v-if="bench.ms != null" class="dim small mono">
            10 万次 JSON 序列化+排序：{{ bench.ms }} ms
          </span>
        </div>
        <div class="row" style="gap: 10px">
          <span class="tag info">资源 {{ resourceCount }} 个</span>
          <span class="tag">脚本 {{ scriptCount }} · 样式 {{ cssCount }}</span>
        </div>
      </div>
    </section>

    <!-- 图表 -->
    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>模块访问分布</h3><span class="sub">本会话</span></div>
        <div class="card-bd"><div ref="visitsEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>资源加载耗时</h3><span class="sub">按类型聚合</span></div>
        <div class="card-bd"><div ref="resEl" class="ch"></div></div>
      </section>
    </div>

    <!-- 压缩工具指标 -->
    <section class="card">
      <div class="card-hd"><h3>图像压缩工具累计指标</h3><span class="sub">真实运行数据</span></div>
      <div class="card-bd">
        <div class="grid grid-4">
          <div class="stat"><div class="k">处理图片</div><div class="v">{{ cs.images }}</div><div class="d">张</div></div>
          <div class="stat"><div class="k">原始总量</div><div class="v" style="font-size: 18px">{{ fmtBytes(cs.originalBytes) }}</div><div class="d">压缩前</div></div>
          <div class="stat"><div class="k">输出总量</div><div class="v" style="font-size: 18px">{{ fmtBytes(cs.outputBytes) }}</div><div class="d">压缩后</div></div>
          <div class="stat"><div class="k">累计节省</div><div class="v" style="font-size: 18px; color: var(--primary)">{{ fmtBytes(saved) }}</div><div class="d">{{ savePct }}%</div></div>
        </div>
        <p v-if="!cs.images" class="note mt">尚未使用图像压缩工具。前往「实用工具 → 图像压缩」处理图片后，这里会显示真实累计数据。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useChart, PALETTE, type EChartsOption } from '@/composables/useChart'
import { fmtBytes } from '@/utils/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const cs = app.compressStats
const saved = app.savedBytes
const savePct = computed(() =>
  cs.originalBytes ? Math.round((saved / cs.originalBytes) * 100) : 0
)

/* ---------------- 真实加载性能 ---------------- */
function readNav() {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (nav) {
    return {
      dom: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      ttfb: Math.round(nav.responseStart)
    }
  }
  return { dom: 0, load: 0, ttfb: 0 }
}
const nav = ref(readNav())

const mem = computed(() => {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
  return m ? Math.round(m.usedJSHeapSize / 1048576) : null
})
const memLabel = computed(() => (mem.value != null ? String(mem.value) : 'N/A'))

const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
const resourceCount = resources.length
const scriptCount = resources.filter((r) => r.initiatorType === 'script').length
const cssCount = resources.filter((r) => r.initiatorType === 'link').length

function resByType() {
  const map = new Map<string, { count: number; dur: number }>()
  resources.forEach((r) => {
    const t = r.initiatorType || 'other'
    const e = map.get(t) || { count: 0, dur: 0 }
    e.count += 1
    e.dur += r.duration || 0
    map.set(t, e)
  })
  return [...map.entries()].map(([k, v]) => ({ name: k, value: Number(v.dur.toFixed(0)) }))
}

/* ---------------- 基准测试 ---------------- */
const bench = ref<{ busy: boolean; ms: number | null }>({ busy: false, ms: null })
function runBenchmark() {
  if (bench.value.busy) return
  bench.value.busy = true
  bench.value.ms = null
  setTimeout(() => {
    const t0 = performance.now()
    const arr: number[] = []
    for (let i = 0; i < 100000; i++) arr.push(Math.random())
    const json = JSON.stringify(arr)
    JSON.parse(json)
    arr.sort((a, b) => a - b)
    const ms = performance.now() - t0
    bench.value.ms = Number(ms.toFixed(1))
    bench.value.busy = false
    app.log('info', 'admin', `性能基准：${bench.value.ms} ms`)
  }, 30)
}

/* ---------------- 图表 ---------------- */
const visitsEl = ref<HTMLElement | null>(null)
const resEl = ref<HTMLElement | null>(null)

const visitData = computed(() =>
  Object.entries(app.visits)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
)

const visitsOption = (): EChartsOption => ({
  grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: visitData.value.map((d) => d.path.replace('/', '')),
    axisLabel: { fontSize: 9, color: '#7a8299', rotate: 38, interval: 0 },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value', name: '访问',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: [
    {
      type: 'bar',
      barWidth: '55%',
      data: visitData.value.map((d, i) => ({
        value: d.count,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: PALETTE[i % PALETTE.length] }
      })),
      label: { show: true, position: 'top', fontSize: 10, color: '#7a8299' }
    }
  ]
})

const resOption = (): EChartsOption => {
  const data = resByType()
  return {
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number | string) => (typeof v === 'number' ? v + ' ms' : String(v)) },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLabel: { fontSize: 10, color: '#7a8299', interval: 0 },
      axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: '耗时(ms)',
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
    },
    series: [
      {
        type: 'bar',
        barWidth: '55%',
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: { borderRadius: [4, 4, 0, 0], color: PALETTE[i % PALETTE.length] }
        }))
      }
    ]
  }
}

useChart(visitsEl, visitsOption, [visitData])
useChart(resEl, resOption, [])

onMounted(() => {
  // 资源条目在 onMounted 后更完整
  nav.value = readNav()
})
</script>

<style scoped>
.ch { height: 260px; width: 100%; }
.note {
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-2);
}

@media (max-width: 1100px) {
  .grid-2, .grid-4 { grid-template-columns: 1fr; }
}
</style>
