<template>
  <div class="grid" style="gap: 14px">
    <!-- 经历时间线 -->
    <section class="card">
      <div class="card-hd">
        <h3>实习经历</h3>
        <span class="sub">共 {{ experiences.length }} 段 · 累计 {{ totalYears }}</span>
      </div>
      <div class="card-bd">
        <ol class="tl">
          <li v-for="(e, i) in experiences" :key="e.company" class="tl-item">
            <div class="tl-dot" :class="{ first: i === 0 }"></div>
            <div class="tl-head">
              <div class="row wrap" style="gap: 8px">
                <strong style="font-size: 14px">{{ e.company }}</strong>
                <span class="tag primary">{{ e.role }}</span>
              </div>
              <div class="row wrap small muted" style="gap: 12px; margin-top: 3px">
                <span class="mono">{{ e.period }}</span>
                <span>{{ e.location }}</span>
              </div>
            </div>

            <div class="row wrap mt-sm" style="gap: 6px">
              <span v-for="t in e.tags" :key="t" class="tag">{{ t }}</span>
            </div>

            <div class="tl-body">
              <div class="blk">
                <div class="blk-t">工作职责</div>
                <ul class="ul">
                  <li v-for="d in e.duties" :key="d">{{ d }}</li>
                </ul>
              </div>
              <div class="blk">
                <div class="blk-t">主要成果</div>
                <ul class="ul ok">
                  <li v-for="a in e.achievements" :key="a">{{ a }}</li>
                </ul>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- 年限分布 -->
    <section class="card">
      <div class="card-hd"><h3>经历时间轴</h3><span class="sub">各阶段时长占比</span></div>
      <div class="card-bd"><div ref="ganttEl" class="gantt"></div></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { experiences } from '@/data/resume'
import { useChart, PALETTE, type EChartsOption } from '@/composables/useChart'

/** 由 period 文本解析出起止月份 */
function parsePeriod(p: string) {
  const [a, b] = p.split('-').map((s) => s.trim())
  const toMonth = (s: string) => {
    const [y, m] = s.split('.').map(Number)
    return y * 12 + (m || 1)
  }
  return { start: toMonth(a), end: /至今/.test(b) ? new Date().getFullYear() * 12 + new Date().getMonth() + 1 : toMonth(b) }
}

const spans = experiences.map((e) => parsePeriod(e.period))
const minM = Math.min(...spans.map((s) => s.start))
const maxM = Math.max(...spans.map((s) => s.end))
const totalYears = ((maxM - minM) / 12).toFixed(1) + ' 年'
const totalMonths = maxM - minM

const ganttEl = ref<HTMLElement | null>(null)

const ganttOption = (): EChartsOption => ({
  grid: { left: 130, right: 30, top: 12, bottom: 30 },
  tooltip: {
    formatter: (p: unknown) => {
      const d = p as { name: string; value: number[] }
      return `${d.name}<br/>时长约 ${(d.value[2] / 12).toFixed(1)} 年`
    }
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: totalMonths,
    axisLabel: {
      fontSize: 10,
      color: '#7a8299',
      formatter: (v: number) => `${Math.floor(minM / 12) + Math.floor(v / 12)}`
    },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  yAxis: {
    type: 'category',
    data: experiences.map((e) => `${e.company}`),
    axisLabel: { fontSize: 11, color: '#7a8299' },
    axisLine: { show: false },
    axisTick: { show: false }
  },
  series: [
    {
      type: 'bar',
      stack: 'total',
      itemStyle: { color: 'transparent' },
      data: spans.map((s) => s.start - minM)
    },
    {
      type: 'bar',
      stack: 'total',
      barWidth: 16,
      itemStyle: {
        borderRadius: 4,
        color: (p: { dataIndex: number }) => PALETTE[p.dataIndex % PALETTE.length]
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 10,
        color: '#7a8299',
        formatter: (p: { dataIndex: number }) => experiences[p.dataIndex].period
      },
      data: spans.map((s) => s.end - s.start)
    }
  ]
})

useChart(ganttEl, ganttOption)
</script>

<style scoped>
.tl { list-style: none; margin: 0; padding: 0 0 0 4px; }
.tl-item { position: relative; padding: 0 0 22px 24px; border-left: 2px solid var(--border); }
.tl-item:last-child { border-left-color: transparent; padding-bottom: 0; }

.tl-dot {
  position: absolute;
  left: -6px;
  top: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--bg-elev);
  border: 2px solid var(--text-3);
}
.tl-dot.first { border-color: var(--primary); background: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }

.tl-body { margin-top: 12px; display: grid; gap: 12px; }
.blk-t { font-size: 12px; color: var(--text-2); margin-bottom: 5px; font-weight: 500; }
.ul { margin: 0; padding-left: 17px; display: grid; gap: 4px; }
.ul li { font-size: 13px; color: var(--text-2); line-height: 1.7; }
.ul.ok li::marker { color: var(--success); }

.gantt { height: 150px; width: 100%; }

@media (min-width: 900px) {
  .tl-body { grid-template-columns: 1fr 1fr; gap: 20px; }
}
</style>
