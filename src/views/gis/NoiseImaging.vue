<template>
  <div class="grid" style="gap: 14px">
    <!-- 关键指标 -->
    <div class="grid grid-4">
      <div class="stat accent">
        <div class="k">台站对</div>
        <div class="v">{{ pairs.length }}</div>
        <div class="d">互相关链路</div>
      </div>
      <div class="stat">
        <div class="k">完成率</div>
        <div class="v">{{ doneRate }}%</div>
        <div class="d">{{ doneCount }} 对已完成</div>
      </div>
      <div class="stat">
        <div class="k">平均信噪比</div>
        <div class="v">{{ avgSnr }}<span style="font-size: 13px"> dB</span></div>
        <div class="d">互相关质量</div>
      </div>
      <div class="stat">
        <div class="k">可用频散曲线</div>
        <div class="v">{{ doneCount }}</div>
        <div class="d">用于面波成像</div>
      </div>
    </div>

    <!-- 地图 + 链路表 -->
    <div class="main-grid">
      <section class="card" style="min-width: 0">
        <div class="card-hd"><h3>台站对互相关链路</h3><span class="sub">{{ pairs.length }} 条链路</span></div>
        <div class="card-bd flush">
          <GisMap :layers="mapLayers" :center="REGION.center" :zoom="REGION.zoom" :height="430" :legend="legend" :tianditu-key="mapKey" :basemap="app.prefBasemap" />
        </div>
      </section>
      <section class="card" style="min-width: 0">
        <div class="card-hd"><h3>链路状态</h3><span class="sub">按信噪比排序</span></div>
        <div class="card-bd flush">
          <div class="link-list">
            <div v-for="p in sortedPairs" :key="p.id" class="link">
              <div class="row between">
                <span class="mono small">{{ p.a }} — {{ p.b }}</span>
                <span class="tag" :class="statusTone(p.status)">{{ p.status }}</span>
              </div>
              <div class="row between mt-sm">
                <span class="dim small mono">台间距 {{ p.dist }} km · SNR {{ p.snr }} dB</span>
                <span class="dim small mono">{{ p.id }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 频散 + 速度剖面 -->
    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd">
          <h3>瑞雷面波频散曲线</h3>
          <span class="sub">相速度 — 周期</span>
        </div>
        <div class="card-bd"><div ref="dispEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd">
          <h3>等效 S 波速度-深度剖面</h3>
          <span class="sub">由频散反演示意</span>
        </div>
        <div class="card-bd"><div ref="vsEl" class="ch"></div></div>
      </section>
    </div>

    <section class="card">
      <div class="card-hd"><h3>方法说明</h3></div>
      <div class="card-bd">
        <p class="note">
          噪声面波成像（Ambient Noise Tomography）利用连续波形记录间的互相关提取经验格林函数，
          进而测量瑞雷面波相/群速度频散。本模块以确定性模拟数据演示完整流程：台站对互相关 → 频散曲线提取 →
          面波层析成像反演 S 波速度结构。图中频散曲线与速度剖面均为演示性合成结果，旨在呈现方法链路与交互。
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GisMap from '@/components/gis/GisMap.vue'
import { useChart, PALETTE, type EChartsOption } from '@/composables/useChart'
import { REGION, dispersionCurve, stationPairs, stations, type StationPair } from '@/data/gis'
import { makeStationLayer } from '@/gis/layers'
import type { Layer, LineLayer, PointLayer } from '@/gis/engine'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const mapKey = import.meta.env.VITE_TIANDITU_KEY || ''
const pairs = stationPairs

const doneCount = computed(() => pairs.filter((p) => p.status === '完成').length)
const doneRate = computed(() => Math.round((doneCount.value / pairs.length) * 100))
const avgSnr = computed(() => (pairs.reduce((s, p) => s + p.snr, 0) / pairs.length).toFixed(1))
const sortedPairs = computed(() => [...pairs].sort((a, b) => b.snr - a.snr))

function statusTone(s: StationPair['status']) {
  return s === '完成' ? 'success' : s === '计算中' ? 'info' : s === '排队' ? 'warning' : 'danger'
}

/* ---------------- 地图 ---------------- */
const stationMap = computed(() => {
  const m = new Map<string, { lon: number; lat: number }>()
  stations.forEach((s) => m.set(s.name, { lon: s.lon, lat: s.lat }))
  return m
})

const mapLayers = computed<Layer[]>(() => {
  const sm = stationMap.value
  const lines: LineLayer = {
    id: 'pairs',
    type: 'line',
    visible: true,
    zIndex: 15,
    color: 'rgba(91,139,255,.55)',
    width: 1.4,
    opacity: 0.9,
    data: pairs
      .filter((p) => sm.has(p.a) && sm.has(p.b))
      .map((p) => ({
        id: p.id,
        coordinates: [
          [sm.get(p.a)!.lon, sm.get(p.a)!.lat],
          [sm.get(p.b)!.lon, sm.get(p.b)!.lat]
        ],
        properties: { dist: p.dist, snr: p.snr }
      }))
  }
  return [lines, makeStationLayer() as PointLayer]
})

const legend = [
  { label: '互相关链路', color: '#5b8bff', round: false },
  { label: '监测台站', color: '#15a34a', round: true }
]

/* ---------------- 频散曲线 ---------------- */
const dispEl = ref<HTMLElement | null>(null)
const vsEl = ref<HTMLElement | null>(null)

/** 多条频散曲线（不同反演实现）形成包络 */
const dispCurves = computed(() => {
  const seeds = [1, 2, 3]
  return seeds.map((s) => dispersionCurve(s))
})

const dispOption = (): EChartsOption => ({
  grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (v: number | string) => (typeof v === 'number' ? v.toFixed(3) + ' km/s' : String(v)) },
  xAxis: {
    type: 'value', name: '周期(s)', min: 2, max: 40,
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  yAxis: {
    type: 'value', name: '相速度(km/s)',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: dispCurves.value.map((curve, i) => ({
    name: i === 0 ? '主频散曲线' : `反演方案${i}`,
    type: 'line', smooth: true, showSymbol: false,
    data: curve,
    lineStyle: { width: i === 0 ? 2.6 : 1.2, color: PALETTE[i], type: i === 0 ? 'solid' : 'dashed', opacity: i === 0 ? 1 : 0.5 },
    itemStyle: { color: PALETTE[i] },
    z: i === 0 ? 3 : 1
  }))
})

/** 由频散近似反演得到的等效 Vs(z) 剖面（合成，仅演示） */
const vsProfile = computed(() => {
  const main = dispersionCurve(1)
  // 周期 t 对应的四分之一波长深度 z≈t*c/4；Vs≈c
  const pts: Array<[number, number]> = []
  for (const [t, c] of main) {
    const z = Math.max(0.5, (t * c) / 4)
    pts.push([Number(z.toFixed(2)), Number(c.toFixed(3))])
  }
  // 按深度排序并做轻度平滑
  pts.sort((a, b) => a[0] - b[0])
  return pts
})

const vsOption = (): EChartsOption => ({
  grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (v: number | string) => (typeof v === 'number' ? v.toFixed(2) + ' km/s' : String(v)) },
  xAxis: {
    type: 'value', name: 'Vs(km/s)', min: 2.6, max: 3.8,
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  yAxis: {
    type: 'value', name: '深度(km)', inverse: true,
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: [
    {
      name: 'Vs 剖面', type: 'line', smooth: true, showSymbol: false,
      data: vsProfile.value,
      lineStyle: { width: 2.6, color: PALETTE[5] },
      itemStyle: { color: PALETTE[5] },
      areaStyle: { color: 'rgba(240,139,180,.12)' }
    }
  ]
})

useChart(dispEl, dispOption, [])
useChart(vsEl, vsOption, [])
</script>

<style scoped>
.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(280px, 1fr);
  gap: 14px;
}
.ch { height: 250px; width: 100%; }

.link-list { max-height: 430px; overflow: auto; }
.link {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-soft);
}
.link:last-child { border-bottom: none; }

.note {
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-2);
}

@media (max-width: 1200px) {
  .main-grid, .grid-2, .grid-4 { grid-template-columns: 1fr; }
}
</style>
