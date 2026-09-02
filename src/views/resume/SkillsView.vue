<template>
  <div class="grid" style="gap: 14px">
    <div class="grid grid-2">
      <!-- 能力雷达 -->
      <section class="card">
        <div class="card-hd"><h3>能力雷达</h3><span class="sub">综合自评</span></div>
        <div class="card-bd">
          <div ref="radarEl" class="chart radar-chart"></div>
        </div>
      </section>

      <!-- 技能分布 -->
      <section class="card">
        <div class="card-hd"><h3>技能构成</h3><span class="sub">按方向统计</span></div>
        <div class="card-bd">
          <div ref="pieEl" class="chart pie-chart"></div>
        </div>
      </section>
    </div>

    <!-- 技能明细 -->
    <section v-for="g in skillGroups" :key="g.name" class="card">
      <div class="card-hd">
        <h3>{{ g.name }}</h3>
        <span class="sub">{{ g.desc }} · {{ g.items.length }} 项</span>
      </div>
      <div class="card-bd">
        <div v-for="s in g.items" :key="s.name" class="skill">
          <div class="row between">
            <div class="row" style="gap: 8px">
              <strong style="font-size: 13px; font-weight: 500">{{ s.name }}</strong>
              <span v-if="s.note" class="dim small">{{ s.note }}</span>
            </div>
            <span class="mono small" style="color: var(--primary)">{{ s.level }}</span>
          </div>
          <div class="bar mt-sm" style="margin-top: 6px">
            <i :style="{ width: s.level + '%' }"></i>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { radarData, skillGroups } from '@/data/resume'
import { useChart, type EChartsOption } from '@/composables/useChart'

const radarEl = ref<HTMLElement | null>(null)
const pieEl = ref<HTMLElement | null>(null)

const radarOption = (): EChartsOption => ({
  tooltip: {},
  radar: {
    indicator: radarData.indicators,
    radius: '68%',
    center: ['50%', '54%'],
    axisName: { color: '#7a8299', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.2)' } },
    splitArea: { areaStyle: { color: ['rgba(91,139,255,.03)', 'transparent'] } },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.2)' } }
  },
  series: [
    {
      type: 'radar',
      symbolSize: 5,
      data: [
        {
          value: radarData.values,
          name: '能力评分',
          lineStyle: { color: '#5b8bff', width: 2 },
          itemStyle: { color: '#5b8bff' },
          areaStyle: { color: 'rgba(91,139,255,.22)' }
        }
      ]
    }
  ]
})

const counts = computed(() =>
  skillGroups.map((g) => ({
    name: g.name,
    value: Math.round(g.items.reduce((s, i) => s + i.level, 0) / g.items.length)
  }))
)

const pieOption = (): EChartsOption => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}' },
  legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#7a8299' } },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'var(--bg-elev)', borderWidth: 2 },
      label: { show: true, formatter: '{c}', fontSize: 11, color: '#7a8299' },
      data: counts.value
    }
  ]
})

useChart(radarEl, radarOption)
useChart(pieEl, pieOption, [counts])
</script>

<style scoped>
.chart { width: 100%; }
.radar-chart { height: 260px; }
.pie-chart { height: 260px; }

.skill + .skill { margin-top: 14px; }

@media (max-width: 1100px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
