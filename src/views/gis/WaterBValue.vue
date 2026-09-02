<template>
  <div class="grid" style="gap: 14px">
    <div class="grid grid-4">
      <div
        v-for="s in bValueStages"
        :key="s.key"
        class="stat"
        :class="{ accent: s.key === active }"
        style="cursor: pointer"
        @click="active = s.key"
      >
        <div class="k">{{ s.name }}</div>
        <div class="v">b = {{ s.bValue.toFixed(2) }}</div>
        <div class="d">样本 {{ s.count }} · R² {{ s.r2.toFixed(3) }}</div>
      </div>
    </div>

    <!-- G-R 拟合对比 -->
    <section class="card">
      <div class="card-hd">
        <h3>各蓄水阶段 G-R 关系对比</h3>
        <span class="sub">log N = a - bM，b 值反映大小地震比例</span>
      </div>
      <div class="card-bd"><div ref="mainEl" class="ch tall"></div></div>
    </section>

    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>b 值随蓄水位演化</h3><span class="sub">与蓄水位的相关性</span></div>
        <div class="card-bd"><div ref="trendEl" class="ch"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>阶段参数表</h3><span class="sub">最小二乘拟合结果</span></div>
        <div class="card-bd flush">
          <table class="table">
            <thead>
              <tr>
                <th>阶段</th><th>蓄水位(m)</th><th class="num">a 值</th>
                <th class="num">b 值</th><th class="num">样本</th><th class="num">R²</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in bValueStages"
                :key="s.key"
                :style="{ background: s.key === active ? 'var(--primary-soft)' : '' }"
                style="cursor: pointer"
                @click="active = s.key"
              >
                <td>{{ s.name }}</td>
                <td class="mono">{{ s.level || '—' }}</td>
                <td class="num mono">{{ s.aValue.toFixed(2) }}</td>
                <td class="num mono" style="color: var(--primary); font-weight: 600">{{ s.bValue.toFixed(2) }}</td>
                <td class="num mono">{{ s.count }}</td>
                <td class="num mono">{{ s.r2.toFixed(3) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 当前阶段详情 -->
    <section class="card">
      <div class="card-hd">
        <h3>{{ current.name }} · 拟合详情</h3>
        <span class="sub">点击上方卡片或表格切换阶段</span>
      </div>
      <div class="card-bd">
        <div class="grid grid-2">
          <div>
            <div class="kv"><span>拟合方程</span><strong class="mono">log N = {{ current.aValue.toFixed(2) }} - {{ current.bValue.toFixed(2) }} M</strong></div>
            <div class="kv"><span>样本数量</span><strong class="mono">{{ current.count }} 个事件</strong></div>
            <div class="kv"><span>拟合优度 R²</span><strong class="mono">{{ current.r2.toFixed(4) }}</strong></div>
            <div class="kv"><span>对应蓄水位</span><strong class="mono">{{ current.level ? current.level + ' m' : '蓄水前（天然河道）' }}</strong></div>
            <div class="kv"><span>完整度震级 Mc</span><strong class="mono">{{ mc.toFixed(1) }}</strong></div>
          </div>
          <div>
            <p class="note">
              <strong>解读：</strong>
              b 值越大，说明小震在地震总数中占比越高，通常与介质破碎、孔隙压升高、流体侵入有关。
              水库蓄水后若 b 值系统性升高，常被视为水库触发型地震活动的证据之一。
              本阶段 b = {{ current.bValue.toFixed(2) }}，
              相对蓄水前（{{ bValueStages[0].bValue.toFixed(2) }}）
              {{ deltaText }}。
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChart, PALETTE, type EChartsOption } from '@/composables/useChart'
import { bValueStages } from '@/data/gis'

const active = ref('b175')
const current = computed(() => bValueStages.find((s) => s.key === active.value) || bValueStages[0])
const base = bValueStages[0]

const delta = computed(() => current.value.bValue - base.bValue)
const deltaText = computed(() => {
  const d = delta.value
  if (Math.abs(d) < 0.02) return '基本持平'
  return d > 0 ? `升高 ${d.toFixed(2)}` : `降低 ${Math.abs(d).toFixed(2)}`
})
const mc = computed(() => 0.5 + current.value.bValue * 0.7)

const mainEl = ref<HTMLElement | null>(null)
const trendEl = ref<HTMLElement | null>(null)

/** 依据 a、b 生成各震级档的累积频次曲线 */
function curveOf(s: (typeof bValueStages)[number]) {
  const pts: Array<[number, number]> = []
  for (let m = 0.5; m <= 4.5; m += 0.25) {
    pts.push([Number(m.toFixed(2)), Number((s.aValue - s.bValue * m).toFixed(3))])
  }
  return pts
}

const mainOption = (): EChartsOption => ({
  grid: { left: 8, right: 24, top: 28, bottom: 8, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (ps: unknown) => {
      const arr = ps as Array<{ seriesName: string; value: number[] }>
      return arr
        .map((p) => `${p.seriesName}：M${p.value[0]} → N ≈ ${Math.round(Math.pow(10, p.value[1]))}`)
        .join('<br/>')
    }
  },
  legend: { top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#7a8299' } },
  xAxis: {
    type: 'value', name: '震级 M', nameLocation: 'middle', nameGap: 24,
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
  series: bValueStages.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    smooth: true,
    symbol: 'none',
    data: curveOf(s),
    lineStyle: {
      width: s.key === active.value ? 3 : 1.6,
      color: PALETTE[i % PALETTE.length],
      type: s.key === active.value ? ('solid' as const) : ('dashed' as const)
    },
    itemStyle: { color: PALETTE[i % PALETTE.length] }
  }))
})

const trendOption = (): EChartsOption => ({
  grid: { left: 8, right: 24, top: 20, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: bValueStages.map((s) => s.name),
    axisLabel: { fontSize: 10, color: '#7a8299', interval: 0, rotate: 12 },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value', name: 'b 值', min: 0.7,
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: [
    {
      type: 'bar', barWidth: '46%',
      data: bValueStages.map((s, i) => ({
        value: s.bValue,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: s.key === active.value ? '#345ce0' : PALETTE[i % PALETTE.length],
          opacity: s.key === active.value ? 1 : 0.6
        }
      })),
      label: { show: true, position: 'top', fontSize: 10, color: '#7a8299', formatter: '{c}' }
    }
  ]
})

useChart(mainEl, mainOption, [active])
useChart(trendEl, trendOption, [active])
</script>

<style scoped>
.ch { height: 260px; width: 100%; }
.ch.tall { height: 320px; }

.kv {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
}
.kv span { color: var(--text-2); }

.note {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-2);
}
.note strong { color: var(--primary); }

@media (max-width: 1100px) {
  .grid-2, .grid-4 { grid-template-columns: 1fr; }
}
</style>
