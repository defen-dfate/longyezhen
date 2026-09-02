import { defineStore } from 'pinia'
import { AUTH_MODE } from '@/api/auth'

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface LogItem {
  id: number
  ts: number
  level: LogLevel
  module: string
  message: string
}

export interface ModuleHealth {
  key: string
  name: string
  path: string
  group: 'resume' | 'tools' | 'gis' | 'admin'
  status: 'ok' | 'warn' | 'error' | 'unknown'
  latency: number
  visits: number
  note: string
  checkedAt: number | null
}

export type PrefBasemap = 'grid' | 'vec' | 'img' | 'ter' | 'amap'

export interface AIConfig {
  /** 是否启用智能客服 */
  enabled: boolean
  /** 模型自定义请求地址（不含末尾 chat/completions） */
  baseURL: string
  /** API Key */
  apiKey: string
  /** 模型 ID */
  model: string
  /** Gateway / 工作空间 ID */
  gatewayId: string
  /** CORS 代理（可选）：浏览器跨域被拦截时填代理前缀，如 https://api.allorigins.win/raw?url= */
  proxyUrl: string
  /** 系统提示词 */
  systemPrompt: string
  /** 项目介绍 / 知识库（作为回答上下文） */
  projectIntro: string
}

export const AI_MODELS = ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M3']

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: true,
  baseURL: 'https://minnimax.chat/v1',
  apiKey: 'gw-a2fdc682-77c5-43f7-a11e-a9c9c475891a',
  model: 'MiniMax-M2.7',
  gatewayId: 'gw-a2fdc682-77c5-43f7-a11e-a9c9c475891a',
  /** CORS 代理（Cloudflare Worker）：浏览器直连 MiniMax 会被跨域拦截，必须走代理 */
  proxyUrl: 'https://minimax-proxy.3350442988.workers.dev/?url=',
  systemPrompt:
    '你是 WorkBench 个人工作门户的智能客服助手。请基于下方提供的「项目介绍」内容，用简洁、专业、友好的中文回答访客关于本项目的问题。' +
    '若问题超出项目介绍范围或信息不足，请如实说明，不要编造。',
  projectIntro:
    'WorkBench 个人工作门户是一个基于 Vue 3 + Vite + TypeScript 的纯前端个人站点，已部署在 GitHub Pages，通过 GitHub Actions 自动构建发布。' +
    '站点包含四大模块：一、自我介绍（基本信息、专业技能、实习经历、项目作品、教育背景）；' +
    '二、地震监测与分析（复现于实习开发项目，接入高德地图作为真实底图，叠加地震监测站点与地震事件图层，自研 Canvas 渲染引擎保证叠加层与底图对齐）；' +
    '三、实用工具（基于质量二分查找与等比降采样算法的图像在线压缩工具，可指定目标体积、本地处理不上传）；' +
    '四、综合管理（系统运行状态、各功能模块健康度与操作日志的可视化监测面板，并支持主题、底图等偏好设置）。' +
    '技术栈：Vue 3、Vite、TypeScript、Pinia、Vue Router、ECharts、Canvas、高德地图 JS API、GitHub Actions。'
}

interface AppState {
  theme: 'light' | 'dark'
  siderCollapsed: boolean
  /** 偏好底图（地图组件的初始底图） */
  prefBasemap: PrefBasemap
  visits: Record<string, number>
  logs: LogItem[]
  /** 图像压缩工具的真实累计统计 */
  compressStats: {
    images: number
    originalBytes: number
    outputBytes: number
    zipExports: number
    lastAt: number | null
  }
  moduleHealth: Record<string, ModuleHealth>
  aiConfig: AIConfig
  logSeq: number
}

const LS_KEY = 'wb.app.v1'

function loadPersist(): Partial<AppState> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}

export const useAppStore = defineStore('app', {
  state: (): AppState => {
    const p = loadPersist()
    return {
      theme: p.theme || 'light',
      siderCollapsed: p.siderCollapsed ?? false,
      prefBasemap: (p.prefBasemap as PrefBasemap) || 'amap',
      visits: p.visits || {},
      logs: p.logs || [],
      compressStats: p.compressStats || {
        images: 0,
        originalBytes: 0,
        outputBytes: 0,
        zipExports: 0,
        lastAt: null
      },
      moduleHealth: p.moduleHealth || {},
      aiConfig: {
        ...DEFAULT_AI_CONFIG,
        ...(p.aiConfig || {}),
        /* 旧缓存里代理为空时回落到默认代理（CORS 必需，否则浏览器直连必被拦截） */
        proxyUrl: p.aiConfig?.proxyUrl || DEFAULT_AI_CONFIG.proxyUrl
      },
      logSeq: p.logSeq || 1
    }
  },

  getters: {
    /** 是否已接入真实后端 */
    isBackend: () => AUTH_MODE === 'api',
    savedBytes: (s) =>
      Math.max(0, s.compressStats.originalBytes - s.compressStats.outputBytes),
    totalVisits: (s) => Object.values(s.visits).reduce((a, b) => a + b, 0),
    errorCount: (s) => s.logs.filter((l) => l.level === 'error').length
  },

  actions: {
    persist() {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          theme: this.theme,
          siderCollapsed: this.siderCollapsed,
          prefBasemap: this.prefBasemap,
          visits: this.visits,
          logs: this.logs.slice(0, 300),
          compressStats: this.compressStats,
          moduleHealth: this.moduleHealth,
          aiConfig: this.aiConfig,
          logSeq: this.logSeq
        })
      )
    },

    updateAI(partial: Partial<AIConfig>) {
      this.aiConfig = { ...this.aiConfig, ...partial }
      this.persist()
    },

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', this.theme)
      this.persist()
    },

    toggleSider() {
      this.siderCollapsed = !this.siderCollapsed
      this.persist()
    },

    setPrefBasemap(b: PrefBasemap) {
      this.prefBasemap = b
      this.persist()
    },

    markVisit(path: string) {
      this.visits[path] = (this.visits[path] || 0) + 1
      this.persist()
    },

    log(level: LogLevel, module: string, message: string) {
      this.logs.unshift({
        id: this.logSeq++,
        ts: Date.now(),
        level,
        module,
        message
      })
      if (this.logs.length > 300) this.logs.length = 300
      this.persist()
    },

    clearLogs() {
      this.logs = []
      this.persist()
    },

    recordCompress(originalBytes: number, outputBytes: number) {
      this.compressStats.images += 1
      this.compressStats.originalBytes += originalBytes
      this.compressStats.outputBytes += outputBytes
      this.compressStats.lastAt = Date.now()
      this.persist()
    },

    recordZip() {
      this.compressStats.zipExports += 1
      this.persist()
    },

    resetCompressStats() {
      this.compressStats = {
        images: 0,
        originalBytes: 0,
        outputBytes: 0,
        zipExports: 0,
        lastAt: null
      }
      this.persist()
    },

    setHealth(item: ModuleHealth) {
      this.moduleHealth[item.key] = item
      this.persist()
    },

    resetHealth() {
      this.moduleHealth = {}
      this.persist()
    }
  }
})
