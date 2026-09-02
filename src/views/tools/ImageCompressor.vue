<template>
  <div class="grid" style="gap: 14px">
    <!-- 参数设置 -->
    <section class="card">
      <div class="card-hd">
        <h3>压缩参数</h3>
        <span class="sub">目标大小为上限，算法会尽量贴近且不超过</span>
      </div>
      <div class="card-bd">
        <div class="params">
          <div class="field" style="margin: 0">
            <label>目标大小</label>
            <div class="row" style="gap: 6px">
              <input v-model.number="cfg.size" class="input" type="number" min="1" style="width: 96px" />
              <select v-model="cfg.unit" class="select" style="width: 82px">
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>

          <div class="field" style="margin: 0">
            <label>输出格式</label>
            <select v-model="cfg.format" class="select" style="width: 120px">
              <option value="auto">自动（推荐）</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WebP</option>
              <option value="image/png">PNG</option>
            </select>
          </div>

          <div class="field" style="margin: 0">
            <label>最大宽度（0 = 不限）</label>
            <input v-model.number="cfg.maxWidth" class="input" type="number" min="0" step="10" style="width: 96px" />
          </div>
        </div>

        <div class="row wrap mt" style="gap: 6px">
          <span class="dim small" style="margin-right: 4px">快捷：</span>
          <button
            v-for="p in presets"
            :key="p.kb"
            class="chip"
            :class="{ on: targetBytes === p.kb * 1024 }"
            @click="applyPreset(p.kb)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- 选区 -->
    <div
      class="drop card"
      :class="{ over }"
      @dragenter.prevent="over = true"
      @dragover.prevent="over = true"
      @dragleave.prevent="over = false"
      @drop.prevent="onDrop"
    >
      <div class="drop-inner">
        <AppIcon name="upload" :size="22" />
        <p>拖拽图片到这里，或</p>
        <button class="btn primary" @click="pick">选择图片</button>
        <p class="dim small">支持 JPG / PNG / WebP / BMP，可多选，全程本地处理</p>
        <input ref="fileEl" type="file" accept="image/*" multiple hidden @change="onPick" />
      </div>
    </div>

    <!-- 结果 -->
    <section v-if="items.length" class="card">
      <div class="card-hd">
        <h3>压缩结果</h3>
        <span class="sub">
          共 {{ items.length }} 张 ·
          {{ fmtBytes(totalOriginal) }} → {{ fmtBytes(totalOutput) }}
          <strong style="color: var(--success)">省 {{ saveRate }}%</strong>
        </span>
      </div>

      <div class="card-bd flush">
        <div class="list">
          <div v-for="it in items" :key="it.id" class="row-item">
            <div class="thumb" :style="{ backgroundImage: `url(${it.preview})` }"></div>
            <div class="grow">
              <div class="row between">
                <strong class="truncate" style="font-size: 13px; max-width: 60%">{{ it.result?.name || it.file.name }}</strong>
                <span v-if="it.status === 'done' && it.result" class="row" style="gap: 5px">
                  <span v-if="it.result.passthrough" class="tag info">原图已达标</span>
                  <span v-else-if="it.result.reached" class="tag success">达标</span>
                  <span v-else class="tag warning">未达目标</span>
                </span>
                <span v-else-if="it.status === 'working'" class="tag">压缩中 {{ Math.round(it.progress * 100) }}%</span>
                <span v-else-if="it.status === 'error'" class="tag danger">失败</span>
                <span v-else class="tag">等待中</span>
              </div>

              <div v-if="it.status === 'done' && it.result" class="sub-info">
                <span class="old">{{ fmtBytes(it.result.originalSize) }}</span>
                <span class="arw">→</span>
                <strong class="neu">{{ fmtBytes(it.result.size) }}</strong>
                <span class="rate">省 {{ Math.round((1 - it.result.size / it.result.originalSize) * 100) }}%</span>
                <span class="dim">· {{ it.result.width }}×{{ it.result.height }}</span>
                <span v-if="it.result.quality" class="dim">· q{{ it.result.quality.toFixed(2) }}</span>
                <span class="dim">· {{ shortMime(it.result.mime) }}</span>
              </div>
              <div v-else class="sub-info dim">{{ fmtBytes(it.file.size) }} · {{ it.file.name }}</div>

              <div v-if="it.status === 'working'" class="bar" style="margin-top: 6px">
                <i :style="{ width: Math.round(it.progress * 100) + '%' }"></i>
              </div>
            </div>

            <div class="ops">
              <button
                class="btn sm"
                :disabled="it.status !== 'done'"
                @click="downloadOne(it)"
              >下载</button>
              <button class="btn sm ghost danger" @click="remove(it)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-bd acts">
        <button class="btn primary" :disabled="!doneItems.length" @click="downloadZip">
          <AppIcon name="download" :size="14" /> 打包下载 ZIP（{{ doneItems.length }}）
        </button>
        <button class="btn" :disabled="!doneItems.length" @click="downloadAll">逐张下载</button>
        <div class="grow"></div>
        <button class="btn ghost" @click="clearAll">清空</button>
      </div>
    </section>

    <!-- 说明 -->
    <section class="card">
      <div class="card-hd"><h3>算法说明</h3></div>
      <div class="card-bd">
        <div class="grid grid-3">
          <div class="note">
            <strong>① 质量二分</strong>
            <p>在 0.05 ~ 0.95 之间二分查找，找到「不超过目标体积的最高质量」，最多 6 次迭代。</p>
          </div>
          <div class="note">
            <strong>② 等比降采样</strong>
            <p>若最低质量仍超限，按「体积 ≈ 像素数」估算缩放比，最多 6 轮，保证收敛到目标。</p>
          </div>
          <div class="note">
            <strong>③ 原样放行</strong>
            <p>原图本就小于目标且不需转格式/缩尺寸时直接放行，避免二次编码损失画质。</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { compressImage, type CompressResult, type OutputFormat } from '@/utils/compressor'
import { packZip, saveBlob } from '@/utils/zip'
import { fmtBytes } from '@/utils/format'
import { useAppStore } from '@/stores/app'

interface Item {
  id: string
  file: File
  preview: string
  outUrl: string | null
  status: 'pending' | 'working' | 'done' | 'error'
  progress: number
  result: CompressResult | null
}

const app = useAppStore()
const over = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)
const items = ref<Item[]>([])
let seq = 0
let running = false

const CFG_KEY = 'wb.compressor.cfg'
const cfg = reactive<{ size: number; unit: 'KB' | 'MB'; format: OutputFormat; maxWidth: number }>({
  size: 200,
  unit: 'KB',
  format: 'auto',
  maxWidth: 0
})

try {
  const saved = JSON.parse(localStorage.getItem(CFG_KEY) || 'null')
  if (saved) Object.assign(cfg, saved)
} catch { /* ignore */ }

watch(cfg, () => localStorage.setItem(CFG_KEY, JSON.stringify(cfg)), { deep: true })

const presets = [
  { kb: 50, label: '50KB' },
  { kb: 100, label: '100KB' },
  { kb: 200, label: '200KB' },
  { kb: 500, label: '500KB' },
  { kb: 1024, label: '1MB' },
  { kb: 2048, label: '2MB' }
]

function applyPreset(kb: number) {
  if (kb >= 1024) {
    cfg.unit = 'MB'
    cfg.size = kb / 1024
  } else {
    cfg.unit = 'KB'
    cfg.size = kb
  }
}

const targetBytes = computed(() =>
  cfg.unit === 'MB' ? cfg.size * 1024 * 1024 : cfg.size * 1024
)

const doneItems = computed(() => items.value.filter((i) => i.status === 'done' && i.result?.blob))
const totalOriginal = computed(() =>
  doneItems.value.reduce((s, i) => s + (i.result?.originalSize || 0), 0)
)
const totalOutput = computed(() =>
  doneItems.value.reduce((s, i) => s + (i.result?.size || 0), 0)
)
const saveRate = computed(() =>
  totalOriginal.value ? Math.round((1 - totalOutput.value / totalOriginal.value) * 100) : 0
)

function shortMime(m: string) {
  return m === 'image/jpeg' ? 'JPG' : m === 'image/webp' ? 'WebP' : 'PNG'
}

function pick() {
  fileEl.value?.click()
}

function onPick(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) addFiles(files)
  ;(e.target as HTMLInputElement).value = ''
}

function onDrop(e: DragEvent) {
  over.value = false
  if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files)
}

function addFiles(list: FileList) {
  let added = 0
  Array.from(list).forEach((f) => {
    if (!f.type.startsWith('image/')) return
    items.value.push({
      id: 'i' + ++seq,
      file: f,
      preview: URL.createObjectURL(f),
      outUrl: null,
      status: 'pending',
      progress: 0,
      result: null
    })
    added++
  })
  if (added) {
    app.log('info', 'tools', `加入 ${added} 张图片，目标 ${fmtBytes(targetBytes.value)}`)
    runQueue()
  }
}

async function runQueue() {
  if (running) return
  running = true
  try {
    let cur = items.value.find((i) => i.status === 'pending')
    while (cur) {
      cur.status = 'working'
      cur.progress = 0
      try {
        const res = await compressImage(cur.file, {
          targetBytes: targetBytes.value,
          format: cfg.format,
          maxWidth: cfg.maxWidth,
          onProgress: (p) => (cur!.progress = p)
        })
        cur.result = res
        cur.status = 'done'
        if (res.blob) {
          if (cur.outUrl) URL.revokeObjectURL(cur.outUrl)
          cur.outUrl = URL.createObjectURL(res.blob)
          app.recordCompress(res.originalSize, res.size)
          app.log(
            'success',
            'tools',
            `${res.name}: ${fmtBytes(res.originalSize)} → ${fmtBytes(res.size)}（${res.reached ? '达标' : '未达标'}）`
          )
        } else {
          cur.status = 'error'
          app.log('error', 'tools', `${cur.file.name} 压缩失败：${res.error || '未知错误'}`)
        }
      } catch (err) {
        cur.status = 'error'
        app.log('error', 'tools', `${cur.file.name} 处理异常：${(err as Error).message}`)
      }
      cur = items.value.find((i) => i.status === 'pending')
      await new Promise((r) => setTimeout(r, 0))
    }
  } finally {
    running = false
  }
}

function downloadOne(it: Item) {
  if (!it.result?.blob) return
  saveBlob(it.result.blob, it.result.name)
}

function downloadAll() {
  doneItems.value.forEach((it, i) => {
    setTimeout(() => it.result?.blob && saveBlob(it.result.blob, it.result.name), i * 200)
  })
}

async function downloadZip() {
  const list = doneItems.value
  if (!list.length) return
  try {
    const used: Record<string, number> = {}
    const entries = list.map((it) => {
      let n = it.result!.name
      if (used[n]) n = n.replace(/(\.[^.]+)$/, `_${++used[n]}$1`)
      else used[n] = 1
      return { name: n, blob: it.result!.blob! }
    })
    const zip = await packZip(entries)
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
    saveBlob(zip, `images_${stamp}.zip`)
    app.recordZip()
    app.log('success', 'tools', `打包下载 ${entries.length} 张图片`)
  } catch (err) {
    app.log('error', 'tools', `ZIP 打包失败：${(err as Error).message}`)
  }
}

function remove(it: Item) {
  const i = items.value.indexOf(it)
  if (i >= 0) items.value.splice(i, 1)
  if (it.preview) URL.revokeObjectURL(it.preview)
  if (it.outUrl) URL.revokeObjectURL(it.outUrl)
}

function clearAll() {
  items.value.forEach((it) => {
    if (it.preview) URL.revokeObjectURL(it.preview)
    if (it.outUrl) URL.revokeObjectURL(it.outUrl)
  })
  items.value = []
}

onBeforeUnmount(() => {
  items.value.forEach((it) => {
    if (it.preview) URL.revokeObjectURL(it.preview)
    if (it.outUrl) URL.revokeObjectURL(it.outUrl)
  })
})
</script>

<style scoped>
.params {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.params label { display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-2); }

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
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }

.drop {
  border: 1.5px dashed var(--border);
  background: var(--bg-elev);
  box-shadow: none;
  transition: all .18s;
}
.drop.over { border-color: var(--primary); background: var(--primary-soft); }
.drop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 26px 16px;
  text-align: center;
  color: var(--text-3);
}
.drop-inner p { font-size: 13px; }

.list { max-height: 460px; overflow-y: auto; }
.row-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-soft);
}
.row-item:last-child { border-bottom: none; }

.thumb {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-soft) center/cover no-repeat;
  flex: 0 0 auto;
}

.sub-info { margin-top: 3px; font-size: 12px; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.sub-info .old { color: var(--text-3); text-decoration: line-through; }
.sub-info .arw { color: var(--text-3); }
.sub-info .neu { color: var(--success); font-family: var(--mono); }
.sub-info .rate { color: var(--success); }

.ops { display: flex; gap: 6px; flex: 0 0 auto; }

.acts { display: flex; gap: 8px; align-items: center; border-top: 1px solid var(--border-soft); }

.note {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
}
.note strong { display: block; font-size: 12px; margin-bottom: 4px; color: var(--primary); }
.note p { font-size: 12px; color: var(--text-2); line-height: 1.7; }

@media (max-width: 900px) {
  .grid-3 { grid-template-columns: 1fr; }
}
</style>
