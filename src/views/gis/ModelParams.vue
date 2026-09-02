<template>
  <div class="grid" style="gap: 14px">
    <div class="main-grid">
      <!-- 参数配置 -->
      <section class="card">
        <div class="card-hd">
          <h3>反演参数</h3>
          <div class="row" style="gap: 6px">
            <button class="btn sm ghost" @click="reset">默认</button>
            <button class="btn sm primary" @click="save">保存</button>
          </div>
        </div>
        <div class="card-bd">
          <div class="fld">
            <label>网格划分（经度 × 纬度 × 深度）</label>
            <div class="row" style="gap: 6px">
              <input v-model.number="p.nx" class="input" type="number" min="5" />
              <input v-model.number="p.ny" class="input" type="number" min="5" />
              <input v-model.number="p.nz" class="input" type="number" min="1" />
            </div>
          </div>

          <div class="fld">
            <label>网格间距 (km)</label>
            <input v-model.number="p.spacing" class="input" type="number" step="0.5" />
          </div>

          <div class="fld">
            <label>阻尼因子 λ</label>
            <input v-model.number="p.damping" class="input" type="number" step="1" />
            <div class="dim small">越大模型越平滑</div>
          </div>

          <div class="fld">
            <label>最大迭代次数</label>
            <input v-model.number="p.iterations" class="input" type="number" step="5" />
          </div>

          <div class="fld">
            <label>反演方法</label>
            <select v-model="p.method" class="select">
              <option value="lsqr">LSQR（最小二乘 QR）</option>
              <option value="svd">SVD 奇异值分解</option>
              <option value="cg">共轭梯度法</option>
            </select>
          </div>

          <div class="fld">
            <label>初始模型</label>
            <select v-model="p.initModel" class="select">
              <option value="iasp91">IASP91 全球模型</option>
              <option value="crust1.0">CRUST 1.0</option>
              <option value="custom">自定义分层</option>
            </select>
          </div>

          <div class="fld">
            <label class="ck"><input v-model="p.useTopo" type="checkbox" /> 考虑地形改正</label>
            <label class="ck"><input v-model="p.useAnisotropy" type="checkbox" /> 启用各向异性反演</label>
            <label class="ck"><input v-model="p.weightBySnr" type="checkbox" /> 按信噪比加权</label>
          </div>
        </div>
      </section>

      <!-- 预览与摘要 -->
      <div class="col" style="gap: 14px; min-width: 0">
        <section class="card">
          <div class="card-hd"><h3>网格剖分预览</h3><span class="sub">{{ p.nx }} × {{ p.ny }} × {{ p.nz }} 节点</span></div>
          <div class="card-bd"><div ref="gridEl" class="grid-chart"></div></div>
        </section>

        <section class="card">
          <div class="card-hd"><h3>配置摘要</h3></div>
          <div class="card-bd">
            <div class="kv"><span>总节点数</span><strong class="mono">{{ totalNodes.toLocaleString() }}</strong></div>
            <div class="kv"><span>待求参数</span><strong class="mono">{{ totalNodes.toLocaleString() }}</strong></div>
            <div class="kv"><span>覆盖面积</span><strong class="mono">{{ area.toLocaleString() }} km²</strong></div>
            <div class="kv"><span>反演方法</span><strong class="mono">{{ methodLabel }}</strong></div>
            <div class="kv"><span>预计耗时</span><strong class="mono">{{ estCost }}</strong></div>
            <div v-if="savedAt" class="kv"><span>保存时间</span><strong class="mono dim">{{ savedAt }}</strong></div>
          </div>
        </section>
      </div>
    </div>

    <!-- 预设方案 -->
    <section class="card">
      <div class="card-hd"><h3>预设方案</h3><span class="sub">点击快速套用</span></div>
      <div class="card-bd">
        <div class="grid grid-3">
          <button
            v-for="pre in presets"
            :key="pre.name"
            class="preset"
            :class="{ on: currentPreset === pre.name }"
            @click="applyPreset(pre)"
          >
            <strong>{{ pre.name }}</strong>
            <p class="dim small">{{ pre.desc }}</p>
            <div class="mono small" style="color: var(--primary)">
              {{ pre.p.nx }}×{{ pre.p.ny }}×{{ pre.p.nz }} · λ={{ pre.p.damping }}
            </div>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useChart, type EChartsOption } from '@/composables/useChart'
import { REGION } from '@/data/gis'
import { fmtTime } from '@/utils/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

const defaultParams = {
  nx: 34, ny: 26, nz: 6,
  spacing: 5,
  damping: 25,
  iterations: 60,
  method: 'lsqr',
  initModel: 'iasp91',
  useTopo: true,
  useAnisotropy: false,
  weightBySnr: true
}

const p = reactive({ ...defaultParams })
const savedAt = ref('')
const currentPreset = ref('标准方案')

function reset() {
  Object.assign(p, defaultParams)
  currentPreset.value = '标准方案'
}

function save() {
  localStorage.setItem('wb.gis.modelParams', JSON.stringify(p))
  savedAt.value = fmtTime(Date.now())
  app.log('success', 'gis', `保存反演参数配置（${p.nx}×${p.ny}×${p.nz}）`)
}

try {
  const s = JSON.parse(localStorage.getItem('wb.gis.modelParams') || 'null')
  if (s) Object.assign(p, s)
} catch { /* ignore */ }

const presets = [
  { name: '快速预览', desc: '粗网格，几分钟出结果，用于参数调试', p: { nx: 18, ny: 14, nz: 4, spacing: 10, damping: 40, iterations: 30, method: 'lsqr' } },
  { name: '标准方案', desc: '常规业务生产配置，精度与耗时平衡', p: { nx: 34, ny: 26, nz: 6, spacing: 5, damping: 25, iterations: 60, method: 'lsqr' } },
  { name: '精细成像', desc: '高分辨率，适合重点区域详查', p: { nx: 52, ny: 40, nz: 9, spacing: 2.5, damping: 15, iterations: 120, method: 'lsqr' } }
]

function applyPreset(pre: (typeof presets)[number]) {
  Object.assign(p, pre.p)
  currentPreset.value = pre.name
}

const totalNodes = computed(() => p.nx * p.ny * p.nz)
const area = computed(() => {
  const w = (REGION.bounds.maxLon - REGION.bounds.minLon) * 96
  const h = (REGION.bounds.maxLat - REGION.bounds.minLat) * 111
  return Math.round(w * h)
})
const methodLabel = computed(
  () => ({ lsqr: 'LSQR', svd: 'SVD', cg: '共轭梯度' })[p.method] || p.method
)
const estCost = computed(() => {
  const n = totalNodes.value
  if (n < 3000) return '< 10 min'
  if (n < 8000) return '20 ~ 40 min'
  if (n < 20000) return '1 ~ 2 h'
  return '2 ~ 5 h'
})

/* ---------------- 网格预览 ---------------- */
const gridEl = ref<HTMLElement | null>(null)

const gridOption = (): EChartsOption => {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= p.nx; i++) xs.push(i)
  for (let j = 0; j <= p.ny; j++) ys.push(j)
  return {
    grid: { left: 10, right: 10, top: 10, bottom: 10, containLabel: false },
    tooltip: {
      formatter: () => `网格 ${p.nx} × ${p.ny} × ${p.nz}<br/>间距 ${p.spacing} km`
    },
    xAxis: { type: 'value', min: 0, max: p.nx, show: false },
    yAxis: { type: 'value', min: 0, max: p.ny, show: false },
    series: [
      {
        type: 'line',
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: 'rgba(52,92,224,.28)', width: 1 },
          data: [
            ...xs.map((x) => [{ coord: [x, 0] }, { coord: [x, p.ny] }]),
          ]
        }
      },
      {
        type: 'line',
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: 'rgba(52,92,224,.28)', width: 1 },
          data: [...ys.map((y) => [{ coord: [0, y] }, { coord: [p.nx, y] }])]
        }
      },
      {
        type: 'scatter',
        symbolSize: 3,
        data: (() => {
          const pts: number[][] = []
          for (let i = 0; i <= p.nx; i++) for (let j = 0; j <= p.ny; j++) pts.push([i, j])
          return pts
        })(),
        itemStyle: { color: 'rgba(52,92,224,.5)' }
      }
    ]
  }
}

useChart(gridEl, gridOption, [computed(() => p.nx), computed(() => p.ny), computed(() => p.nz)])
</script>

<style scoped>
.main-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.6fr);
  gap: 14px;
}
.fld { margin-bottom: 13px; }
.fld > label:first-child { display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-2); }
.ck { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); margin-bottom: 6px; cursor: pointer; }
.ck input { accent-color: var(--primary); }

.grid-chart { height: 250px; width: 100%; }

.kv {
  display: flex; justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
}
.kv span { color: var(--text-2); }

.preset {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elev);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.preset:hover { border-color: var(--primary); }
.preset.on { border-color: var(--primary); background: var(--primary-soft); }
.preset strong { display: block; font-size: 13px; color: var(--text); }
.preset p { margin-top: 3px; }

@media (max-width: 1200px) {
  .main-grid, .grid-3 { grid-template-columns: 1fr; }
}
</style>
