import { AI_MODELS, type AIConfig } from '@/stores/app'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResult {
  ok: boolean
  content?: string
  error?: string
}

/**
 * 规范化模型 ID：
 * - 纠正常见拼写 MinniMax（双 n）→ MiniMax（单 n）
 *   注：接口域名是 minnimax.chat（双 n），模型名却是 MiniMax（单 n），极易混填
 * - 不区分大小写匹配内置模型列表（如 minimax-m3 → MiniMax-M3）
 */
function normalizeModel(m: string): string {
  const raw = (m || '').trim()
  if (!raw) return 'MiniMax-M2.7'
  // min+nimax 只匹配含双 n（及以上）的误拼，不会误伤正确的 minimax
  const fixed = raw.replace(/min+nimax/gi, 'MiniMax')
  const hit = AI_MODELS.find((x) => x.toLowerCase() === fixed.toLowerCase())
  return hit || fixed
}

/** 去掉模型返回的 <think>...</think> 思考链，保留正式回答 */
function stripThink(s: string): string {
  return s
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*[\r\n]+/, '')
    .trim()
}

/** 拼接最终请求地址：若配置了 CORS 代理，则走 代理前缀 + encodeURIComponent(目标地址) */
function buildUrl(base: string, proxy?: string): string {
  const target = `${base.replace(/\/+$/, '')}/chat/completions`
  const p = (proxy || '').trim()
  return p ? `${p}${encodeURIComponent(target)}` : target
}

/**
 * 调用 MiniMax Chat 兼容接口（OpenAI Chat Completions 格式）。
 * 地址、Key、模型、Gateway ID 均来自配置（综合管理 → 系统设置）。
 * 鉴权：Authorization: Bearer <apiKey>（gw-... 即工作空间/网关令牌）。
 */
export async function chatWithAI(history: ChatMessage[], cfg: AIConfig): Promise<ChatResult> {
  const base = (cfg.baseURL || '').replace(/\/+$/, '')
  if (!base) return { ok: false, error: '未配置 API 地址' }
  if (!cfg.apiKey) return { ok: false, error: '未配置 API Key（请在「综合管理 → 系统设置」填写）' }

  const url = buildUrl(base, cfg.proxyUrl)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey}`
  }
  // Gateway / 工作空间 ID 同时以请求头传递（部分网关路由会用到）
  if (cfg.gatewayId) headers['X-Gateway-Id'] = cfg.gatewayId

  const body = {
    model: normalizeModel(cfg.model),
    messages: history,
    stream: false,
    temperature: 0.7,
    max_tokens: 1200
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return {
        ok: false,
        error: `请求失败（HTTP ${res.status}）${txt ? '：' + txt.slice(0, 200) : ''}`
      }
    }
    const data = await res.json()
    const raw: string =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.content ||
      data?.reply ||
      data?.output?.text ||
      ''
    if (!raw) return { ok: false, error: '模型未返回有效内容' }
    return { ok: true, content: stripThink(String(raw)) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (/Failed to fetch|NetworkError|CORS|跨域|blocked/i.test(msg)) {
      return {
        ok: false,
        error:
          '浏览器跨域被拦截（MiniMax 的 OPTIONS 预检返回 405，纯前端无法绕过）。' +
          '需配置 CORS 代理：部署方法见仓库 docs/CORS-PROXY.md（Cloudflare Worker 约 2 分钟即可完成），' +
          '部署后在「综合管理 → 系统设置 → AI 智能客服」填入代理地址。'
      }
    }
    return { ok: false, error: msg || '网络请求异常' }
  }
}
