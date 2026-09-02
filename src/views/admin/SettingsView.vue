<template>
  <div class="grid" style="gap: 14px">
    <!-- 认证模式 -->
    <section class="card">
      <div class="card-hd"><h3>认证模式</h3></div>
      <div class="card-bd">
        <div class="row between wrap" style="gap: 12px">
          <div>
            <strong style="font-size: 14px">当前模式：</strong>
            <span class="tag" :class="isApi ? 'info' : 'success'">{{ isApi ? '真实后端 (api)' : '本地模拟 (mock)' }}</span>
          </div>
          <span class="dim small mono">VITE_AUTH_MODE = {{ authMode }}</span>
        </div>
        <p class="note mt">
          {{ isApi
            ? '已配置为对接真实后端，登录/注册将请求 VITE_API_BASE 指定的接口。'
            : '当前为本地模拟模式，默认账号 admin / admin123 可登录，注册信息保存在浏览器本地。如需切换为真实后端，请在构建时设置环境变量 VITE_AUTH_MODE=api 与 VITE_API_BASE。' }}
        </p>
      </div>
    </section>

    <!-- 外观与底图 -->
    <div class="grid grid-2">
      <section class="card">
        <div class="card-hd"><h3>外观</h3></div>
        <div class="card-bd">
          <div class="field">
            <label>主题</label>
            <div class="seg">
              <button :class="{ on: app.theme === 'light' }" @click="setTheme('light')">浅色</button>
              <button :class="{ on: app.theme === 'dark' }" @click="setTheme('dark')">深色</button>
            </div>
          </div>
          <p class="dim small">主题选择即时生效，并随会话持久化保存。</p>
        </div>
      </section>

      <section class="card">
        <div class="card-hd"><h3>地图底图</h3></div>
        <div class="card-bd">
          <div class="field">
            <label>默认底图</label>
            <select v-model="prefBasemap" class="select">
              <option value="amap">高德地图（默认，已内置 Key）</option>
              <option value="grid">经纬网格（零 key）</option>
              <option value="vec">天地图矢量</option>
              <option value="img">天地图影像</option>
              <option value="ter">天地图地形</option>
            </select>
          </div>
          <p class="dim small">高德为真实地图底图（Key 已内置）；矢量/影像/地形需配置天地图 key（见下方）。任一地图右上角也可临时切换。</p>
        </div>
      </section>
    </div>

    <!-- 天地图 key -->
    <section class="card">
      <div class="card-hd"><h3>天地图 Key</h3><span class="sub">编译期环境变量</span></div>
      <div class="card-bd">
        <div class="row between wrap" style="gap: 12px">
          <code class="mono kv-code">VITE_TIANDITU_KEY = {{ keyMasked || '（未配置）' }}</code>
          <span class="dim small">当前状态：{{ mapKey ? '已配置' : '未配置（使用网格底图）' }}</span>
        </div>
        <p class="note mt">
          底图密钥为编译期环境变量，运行时无法更改。若需启用天地图瓦片，请在项目根目录 <code>.env</code> 中设置
          <code>VITE_TIANDITU_KEY=你的key</code> 后重新构建部署。未配置时 WebGIS 自动回退到自绘经纬网格底图。
        </p>
      </div>
    </section>

    <!-- AI 智能客服 -->
    <section class="card">
      <div class="card-hd"><h3>AI 智能客服</h3><span class="sub">大模型对话 · 可配置</span></div>
      <div class="card-bd">
        <div class="field row between">
          <label>启用智能客服浮窗</label>
          <input type="checkbox" v-model="aiEnabled" />
        </div>
        <div class="field">
          <label>模型请求地址</label>
          <input class="input mono" v-model="aiBaseURL" placeholder="https://minnimax.chat/v1" />
        </div>
        <div class="field">
          <label>API Key</label>
          <input class="input" type="password" v-model="aiApiKey" placeholder="填写你的 API Key" />
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>模型 ID</label>
            <input class="input" list="ai-models" v-model="aiModel" placeholder="MiniMax-M2.7" />
            <datalist id="ai-models">
              <option v-for="m in modelOptions" :key="m" :value="m" />
            </datalist>
          </div>
          <div class="field">
            <label>Gateway ID</label>
            <input class="input mono" v-model="aiGateway" placeholder="gw-..." />
          </div>
        </div>
        <div class="field">
          <label>CORS 代理地址（可选 · 仅浏览器跨域被拦截时填写）</label>
          <input class="input mono" v-model="aiProxy" placeholder="如 https://api.allorigins.win/raw?url=" />
        </div>
        <div class="field">
          <label>系统提示词</label>
          <textarea class="input" rows="2" v-model="aiSystem"></textarea>
        </div>
        <div class="field">
          <label>项目介绍 / 知识库（供大模型回答）</label>
          <textarea class="input" rows="6" v-model="aiIntro"></textarea>
        </div>
        <p class="note mt">
          以上配置仅保存在当前浏览器（localStorage），不随源码提交。模型地址、API Key、模型 ID 已预填为默认可用值，
          打开站点左下角「智能客服」即可直接对话；回答基于此处「项目介绍 / 知识库」作为上下文。
          若浏览器提示跨域拦截，可在上方填写 CORS 代理地址（如 https://api.allorigins.win/raw?url=）后重试。
        </p>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="card">
      <div class="card-hd"><h3>数据管理</h3><span class="sub">仅影响本地浏览器数据</span></div>
      <div class="card-bd row wrap" style="gap: 10px">
        <button class="btn" @click="app.clearLogs()"><AppIcon name="trash" :size="14" />清空运行日志</button>
        <button class="btn" @click="app.resetCompressStats()"><AppIcon name="image" :size="14" />重置压缩统计</button>
        <button class="btn" @click="app.resetHealth()"><AppIcon name="gauge" :size="14" />重置健康记录</button>
        <span class="dim small">上述操作仅清除本机保存的演示数据，不影响源码。</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { AUTH_MODE } from '@/api/auth'
import { useAppStore, AI_MODELS, type PrefBasemap } from '@/stores/app'

const app = useAppStore()
const authMode = AUTH_MODE
const isApi = authMode === 'api'
const mapKey = import.meta.env.VITE_TIANDITU_KEY || ''
const modelOptions = AI_MODELS

const keyMasked = computed(() => {
  if (!mapKey) return ''
  if (mapKey.length <= 8) return '****'
  return mapKey.slice(0, 4) + '****' + mapKey.slice(-4)
})

const prefBasemap = computed<PrefBasemap>({
  get: () => app.prefBasemap,
  set: (v) => app.setPrefBasemap(v)
})

/* AI 智能客服配置（双向绑定，改动即持久化到 localStorage） */
const aiEnabled = computed({ get: () => app.aiConfig.enabled, set: (v) => app.updateAI({ enabled: v }) })
const aiBaseURL = computed({ get: () => app.aiConfig.baseURL, set: (v) => app.updateAI({ baseURL: v }) })
const aiApiKey = computed({ get: () => app.aiConfig.apiKey, set: (v) => app.updateAI({ apiKey: v }) })
const aiModel = computed({ get: () => app.aiConfig.model, set: (v) => app.updateAI({ model: v }) })
const aiGateway = computed({ get: () => app.aiConfig.gatewayId, set: (v) => app.updateAI({ gatewayId: v }) })
const aiProxy = computed({ get: () => app.aiConfig.proxyUrl, set: (v) => app.updateAI({ proxyUrl: v }) })
const aiSystem = computed({ get: () => app.aiConfig.systemPrompt, set: (v) => app.updateAI({ systemPrompt: v }) })
const aiIntro = computed({ get: () => app.aiConfig.projectIntro, set: (v) => app.updateAI({ projectIntro: v }) })

function setTheme(t: 'light' | 'dark') {
  if (app.theme !== t) app.toggleTheme()
}
</script>

<style scoped>
.note {
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  font-size: 12px;
  line-height: 1.85;
  color: var(--text-2);
}
.note code, .kv-code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  font-size: 12px;
}
.kv-code { display: inline-block; }

@media (max-width: 1100px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
