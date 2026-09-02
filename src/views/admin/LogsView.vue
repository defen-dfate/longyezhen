<template>
  <div class="grid" style="gap: 14px">
    <section class="card">
      <div class="card-bd row between wrap" style="gap: 12px">
        <div class="row wrap" style="gap: 12px">
          <div>
            <label class="lbl">级别</label>
            <select v-model="filterLevel" class="select" style="width: 110px">
              <option value="">全部级别</option>
              <option value="info">信息</option>
              <option value="success">成功</option>
              <option value="warn">警告</option>
              <option value="error">错误</option>
            </select>
          </div>
          <div>
            <label class="lbl">模块</label>
            <select v-model="filterModule" class="select" style="width: 120px">
              <option value="">全部模块</option>
              <option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="grow"></div>
          <span class="dim small mono">共 {{ filtered.length }} / {{ app.logs.length }} 条</span>
        </div>
        <div class="row" style="gap: 10px">
          <button class="btn" @click="exportLogs"><AppIcon name="download" :size="14" />导出</button>
          <button class="btn danger" :disabled="!app.logs.length" @click="clear">
            <AppIcon name="trash" :size="14" />清空
          </button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-bd flush">
        <div v-if="!filtered.length" class="empty">
          {{ app.logs.length ? '当前筛选无匹配日志' : '暂无日志，操作各模块后会在此记录' }}
        </div>
        <table v-else class="table">
          <thead>
            <tr><th class="num">时间</th><th>级别</th><th>模块</th><th>消息</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in filtered" :key="l.id">
              <td class="num mono dim small">{{ fmtTime(l.ts) }}</td>
              <td><span class="tag" :class="levelTone(l.level)">{{ levelLabel(l.level) }}</span></td>
              <td class="mono small">{{ l.module }}</td>
              <td class="small">{{ l.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { fmtTime } from '@/utils/format'
import { useAppStore, type LogLevel } from '@/stores/app'

const app = useAppStore()
const filterLevel = ref<string>('')
const filterModule = ref<string>('')

const moduleOptions = computed(() => [...new Set(app.logs.map((l) => l.module))].sort())

const filtered = computed(() =>
  app.logs.filter(
    (l) =>
      (!filterLevel.value || l.level === filterLevel.value) &&
      (!filterModule.value || l.module === filterModule.value)
  )
)

function levelLabel(l: LogLevel) {
  return l === 'info' ? '信息' : l === 'warn' ? '警告' : l === 'error' ? '错误' : '成功'
}
function levelTone(l: LogLevel) {
  return l === 'info' ? 'info' : l === 'warn' ? 'warning' : l === 'error' ? 'danger' : 'success'
}

function clear() {
  app.clearLogs()
}

function exportLogs() {
  const lines = filtered.value
    .map((l) => `${fmtTime(l.ts)} [${l.level.toUpperCase()}] ${l.module} - ${l.message}`)
    .join('\n')
  const blob = new Blob([lines || '（无日志）'], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workbench-logs-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
