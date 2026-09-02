/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** 认证模式：mock = 前端模拟；api = 真实后端 */
  readonly VITE_AUTH_MODE?: 'mock' | 'api'
  /** 真实后端地址，VITE_AUTH_MODE=api 时生效 */
  readonly VITE_API_BASE?: string
  /** 天地图 key（可选，未配置则使用自绘网格底图） */
  readonly VITE_TIANDITU_KEY?: string
  /** 站点标题 */
  readonly VITE_APP_TITLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
