<template>
  <div class="grid" style="gap: 14px">
    <!-- 关键指标 -->
    <div class="grid grid-4">
      <div class="stat accent">
        <div class="k">{{ rangeLabel }}地震数</div>
        <div class="v">{{ filtered.length }}</div>
        <div class="d">最大 M{{ maxMag.toFixed(1) }}</div>
      </div>
      <div class="stat">
        <div class="k">台站在线率</div>
        <div class="v">{{ onlineRate }}%</div>
        <div class="d">{{ onlineCount }}/{{ stations.length }} 台正常</div>
      </div>
      <div class="stat">
        <div class="k">平均震源深度</div>
        <div class="v">{{ avgDepth }}<span style="font-size: 13px"> km</span></div>
        <div class="d">浅源为主</div>
      </div>
      <div class="stat">
        <div class="k">最近事件</div>
        <div class="v" style="font-size: 15px">{{ fmtAgo(latest.time) }}</div>
        <div class="d">{{ fmtTime(latest.time) }}</div>
      </div>
    </div>

    <!-- 地图 + 侧栏 -->
    <div class="main-grid">
      <section class="card" style="min-width: 0">
        <div class="card-hd">
          <div class="row" style="gap: 8px">
            <h3>震中分布</h3>
            <div class="seg">
              <button
                v-for="t in tabs"
                :key="t.days"
                :class="{ on: activeDays === t.days }"
                @click="activeDays = t.days"
              >{{ t.label }}</button>
            </div>
          </div>
          <span class="sub">{{ filtered.length }} 个事件</span>
        </div>
        <div class="card-bd flush">
          <GisMap
            :layers="layers"
            :center="REGION.center"
            :zoom="REGION.zoom"
            :height="440"
            :legend="EVENT_LEGEND"
            :tianditu-key="mapKey"
            @click="onMapClick"
          />
        </div>
      </section>

      <div class="col" style="gap: 14px; min-width: 0">
        <!-- 最新事件 -->
        <section class="card">
          <div class="card-hd">
            <h3>最新事件</h3>
            <span class="tag danger">M{{ latest.mag.toFixed(1) }}</span>
          </div>
          <div class="card-bd">
            <div class="ev-mag">
              <div class="mag-circle" :style="{ background: magColor(latest.mag) }">
                {{ latest.mag.toFixed(1) }}
              </div>
              <div>
                <div class="small muted">发震时刻</div>
                <div class="mono">{{ fmtTime(latest.time) }}</div>
                <div class="small muted" style="margin-top: 6px">震源深度</div>
                <div class="mono">{{ latest.depth }} km</div>
              </div>
            </div>
            <div class="ev-loc">
              <AppIcon name="globe" :size="13" />
              {{ latest.location }}
              <span class="dim small mono">{{ latest.lon.toFixed(2) }}°E {{ latest.lat.toFixed(2) }}°N</span>
            </div>
          </div>
        </section>

        <!-- 处理流程 -->
        <section class="card grow">
          <div class="card-hd"><h3>自动处理流程</h3><span class="sub">实时</span></div>
          <div class="card-bd">
            <div class="flow">
              <div v-for="(s, i) in flowSteps" :key="s.label" class="step">
                <div class="step-dot" :class="s.tone"></div>
                <div class="grow">
                  <div class="row between">
                    <strong style="font-size: 12px; font-weight: 500">{{ s.label }}</strong>
                    <span class="dim mono" style="font-size: 10px">{{ s.time }}</span>
                  </div>
                </div>
                <div v-if="i < flowSteps.length - 1" class="step-line"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- 图表 -->
    <div class="grid grid-3">
      <section class="card">
        <div class="card-hd"><h3>震级频度分布</h3></div>
        <div class="card-bd"><div ref="freqEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>震级-深度分布</h3></div>
        <div class="card-bd"><div ref="mdEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>月度活动趋势</h3></div>
        <div class="card-bd"><div ref="trendEl" class="ch"></div></div>
      </section>
    </div>

    <!-- 台站状态 -->
    <section class="card">
      <div class="card-hd">
        <h3>监测台站</h3>
        <span class="sub">{{ stations.length }} 个台站 · 点击地图上的点查看详情</span>
      </div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr>
              <th>编号</th><th>台站名称</th><th>类型</th>
              <th class="num">经度</th><th class="num">纬度</th>
              <th class="num">高程(m)</th><th>状态</th><th>启用时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in stations" :key="s.id">
              <td class="mono">{{ s.id }}</td>
              <td>{{ s.name }}</td>
              <td>{{ s.type }}</td>
              <td class="num mono">{{ s.lon.toFixed(3) }}</td>
              <td class="num mono">{{ s.lat.toFixed(3) }}</td>
              <td class="num mono">{{ s.elevation }}</td>
              <td>
                <span class="tag" :class="s.status === '正常' ? 'success' : s.status === '维护' ? 'warning' : 'danger'">
                  {{ s.status }}
                </span>
              </td>
              <td class="mono dim">{{ s.since }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GisMap from '@/components/gis/GisMap.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useChart, PALETTE, type EChartsOption } from '@/composables/useChart'
import {
  events, latestEvent, magColor, magDistribution, monthlyCount,
  stations, REGION, type EqEvent
} from '@/data/gis'
import { EVENT_LEGEND, makeEventLayer, makeFaultLayer, makeReservoirLayer, makeStationLayer } from '@/gis/layers'
import { fmtAgo, fmtTime } from '@/utils/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

const tabs = [
  { label: '近一周', days: 7 },
  { label: '近一月', days: 30 },
  { label: '近一年', days: 365 },
  { label: '全部', days: 36500 }
]
const activeDays = ref(365)
const rangeLabel = computed(() => tabs.find((t) => t.days === activeDays.value)?.label || '')
const latest = latestEvent
const mapKey = import.meta.env.VITE_TIANDITU_KEY || ''

const filtered = computed<EqEvent[]>(() => {
  const t = Date.now() - activeDays.value * 86400000
  return events.filter((e) => e.time >= t)
})

const maxMag = computed(() => filtered.value.reduce((m, e) => Math.max(m, e.mag), 0))
const avgDepth = computed(() =>
  filtered.value.length
    ? (filtered.value.reduce((s, e) => s + e.depth, 0) / filtered.value.length).toFixed(1)
    : '0'
)
const onlineCount = computed(() => stations.filter((s) => s.status === '正常').length)
const onlineRate = computed(() => Math.round((onlineCount.value / stations.length) * 100))

const layers = computed(() => [
  makeReservoirLayer(),
  makeFaultLayer(),
  makeEventLayer(filtered.value),
  makeStationLayer()
])

function onMapClick(p: Record<string, unknown> | null) {
  if (!p) return
  app.log('info', 'gis', `查看事件 ${p.id}：${p.mag} ${p.location}`)
}

const flowSteps = [
  { label: '震相关联', time: '14:28:54.001', tone: 'default' },
  { label: '初步定位', time: '14:28:54.102', tone: 'default' },
  { label: '震级计算', time: '14:28:54.203', tone: 'default' },
  { label: '结果入库', time: '14:28:54.304', tone: 'success' },
  { label: 'P 波到时（SCT 台）', time: '14:28:54.405', tone: 'p' },
  { label: 'S 波到时（SCT 台）', time: '14:28:54.506', tone: 's' }
]

/* ---------------- 图表 ---------------- */
const freqEl = ref<HTMLElement | null>(null)
const mdEl = ref<HTMLElement | null>(null)
const trendEl = ref<HTMLElement | null>(null)

const freqOption = (): EChartsOption => {
  const data = magDistribution(filtered.value)
  return {
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLabel: { fontSize: 10, color: '#7a8299', interval: 0 },
      axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '次数',
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
        })),
        label: { show: true, position: 'top', fontSize: 10, color: '#7a8299' }
      }
    ]
  }
}

const mdOption = (): EChartsOption => ({
  grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
  tooltip: {
    formatter: (p: unknown) => {
      const d = (p as { value: number[] }).value
      return `深度 ${d[0]} km<br/>震级 M${d[1]}`
    }
  },
  xAxis: {
    type: 'value',
    name: '深度(km)',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  yAxis: {
    type: 'value',
    name: '震级 M',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: [
    {
      type: 'scatter',
      symbolSize: (d: number[]) => Math.max(4, Math.pow(d[1], 1.6) * 1.6),
      data: filtered.value.map((e) => [e.depth, e.mag]),
      itemStyle: { color: (p: { value: number[] }) => magColor(p.value[1]), opacity: 0.75 }
    }
  ]
})

const trendOption = (): EChartsOption => {
  const data = monthlyCount(filtered.value)
  return {
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map((d) => d[0]),
      axisLabel: { fontSize: 9, color: '#7a8299', rotate: 45 },
      axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '月频次',
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        areaStyle: { color: 'rgba(91,139,255,.16)' },
        lineStyle: { color: '#5b8bff', width: 2 },
        itemStyle: { color: '#5b8bff' },
        symbolSize: 4,
        data: data.map((d) => d[1])
      }
    ]
  }
}

useChart(freqEl, freqOption, [filtered])
useChart(mdEl, mdOption, [filtered])
useChart(trendEl, trendOption, [filtered])
</script>

<style scoped>
.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(280px, 1fr);
  gap: 14px;
}
.ch { height: 210px; width: 100%; }

.ev-mag { display: flex; gap: 14px; align-items: center; }
.mag-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 14px;
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  flex: 0 0 auto;
  box-shadow: 0 4px 14px rgba(232, 83, 74, .28);
}
.ev-loc {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--text-2);
}

.flow { display: grid; gap: 2px; }
.step { position: relative; display: flex; align-items: center; gap: 9px; padding: 7px 0; }
.step-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--text-3); flex: 0 0 auto; z-index: 1;
}
.step-dot.success { background: var(--success); box-shadow: 0 0 0 3px var(--success-soft); }
.step-dot.p { background: var(--primary); }
.step-dot.s { background: var(--warning); }
.step-line {
  position: absolute;
  left: 4px; top: 20px;
  width: 1px; height: 18px;
  background: var(--border);
}

@media (max-width: 1200px) {
  .main-grid, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}
</style>
