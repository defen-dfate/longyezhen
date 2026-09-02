<template>
  <div class="grid" style="gap: 14px">
    <div class="grid grid-4">
      <div class="stat accent">
        <div class="k">当前蓄水位</div>
        <div class="v">{{ latestLevel }}<span style="font-size: 13px"> m</span></div>
        <div class="d">{{ latestPoint.date }}</div>
      </div>
      <div class="stat">
        <div class="k">水位变幅</div>
        <div class="v">{{ levelRange }}<span style="font-size: 13px"> m</span></div>
        <div class="d">统计区间内最大落差</div>
      </div>
      <div class="stat">
        <div class="k">相关系数 R</div>
        <div class="v">{{ correlation.toFixed(3) }}</div>
        <div class="d">水位变率 vs 月频次</div>
      </div>
      <div class="stat">
        <div class="k">响应判定</div>
        <div class="v" style="font-size: 16px">{{ verdict }}</div>
        <div class="d">{{ verdictDesc }}</div>
      </div>
    </div>

    <!-- 水位与地震活动双轴 -->
    <section class="card">
      <div class="card-hd">
        <h3>蓄水位与地震活动时序</h3>
        <span class="sub">柱：月频次 · 线：蓄水位（m）</span>
      </div>
      <div class="card-bd"><div ref="mainEl" class="ch tall"></div></div>
    </section>

    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>水位变率 - 地震频次</h3><span class="sub">相关性散点 + 线性拟合</span></div>
        <div class="card-bd"><div ref="scatterEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>不同水位阶段统计</h3><span class="sub">按蓄水位分组</span></div>
        <div class="card-bd flush">
          <table class="table">
            <thead>
              <tr>
                <th>水位阶段</th><th class="num">样本(月)</th>
                <th class="num">平均频次</th><th class="num">平均最大震级</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in grouped" :key="g.name">
                <td>{{ g.name }}</td>
                <td class="num mono">{{ g.count }}</td>
                <td class="num mono">{{ g.avgCount }}</td>
                <td class="num mono">M{{ g.avgMag }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 原始序列 -->
    <section class="card">
      <div class="card-hd"><h3>逐月观测数据</h3><span class="sub">{{ waterLevelSeries.length }} 个月</span></div>
      <div class="card-bd flush" style="max-height: 320px; overflow-y: auto">
        <table class="table">
          <thead>
            <tr>
              <th>月份</th><th class="num">蓄水位(m)</th><th class="num">月变率(m)</th>
              <th class="num">地震频次</th><th class="num">最大震级</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.date">
              <td class="mono">{{ p.date }}</td>
              <td class="num mono">{{ p.level }}</td>
              <td class="num mono" :style="{ color: p.delta > 0 ? 'var(--danger)' : p.delta < 0 ? 'var(--success)' : '' }">
                {{ p.delta > 0 ? '+' : '' }}{{ p.delta }}
              </td>
              <td class="num mono">{{ p.count }}</td>
              <td class="num mono">M{{ p.maxMag.toFixed(1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChart, type EChartsOption } from '@/composables/useChart'
import { waterLevelSeries } from '@/data/gis'

const rows = computed(() =>
  waterLevelSeries.map((p, i) => ({
    ...p,
    delta: i === 0 ? 0 : Number((p.level - waterLevelSeries[i - 1].level).toFixed(1))
  }))
)

const latestPoint = computed(() => waterLevelSeries[waterLevelSeries.length - 1])
const latestLevel = computed(() => latestPoint.value.level)
const levelRange = computed(() => {
  const ls = waterLevelSeries.map((p) => p.level)
  return (Math.max(...ls) - Math.min(...ls)).toFixed(1)
})

/** 水位变率与次月地震频次的相关系数 */
const correlation = computed(() => {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 1; i < rows.value.length; i++) {
    xs.push(rows.value[i - 1].delta)
    ys.push(rows.value[i].count)
  }
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += Math.pow(xs[i] - mx, 2)
    dy += Math.pow(ys[i] - my, 2)
  }
  return num / Math.sqrt(dx * dy)
})

const verdict = computed(() => {
  const r = correlation.value
  if (r > 0.6) return '强相关'
  if (r > 0.35) return '中等相关'
  if (r > 0.15) return '弱相关'
  return '无明显相关'
})
const verdictDesc = computed(() => {
  const r = correlation.value
  return r > 0.35 ? '地震活动与水位变化存在关联，倾向水库触发型' : '地震活动主要受构造背景控制'
})

const grouped = computed(() => {
  const bins = [
    { name: '低水位 (<735m)', min: 0, max: 735 },
    { name: '中水位 (735-780m)', min: 735, max: 780 },
    { name: '高水位 (≥780m)', min: 780, max: 9999 }
  ]
  return bins.map((b) => {
    const list = waterLevelSeries.filter((p) => p.level >= b.min && p.level < b.max)
    return {
      name: b.name,
      count: list.length,
      avgCount: list.length ? (list.reduce((s, p) => s + p.count, 0) / list.length).toFixed(1) : '-',
      avgMag: list.length ? (list.reduce((s, p) => s + p.maxMag, 0) / list.length).toFixed(2) : '-'
    }
  })
})

/* ---------------- 图表 ---------------- */
const mainEl = ref<HTMLElement | null>(null)
const scatterEl = ref<HTMLElement | null>(null)

const mainOption = (): EChartsOption => ({
  grid: { left: 8, right: 20, top: 26, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis' },
  legend: { data: ['月频次', '蓄水位'], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#7a8299' } },
  xAxis: {
    type: 'category',
    data: waterLevelSeries.map((p) => p.date),
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
      type: 'value', name: '水位(m)', min: 700,
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { show: false }
    }
  ],
  series: [
    {
      name: '月频次', type: 'bar', barWidth: '48%',
      data: waterLevelSeries.map((p) => p.count),
      itemStyle: { borderRadius: [3, 3, 0, 0], color: 'rgba(91,139,255,.7)' }
    },
    {
      name: '蓄水位', type: 'line', yAxisIndex: 1, smooth: true,
      data: waterLevelSeries.map((p) => p.level),
      symbolSize: 4,
      lineStyle: { width: 2.2, color: '#e8534a' },
      itemStyle: { color: '#e8534a' },
      areaStyle: { color: 'rgba(232,83,74,.08)' }
    }
  ]
})

const scatterOption = (): EChartsOption => {
  const data: Array<[number, number]> = []
  for (let i = 1; i < rows.value.length; i++) {
    data.push([rows.value[i - 1].delta, rows.value[i].count])
  }
  const n = data.length
  const mx = data.reduce((s, d) => s + d[0], 0) / n
  const my = data.reduce((s, d) => s + d[1], 0) / n
  let num = 0, dx = 0
  for (const d of data) {
    num += (d[0] - mx) * (d[1] - my)
    dx += Math.pow(d[0] - mx, 2)
  }
  const slope = num / dx
  const intercept = my - slope * mx
  const minX = Math.min(...data.map((d) => d[0]))
  const maxX = Math.max(...data.map((d) => d[0]))

  return {
    grid: { left: 8, right: 20, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      formatter: (p: unknown) => {
        const d = (p as { value: number[] }).value
        return `水位变率 ${d[0]} m<br/>次月频次 ${d[1]}`
      }
    },
    xAxis: {
      type: 'value', name: '本月水位变率(m)',
      nameLocation: 'middle', nameGap: 26,
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
    },
    yAxis: {
      type: 'value', name: '次月频次',
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
    },
    series: [
      {
        type: 'scatter', symbolSize: 9,
        data,
        itemStyle: { color: 'rgba(52,92,224,.7)' },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: '#e8534a', type: 'dashed' },
          label: { formatter: `R = ${correlation.value.toFixed(3)}`, fontSize: 11, color: '#e8534a' },
          data: [[{ coord: [minX, slope * minX + intercept] }, { coord: [maxX, slope * maxX + intercept] }]]
        }
      }
    ]
  }
}

useChart(mainEl, mainOption)
useChart(scatterEl, scatterOption, [rows])
</script>

<style scoped>
.ch { height: 260px; width: 100%; }
.ch.tall { height: 320px; }

@media (max-width: 1100px) {
  .grid-2, .grid-4 { grid-template-columns: 1fr; }
}
</style>
