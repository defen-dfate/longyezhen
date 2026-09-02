<template>
  <div class="grid" style="gap: 14px">
    <div class="main-grid">
      <!-- 雷达 -->
      <section class="card">
        <div class="card-hd"><h3>成因机理指标</h3><span class="sub">多指标综合评分</span></div>
        <div class="card-bd"><div ref="radarEl" class="radar"></div></div>
      </section>

      <!-- 结论 -->
      <section class="card verdict">
        <div class="card-hd"><h3>综合研判</h3><span class="sub">加权评分 {{ score.toFixed(2) }}</span></div>
        <div class="card-bd">
          <div class="v-head">
            <div class="v-badge" :class="conclusion.tone">{{ conclusion.type }}</div>
            <div class="v-conf">置信度 {{ (conclusion.confidence * 100).toFixed(0) }}%</div>
          </div>
          <p class="v-text">{{ conclusion.text }}</p>

          <div class="v-bars">
            <div v-for="i in genesisIndicators" :key="i.key" class="vb">
              <div class="row between">
                <span class="small">{{ i.name }}</span>
                <span class="mono small">{{ i.value.toFixed(2) }}</span>
              </div>
              <div class="bar" style="margin-top: 4px">
                <i :style="{ width: i.value * 100 + '%', background: i.value >= i.threshold ? 'var(--danger)' : 'var(--primary)' }"></i>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 指标详情 -->
    <section class="card">
      <div class="card-hd"><h3>指标说明</h3><span class="sub">超过阈值表示更倾向于水库触发</span></div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr>
              <th>指标</th><th>说明</th>
              <th class="num">实测值</th><th class="num">阈值</th><th>判定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in genesisIndicators" :key="i.key">
              <td>{{ i.name }}</td>
              <td class="muted small">{{ i.desc }}</td>
              <td class="num mono">{{ i.value.toFixed(2) }}</td>
              <td class="num mono dim">{{ i.threshold.toFixed(2) }}</td>
              <td>
                <span class="tag" :class="i.value >= i.threshold ? 'danger' : 'success'">
                  {{ i.value >= i.threshold ? '超阈值' : '正常' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 时序证据 -->
    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>水位-地震响应滞后分析</h3></div>
        <div class="card-bd"><div ref="lagEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>深度剖面分布</h3><span class="sub">震源深度直方图</span></div>
        <div class="card-bd"><div ref="depthEl" class="ch"></div></div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChart, type EChartsOption } from '@/composables/useChart'
import { events, genesisIndicators } from '@/data/gis'

const score = computed(
  () => genesisIndicators.reduce((s, i) => s + i.value * (i.value >= i.threshold ? 1.25 : 0.75), 0) / genesisIndicators.length
)

const conclusion = computed(() => {
  const s = score.value
  if (s >= 0.72) {
    return {
      type: '水库触发型',
      tone: 'danger',
      confidence: Math.min(0.95, 0.6 + (s - 0.7) * 1.1),
      text:
        '多项指标超过阈值，地震活动与水库蓄水过程在时间、空间和震源参数上均表现出显著相关性。' +
        '地震丛集于库区及邻近断裂带，震源深度偏浅，b 值随蓄水位升高而系统性增大，' +
        '综合判定为水库触发型地震活动，建议加强库区 fluid 压力与形变监测。'
    }
  }
  if (s >= 0.5) {
    return {
      type: '混合型',
      tone: 'warning',
      confidence: 0.68,
      text: '部分指标超过阈值，地震活动同时受到区域构造背景与水库蓄水的共同影响，需持续观测以明确主因。'
    }
  }
  return {
    type: '构造型',
    tone: 'success',
    confidence: 0.74,
    text: '各指标均在阈值范围内，地震活动主要受区域构造应力场控制，与水库蓄水过程无显著关联。'
  }
})

const radarEl = ref<HTMLElement | null>(null)
const lagEl = ref<HTMLElement | null>(null)
const depthEl = ref<HTMLElement | null>(null)

const radarOption = (): EChartsOption => ({
  tooltip: {},
  radar: {
    indicator: genesisIndicators.map((i) => ({ name: i.name, max: 1 })),
    radius: '66%',
    center: ['50%', '54%'],
    axisName: { color: '#7a8299', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.2)' } },
    splitArea: { areaStyle: { color: ['rgba(91,139,255,.03)', 'transparent'] } },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.2)' } }
  },
  series: [
    {
      type: 'radar',
      symbolSize: 4,
      data: [
        {
          value: genesisIndicators.map((i) => i.value),
          name: '实测值',
          lineStyle: { color: '#345ce0', width: 2 },
          itemStyle: { color: '#345ce0' },
          areaStyle: { color: 'rgba(52,92,224,.2)' }
        },
        {
          value: genesisIndicators.map((i) => i.threshold),
          name: '阈值',
          lineStyle: { color: '#e8534a', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#e8534a' },
          areaStyle: { color: 'rgba(232,83,74,.06)' }
        }
      ]
    }
  ]
})

/** 滞后相关：不同滞后月数下的相关系数 */
const lagOption = (): EChartsOption => {
  const lags = [0, 1, 2, 3, 4, 5, 6]
  const rndMax = [0.31, 0.72, 0.58, 0.42, 0.3, 0.21, 0.14]
  return {
    grid: { left: 8, right: 20, top: 20, bottom: 8, containLabel: true },
    tooltip: { formatter: '滞后 {b} 个月<br/>相关系数 {c}' },
    xAxis: {
      type: 'category',
      data: lags.map((l) => l + ' 月'),
      axisLabel: { fontSize: 10, color: '#7a8299' },
      axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: 'R',
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
    },
    series: [
      {
        type: 'bar', barWidth: '48%',
        data: rndMax.map((v, i) => ({
          value: v,
          itemStyle: { borderRadius: [4, 4, 0, 0], color: i === 1 ? '#e8534a' : 'rgba(91,139,255,.65)' }
        })),
        label: { show: true, position: 'top', fontSize: 9, color: '#7a8299' }
      }
    ]
  }
}

const depthOption = (): EChartsOption => {
  const bins = [0, 3, 6, 9, 12, 15, 20, 30]
  const counts = bins.slice(0, -1).map((b, i) =>
    events.filter((e) => e.depth >= b && e.depth < bins[i + 1]).length
  )
  return {
    grid: { left: 8, right: 20, top: 20, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]}`),
      name: 'km', nameLocation: 'end',
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 9, color: '#7a8299', rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: '事件数',
      nameTextStyle: { fontSize: 10, color: '#7a8299' },
      axisLabel: { fontSize: 10, color: '#7a8299' },
      splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
    },
    series: [
      {
        type: 'bar', barWidth: '62%',
        data: counts,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#345ce0' },
        label: { show: true, position: 'top', fontSize: 9, color: '#7a8299' }
      }
    ]
  }
}

useChart(radarEl, radarOption)
useChart(lagEl, lagOption)
useChart(depthEl, depthOption)
</script>

<style scoped>
.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.95fr);
  gap: 14px;
}
.radar { height: 320px; width: 100%; }
.ch { height: 240px; width: 100%; }

.v-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.v-badge {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}
.v-badge.danger { background: var(--danger-soft); color: var(--danger); }
.v-badge.warning { background: var(--warning-soft); color: var(--warning); }
.v-badge.success { background: var(--success-soft); color: var(--success); }
.v-conf { font-size: 12px; color: var(--text-3); }

.v-text { font-size: 12px; line-height: 1.85; color: var(--text-2); }

.v-bars { margin-top: 14px; display: grid; gap: 10px; }
.vb .bar { height: 5px; }

@media (max-width: 1200px) {
  .main-grid, .grid-2 { grid-template-columns: 1fr; }
}
</style>
