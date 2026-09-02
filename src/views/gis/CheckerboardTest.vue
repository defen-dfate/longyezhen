<template>
  <div class="grid" style="gap: 14px">
    <!-- 参数 -->
    <section class="card">
      <div class="card-bd">
        <div class="row wrap" style="gap: 18px">
          <div>
            <label class="lbl">异常幅度 (%)</label>
            <input v-model.number="amp" class="input" type="number" step="0.5" style="width: 84px" />
          </div>
          <div>
            <label class="lbl">棋盘尺寸 (格)</label>
            <input v-model.number="size" class="input" type="number" min="1" max="8" style="width: 84px" />
          </div>
          <div>
            <label class="lbl">深度层 (km)</label>
            <select v-model.number="depth" class="select" style="width: 96px">
              <option v-for="d in DEPTH_SLICES" :key="d" :value="d">{{ d }} km</option>
            </select>
          </div>
          <div>
            <label class="lbl">噪声水平 (%)</label>
            <input v-model.number="noise" class="input" type="number" step="5" min="0" max="100" style="width: 84px" />
          </div>
          <div class="grow"></div>
          <div class="center">
            <div class="dim small">恢复度评分</div>
            <strong style="font-size: 20px" :style="{ color: scoreColor }">{{ (score * 100).toFixed(1) }}%</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- 对比 -->
    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>输入模型（真实扰动）</h3><span class="sub">{{ depth }} km 深度切片</span></div>
        <div class="card-bd"><div ref="inEl" class="heat-chart"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>反演恢复结果</h3><span class="sub">含 {{ noise }}% 噪声</span></div>
        <div class="card-bd"><div ref="outEl" class="heat-chart"></div></div>
      </section>
    </div>

    <!-- 剖面与结论 -->
    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>沿纬度剖面（j = {{ midJ }}）对比</h3></div>
        <div class="card-bd"><div ref="profEl" class="prof-chart"></div></div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>分辨率评价</h3></div>
        <div class="card-bd">
          <div class="kv"><span>输入异常幅度</span><strong class="mono">±{{ amp.toFixed(1) }}%</strong></div>
          <div class="kv"><span>恢复异常幅度</span><strong class="mono">±{{ recoveredAmp.toFixed(2) }}%</strong></div>
          <div class="kv"><span>幅度保持率</span><strong class="mono" :style="{ color: scoreColor }">{{ (ampKeep * 100).toFixed(1) }}%</strong></div>
          <div class="kv"><span>形态相关系数</span><strong class="mono">{{ score.toFixed(4) }}</strong></div>
          <div class="kv"><span>可靠分辨尺度</span><strong class="mono">{{ reliableScale }}</strong></div>
          <p class="note">{{ conclusion }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChart, type EChartsOption } from '@/composables/useChart'
import { checkerboardGrid, DEPTH_SLICES, REGION, type VelocityCell } from '@/data/gis'
import { velocityColor } from '@/gis/layers'

const amp = ref(4)
const size = ref(3)
const depth = ref(8)
const noise = ref(10)

const NX = 34
const NY = 26

/** 输入棋盘格模型 */
const input = computed<VelocityCell[]>(() => {
  const cells = checkerboardGrid(NX, NY, size.value)
  return cells.map((c) => ({ ...c, value: c.value * (amp.value / 4) }))
})

/** 模拟反演恢复：高斯平滑 + 边缘衰减 + 噪声 */
const output = computed<VelocityCell[]>(() => {
  const src = input.value
  const grid: number[][] = []
  for (let j = 0; j < NY; j++) {
    grid.push([])
    for (let i = 0; i < NX; i++) grid[j].push(0)
  }
  src.forEach((c) => (grid[c.j][c.i] = c.value))

  const k = [[1, 2, 1], [2, 4, 2], [1, 2, 1]]
  const out: number[][] = []
  for (let j = 0; j < NY; j++) {
    out.push([])
    for (let i = 0; i < NX; i++) {
      let s = 0
      let w = 0
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const jj = j + dj
          const ii = i + di
          if (jj < 0 || jj >= NY || ii < 0 || ii >= NX) continue
          s += grid[jj][ii] * k[dj + 1][di + 1]
          w += k[dj + 1][di + 1]
        }
      }
      // 边缘恢复能力衰减（射线覆盖不足）
      const edge = Math.min(1, Math.min(i, NX - 1 - i) / 6) * Math.min(1, Math.min(j, NY - 1 - j) / 5)
      const attenuation = 0.45 + 0.55 * edge
      const n = ((Math.sin(i * 12.9898 + j * 78.233 + depth.value) * 43758.5453) % 1)
      out[j].push(s / w * attenuation + n * (noise.value / 100) * amp.value * 0.6)
    }
  }

  const cells: VelocityCell[] = []
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const c = src[j * NX + i]
      cells.push({ i, j, lon: c.lon, lat: c.lat, value: Number(out[j][i].toFixed(2)) })
    }
  }
  return cells
})

const flatIn = computed(() => input.value.map((c) => c.value))
const flatOut = computed(() => output.value.map((c) => c.value))

/** 相关系数 */
const score = computed(() => {
  const a = flatIn.value
  const b = flatOut.value
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db)
})

const recoveredAmp = computed(() => Math.max(...flatOut.value.map(Math.abs)))
const ampKeep = computed(() => (amp.value ? recoveredAmp.value / amp.value : 0))
const scoreColor = computed(() =>
  score.value > 0.8 ? 'var(--success)' : score.value > 0.6 ? 'var(--warning)' : 'var(--danger)'
)
const reliableScale = computed(() => {
  const s = score.value
  if (s > 0.85) return `${((REGION.bounds.maxLon - REGION.bounds.minLon) * 96 / NX * size.value * 1).toFixed(0)} km（棋盘 ${size.value} 格可分辨）`
  if (s > 0.6) return `约 ${((REGION.bounds.maxLon - REGION.bounds.minLon) * 96 / NX * size.value * 1.6).toFixed(0)} km（部分可分辨）`
  return '该尺度下不可靠，建议增大棋盘尺寸'
})

const conclusion = computed(() => {
  const s = score.value
  if (s > 0.85)
    return `在 ${depth.value} km 深度、棋盘尺寸 ${size.value} 格的条件下，反演结果能够清晰恢复输入异常，说明该区域射线覆盖良好，分辨率达到设计预期。`
  if (s > 0.6)
    return `恢复结果存在一定程度的平滑与幅度损失（保持率 ${(ampKeep.value * 100).toFixed(0)}%），边缘区域恢复较差，建议增加台站密度或适当增大阻尼。`
  return `当前噪声水平（${noise.value}%）下恢复效果较差，异常形态已严重失真，需要提高数据信噪比或降低分辨率要求。`
})

const midJ = Math.floor(NY / 2)

/* ---------------- 图表 ---------------- */
const inEl = ref<HTMLElement | null>(null)
const outEl = ref<HTMLElement | null>(null)
const profEl = ref<HTMLElement | null>(null)

function heatOption(cells: VelocityCell[]): EChartsOption {
  return {
    tooltip: {
      formatter: (p: unknown) => {
        const d = (p as { value: [number, number, number] }).value
        return `i=${d[0]}, j=${d[1]}<br/>扰动 ${d[2].toFixed(2)}%`
      }
    },
    grid: { left: 8, right: 8, top: 8, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      data: Array.from({ length: NX }, (_, i) => String(i)),
      axisLabel: { fontSize: 9, color: '#7a8299', interval: 5 },
      axisTick: { show: false },
      splitArea: { show: false }
    },
    yAxis: {
      type: 'category',
      data: Array.from({ length: NY }, (_, j) => String(j)),
      axisLabel: { fontSize: 9, color: '#7a8299', interval: 4 },
      axisTick: { show: false },
      splitArea: { show: false }
    },
    visualMap: {
      min: -amp.value,
      max: amp.value,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 10,
      itemHeight: 90,
      textStyle: { fontSize: 10, color: '#7a8299' },
      inRange: { color: ['#2f6fe0', '#7fb0f5', '#f2f5fa', '#f7b26a', '#e8534a'] }
    },
    series: [
      {
        type: 'heatmap',
        data: cells.map((c) => [c.i, c.j, c.value]),
        progressive: 0,
        itemStyle: { borderWidth: 0 },
        emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } }
      }
    ]
  }
}

const inOption = () => heatOption(input.value)
const outOption = () => heatOption(output.value)

const profOption = (): EChartsOption => ({
  grid: { left: 8, right: 16, top: 26, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis' },
  legend: { top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#7a8299' } },
  xAxis: {
    type: 'category',
    data: Array.from({ length: NX }, (_, i) => String(i)),
    name: '经度方向节点',
    nameLocation: 'middle', nameGap: 24,
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 9, color: '#7a8299', interval: 4 },
    axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value', name: '扰动(%)',
    nameTextStyle: { fontSize: 10, color: '#7a8299' },
    axisLabel: { fontSize: 10, color: '#7a8299' },
    splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
  },
  series: [
    {
      name: '输入模型', type: 'line', step: 'middle',
      data: input.value.filter((c) => c.j === midJ).map((c) => c.value),
      lineStyle: { width: 2, color: '#345ce0' },
      itemStyle: { color: '#345ce0' }
    },
    {
      name: '恢复结果', type: 'line', smooth: true,
      data: output.value.filter((c) => c.j === midJ).map((c) => c.value),
      lineStyle: { width: 2, color: '#e8534a', type: 'dashed' },
      itemStyle: { color: '#e8534a' }
    }
  ]
})

useChart(inEl, inOption, [input, amp])
useChart(outEl, outOption, [output, amp])
useChart(profEl, profOption, [input, output])

void velocityColor
</script>

<style scoped>
.lbl { display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-2); }
.heat-chart { height: 300px; width: 100%; }
.prof-chart { height: 250px; width: 100%; }

.kv {
  display: flex; justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
}
.kv span { color: var(--text-2); }

.note {
  margin-top: 12px;
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-2);
}

@media (max-width: 1100px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
