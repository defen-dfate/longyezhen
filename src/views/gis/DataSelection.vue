<template>
  <div class="grid" style="gap: 14px">
    <div class="main-grid">
      <!-- 筛选条件 -->
      <section class="card">
        <div class="card-hd">
          <h3>筛选条件</h3>
          <button class="btn sm ghost" @click="reset">重置</button>
        </div>
        <div class="card-bd">
          <div class="field">
            <label>时间范围</label>
            <div class="row" style="gap: 6px">
              <input v-model="form.start" class="input" type="date" />
              <span class="dim">至</span>
              <input v-model="form.end" class="input" type="date" />
            </div>
          </div>

          <div class="field">
            <label>震级范围 M {{ form.minMag }} ~ {{ form.maxMag }}</label>
            <div class="row" style="gap: 10px">
              <input v-model.number="form.minMag" type="range" min="0" max="5" step="0.1" style="flex: 1" />
              <input v-model.number="form.maxMag" type="range" min="0" max="5" step="0.1" style="flex: 1" />
            </div>
          </div>

          <div class="field">
            <label>深度范围 (km)</label>
            <div class="row" style="gap: 6px">
              <input v-model.number="form.minDepth" class="input" type="number" />
              <span class="dim">~</span>
              <input v-model.number="form.maxDepth" class="input" type="number" />
            </div>
          </div>

          <div class="field">
            <label>空间范围（经纬度）</label>
            <div class="bbox">
              <div class="row" style="gap: 6px"><span class="dim small" style="width: 30px">经度</span>
                <input v-model.number="form.minLon" class="input" type="number" step="0.01" />
                <input v-model.number="form.maxLon" class="input" type="number" step="0.01" />
              </div>
              <div class="row" style="gap: 6px"><span class="dim small" style="width: 30px">纬度</span>
                <input v-model.number="form.minLat" class="input" type="number" step="0.01" />
                <input v-model.number="form.maxLat" class="input" type="number" step="0.01" />
              </div>
            </div>
          </div>

          <div class="field">
            <label>定位质量</label>
            <div class="row wrap" style="gap: 6px">
              <button
                v-for="q in ['A', 'B', 'C']"
                :key="q"
                class="chip"
                :class="{ on: form.qualities.includes(q) }"
                @click="toggleQuality(q)"
              >{{ q }} 类</button>
            </div>
          </div>

          <div class="field" style="margin-bottom: 0">
            <label>参考台站</label>
            <select v-model="form.station" class="select">
              <option value="">不限</option>
              <option v-for="s in stations" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
      </section>

      <!-- 结果 -->
      <div class="col" style="gap: 14px; min-width: 0">
        <div class="grid grid-3">
          <div class="stat accent">
            <div class="k">命中事件</div>
            <div class="v">{{ filtered.length }}</div>
            <div class="d">占全部 {{ ((filtered.length / events.length) * 100).toFixed(1) }}%</div>
          </div>
          <div class="stat">
            <div class="k">平均震级</div>
            <div class="v">{{ avgMag }}</div>
            <div class="d">最大 M{{ maxMag.toFixed(1) }}</div>
          </div>
          <div class="stat">
            <div class="k">数据量估算</div>
            <div class="v">{{ dataSize }}</div>
            <div class="d">按三分量波形估算</div>
          </div>
        </div>

        <section class="card">
          <div class="card-hd"><h3>空间分布预览</h3><span class="sub">筛选结果实时上图</span></div>
          <div class="card-bd flush">
            <GisMap
              :layers="layers"
              :center="REGION.center"
              :zoom="REGION.zoom"
              :height="300"
              :legend="EVENT_LEGEND"
              :tianditu-key="mapKey"
            />
          </div>
        </section>
      </div>
    </div>

    <!-- 明细 -->
    <section class="card">
      <div class="card-hd">
        <h3>数据清单</h3>
        <div class="row" style="gap: 8px">
          <span class="sub">显示前 {{ shown.length }} / {{ filtered.length }} 条</span>
          <button class="btn sm" :disabled="!filtered.length" @click="exportCsv">
            <AppIcon name="download" :size="13" /> 导出 CSV
          </button>
        </div>
      </div>
      <div class="card-bd flush" style="max-height: 400px; overflow-y: auto">
        <table class="table">
          <thead>
            <tr>
              <th>编号</th><th>发震时刻</th><th class="num">M</th>
              <th class="num">深度(km)</th><th class="num">经度</th><th class="num">纬度</th>
              <th>参考位置</th><th>质量</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in shown" :key="e.id">
              <td class="mono">{{ e.id }}</td>
              <td class="mono">{{ fmtTime(e.time) }}</td>
              <td class="num mono">M{{ e.mag.toFixed(1) }}</td>
              <td class="num mono">{{ e.depth }}</td>
              <td class="num mono">{{ e.lon.toFixed(3) }}</td>
              <td class="num mono">{{ e.lat.toFixed(3) }}</td>
              <td>{{ e.location }}</td>
              <td><span class="tag" :class="e.quality === 'A' ? 'success' : e.quality === 'B' ? 'info' : ''">{{ e.quality }}</span></td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="8" class="empty">没有符合条件的数据，试试放宽筛选条件</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import GisMap from '@/components/gis/GisMap.vue'
import AppIcon from '@/components/AppIcon.vue'
import { events, REGION, stations, type EqEvent } from '@/data/gis'
import { EVENT_LEGEND, makeEventLayer, makeReservoirLayer, makeStationLayer } from '@/gis/layers'
import { fmtBytes, fmtTime } from '@/utils/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const mapKey = import.meta.env.VITE_TIANDITU_KEY || ''

const defaults = {
  start: '2024-01-01',
  end: '2026-12-31',
  minMag: 0,
  maxMag: 5,
  minDepth: 0,
  maxDepth: 30,
  minLon: REGION.bounds.minLon,
  maxLon: REGION.bounds.maxLon,
  minLat: REGION.bounds.minLat,
  maxLat: REGION.bounds.maxLat,
  qualities: ['A', 'B', 'C'] as string[],
  station: ''
}

const form = reactive({ ...defaults, qualities: [...defaults.qualities] })

function reset() {
  Object.assign(form, defaults, { qualities: [...defaults.qualities] })
}

function toggleQuality(q: string) {
  const i = form.qualities.indexOf(q)
  if (i >= 0) form.qualities.splice(i, 1)
  else form.qualities.push(q)
}

const filtered = computed<EqEvent[]>(() => {
  const t0 = new Date(form.start).getTime()
  const t1 = new Date(form.end + 'T23:59:59').getTime()
  return events.filter(
    (e) =>
      e.time >= t0 &&
      e.time <= t1 &&
      e.mag >= form.minMag &&
      e.mag <= form.maxMag &&
      e.depth >= form.minDepth &&
      e.depth <= form.maxDepth &&
      e.lon >= form.minLon &&
      e.lon <= form.maxLon &&
      e.lat >= form.minLat &&
      e.lat <= form.maxLat &&
      form.qualities.includes(e.quality)
  )
})

const shown = computed(() => filtered.value.slice(0, 60))
const avgMag = computed(() =>
  filtered.value.length
    ? (filtered.value.reduce((s, e) => s + e.mag, 0) / filtered.value.length).toFixed(2)
    : '-'
)
const maxMag = computed(() => filtered.value.reduce((m, e) => Math.max(m, e.mag), 0))
const dataSize = computed(() => fmtBytes(filtered.value.length * 3 * 60000 * 2))

const layers = computed(() => [
  makeReservoirLayer(),
  makeEventLayer(filtered.value.slice(0, 300), false),
  makeStationLayer()
])

function exportCsv() {
  const head = '编号,发震时刻,震级,深度(km),经度,纬度,参考位置,定位质量\n'
  const body = filtered.value
    .map((e) =>
      [e.id, fmtTime(e.time), e.mag, e.depth, e.lon, e.lat, e.location, e.quality].join(',')
    )
    .join('\n')
  const blob = new Blob(['\ufeff' + head + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `events_${filtered.value.length}.csv`
  a.click()
  URL.revokeObjectURL(url)
  app.log('success', 'gis', `导出 ${filtered.value.length} 条事件数据为 CSV`)
}
</script>

<style scoped>
.main-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.6fr);
  gap: 14px;
}
.bbox { display: grid; gap: 6px; }
.chip {
  padding: 3px 11px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-elev);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }

@media (max-width: 1200px) {
  .main-grid, .grid-3 { grid-template-columns: 1fr; }
}
</style>
