<template>
  <div class="grid" style="gap: 14px">
    <!-- 筛选 -->
    <section class="card">
      <div class="card-bd">
        <div class="row wrap" style="gap: 16px">
          <div>
            <label class="lbl">时间范围</label>
            <select v-model="range" class="select" style="width: 120px">
              <option :value="7">近一周</option>
              <option :value="30">近一月</option>
              <option :value="180">近半年</option>
              <option :value="365">近一年</option>
              <option :value="36500">全部</option>
            </select>
          </div>
          <div>
            <label class="lbl">最小震级</label>
            <select v-model.number="minMag" class="select" style="width: 100px">
              <option :value="0">全部</option>
              <option :value="1">M ≥ 1.0</option>
              <option :value="2">M ≥ 2.0</option>
              <option :value="3">M ≥ 3.0</option>
            </select>
          </div>
          <div>
            <label class="lbl">深度范围 (km)</label>
            <div class="row" style="gap: 5px">
              <input v-model.number="minDepth" class="input" type="number" style="width: 76px" />
              <span class="dim">-</span>
              <input v-model.number="maxDepth" class="input" type="number" style="width: 76px" />
            </div>
          </div>
          <div class="grow"></div>
          <div class="center">
            <div class="dim small">命中事件</div>
            <strong style="font-size: 19px">{{ filtered.length }}</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- 图表 -->
    <section class="card">
      <div class="card-hd"><h3>月度频次与累积曲线</h3><span class="sub">柱状为月频次，折线为累积计数</span></div>
      <div class="card-bd"><div ref="mainEl" class="ch tall"></div></div>
    </section>

    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>Gutenberg-Richter 关系</h3><span class="sub">log N = a - bM</span></div>
        <div class="card-bd"><div ref="grEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>震级档统计</h3><span class="sub">占比分布</span></div>
        <div class="card-bd"><div ref="pieEl" class="ch"></div></div>
      </section>
    </div>

    <!-- 明细表 -->
    <section class="card">
      <div class="card-hd">
        <h3>事件明细</h3>
        <span class="sub">按发震时刻倒序，显示前 {{ Math.min(20, filtered.length) }} 条</span>
      </div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr>
              <th>编号</th><th>发震时刻</th><th class="num">震级</th>
              <th class="num">深度(km)</th><th class="num">经度</th><th class="num">纬度</th>
              <th>参考位置</th><th>定位质量</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in filtered.slice(0, 20)" :key="e.id">
              <td class="mono">{{ e.id }}</td>
              <td class="mono">{{ fmtTime(e.time) }}</td>
              <td class="num">
                <span class="tag" :class="e.mag >= 3 ? 'danger' : e.mag >= 2 ? 'warning' : 'primary'">
                  M{{ e.mag.toFixed(1) }}
                </span>
              </td>
              <td class="num mono">{{ e.depth }}</td>
              <td class="num mono">{{ e.lon.toFixed(3) }}</td>
              <td class="num mono">{{ e.lat.toFixed(3) }}</td>
              <td>{{ e.location }}</td>
              <td><span class="tag" :class="e.quality === 'A' ? 'success' : e.quality === 'B' ? 'info' : ''">{{ e.quality }}</span></td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="8" class="empty">当前筛选条件下没有事件</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChart, PALETTE, type EChartsOption } from '@/composables/useChart'
import { events, magDistribution, monthlyCount, type EqEvent } from '@/data/gis'
import { fmtTime } from '@/utils/format'

const range = ref(36500)
const minMag = ref(0)
const minDepth = ref(0)
const maxDepth = ref(30)

const filtered = computed<EqEvent[]>(() => {
  const t = Date.now() - range.value * 86400000
  return events.filter(
    (e) => e.time >= t && e.mag >= minMag.value && e.depth >= minDepth.value && e.depth <= maxDepth.value
  )
})

const mainEl = ref<HTMLElement | null>(null)
const grEl = ref<HTMLElement | null>(null)
const pieEl = ref<HTMLElement | null>(null)

const mainOption = (): EChartsOption => {
  const data = monthlyCount(filtered.value)
  let acc = 0
  const cum = data.map((d) => (acc += d[1]))
  return {
    grid: { left: 8, right: 20, top: 24, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { data: ['月频次', '累积计数'], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#7a8299' } },
    xAxis: {
      type: 'category',
      data: data.map((d) => d[0]),
      axisLabel: { fontSize: 9, color: '#7a8299', rotate: 45 },
      axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: 'value', name: '月频次',
        nameTextStyle: { fontSize: 10, color: '#7a8299' },
        axisLabel: { fontSize: 10, color: '#7a8299' },
        splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
      },
      {
        type: 'value', name: '累积',
        nameTextStyle: { fontSize: 10, color: '#7a8299' },
        axisLabel: { fontSize: 10, color: '#7a8299' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '月频次', type: 'bar', barWidth: '52%',
        data: data.map((d) => d[1]),
        itemStyle: { borderRadius: [3, 3, 0, 0], color: '#5b8bff' }
      },
      {
        name: '累积计数', type: 'line', yAxisIndex: 1, smooth: true,
        data: cum, symbolSize: 3,
        lineStyle: { width: 2, color: '#f6a04d' },
        itemStyle: { color: '#f6a04d' }
      }
    ]
  }
}

/** G-R 关系：累积频次的对数 vs 震级，线性拟合得到 b 值 */
const grFit = computed(() => {
  const list = filtered.value
  if (list.length < 10) return { points: [] as Array<[number, number]>, b: 0, a: 0 }
  const mags = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
  const points: Array<[number, number]> = mags
    .map((m) => [m, list.filter((e) => e.mag >= m).length])
    .filter((p) => p[1] > 0)
    .map(([m, n]) => [m as number, Math.log10(n as number)])

  // 最小二乘拟合
  const n = points.length
  const sumX = points.reduce((s, p) => s + p[0], 0)
  const sumY = points.reduce((s, p) => s + p[1], 0)
  const sumXY = points.reduce((s, p) => s + p[0] * p[1], 0)
  const sumXX = points.reduce((s, p) => s + p[0] * p[0], 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  return { points, b: -slope, a: sumY / n - slope * (sumX / n) }
})

const grOption = (): EChartsOption => ({
  grid: { left: 8, right: 20, top: 24, bottom: 8, containLabel: true },
  tooltip: {
    formatter: (p: unknown) => {
      const d = (p as { value: number[] }).value
      return `M ≥ ${d[0]}<br/>N = ${Math.round(Math.pow(10, d[1]))}`
    }
  },
  xAxis: {
    type: 'value', name: '震级 M',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  yAxis: {
    type: 'value', name: 'log N',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: [
    {
      type: 'scatter', symbolSize: 9,
      data: grFit.value.points,
      itemStyle: { color: '#345ce0' },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: '#e8534a', type: 'dashed' },
        label: {
          formatter: `b = ${grFit.value.b.toFixed(3)}`,
          fontSize: 11, color: '#e8534a', position: 'insideEndTop'
        },
        data: grFit.value.points.length
          ? [
              [
                { coord: [grFit.value.points[0][0], grFit.value.a + (-grFit.value.b) * grFit.value.points[0][0]] },
                {
                  coord: [
                    grFit.value.points[grFit.value.points.length - 1][0],
                    grFit.value.a + (-grFit.value.b) * grFit.value.points[grFit.value.points.length - 1][0]
                  ]
                }
              ]
            ]
          : []
      }
    }
  ]
})

const pieOption = (): EChartsOption => {
  const data = magDistribution(filtered.value)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#7a8299' } },
    series: [
      {
        type: 'pie', radius: ['40%', '66%'], center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: 'var(--bg-elev)', borderWidth: 2 },
        label: { fontSize: 10, color: '#7a8299', formatter: '{d}%' },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: PALETTE[i % PALETTE.length] } }))
      }
    ]
  }
}

useChart(mainEl, mainOption, [filtered])
useChart(grEl, grOption, [filtered])
useChart(pieEl, pieOption, [filtered])
</script>

<style scoped>
.lbl { display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-2); }
.ch { height: 240px; width: 100%; }
.ch.tall { height: 300px; }

@media (max-width: 1100px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
