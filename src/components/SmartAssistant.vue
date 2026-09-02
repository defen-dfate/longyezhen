<template>
  <div class="assistant-root" ref="rootEl">
    <!-- 对话面板 -->
    <transition name="pop">
      <section v-if="open" class="panel">
        <header class="ph">
          <div class="ph-l">
            <span class="ph-ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1.5-4.5a8.5 8.5 0 0 1-1-4A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
              </svg>
            </span>
            <div class="ph-tx">
              <strong>智能客服</strong>
              <small :class="{ on: cfg.enabled }">{{ cfg.enabled ? '已接入大模型' : '未启用' }}</small>
            </div>
          </div>
          <button class="x" title="关闭" @click="open = false">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div ref="msgsEl" class="msgs">
          <div v-if="busy" class="typing-bar"><span class="tdot"></span>正在输入中…</div>
          <div v-if="!cfg.apiKey" class="warn">
            尚未配置 API Key，暂时无法对话。请到
            <router-link to="/admin/settings">综合管理 → 系统设置</router-link>
            填写模型地址、Key 与项目介绍。
          </div>
          <!-- 微信式对话：每条消息独立一行，同一方连续消息只有第一条显示头像，后续头像留白对齐 -->
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <template v-if="showAvatar(i)">
              <div v-if="m.role === 'assistant'" class="av a-ai" title="智能客服">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1.5-4.5a8.5 8.5 0 0 1-1-4A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
                </svg>
              </div>
              <div v-else class="av a-me" title="我">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </div>
            </template>
            <div v-else class="av-placeholder"></div>
            <div class="bubble" v-html="renderBubble(m.content)"></div>
          </div>
          <div v-if="error" class="err">{{ error }}</div>
        </div>

        <footer class="pf">
          <textarea
            v-model="input"
            rows="1"
            @keydown.enter.exact.prevent="send"
            placeholder="问点什么，例如：这个站点用了哪些技术？"
          ></textarea>
          <button class="send" :disabled="busy || !input.trim()" title="发送" @click="send">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </footer>
        <div class="hint">
          <a @click="clearChat">清空对话</a>
          · 回答基于项目知识库
        </div>
      </section>
    </transition>

    <!-- 悬浮入口 -->
    <button class="fab" :class="{ active: open }" title="智能客服" @click="open = !open">
      <span class="fab-ic">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1.5-4.5a8.5 8.5 0 0 1-1-4A8.38 8.38 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
        </svg>
      </span>
      <span class="fab-label">智能客服</span>
      <i class="fab-dot" title="已接入大模型"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { chatWithAI, type ChatMessage } from '@/api/ai'

const app = useAppStore()
const cfg = computed(() => app.aiConfig)

const open = ref(false)
const input = ref('')
const busy = ref(false)
const error = ref('')
const messages = ref<ChatMessage[]>([])
const msgsEl = ref<HTMLElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)

/** 微信式：同一方连续消息只有第一条显示头像 */
function showAvatar(i: number) {
  if (i === 0) return true
  return messages.value[i].role !== messages.value[i - 1].role
}

/** 点击面板或悬浮按钮以外的任意区域 → 关闭智能客服（不遮挡页面交互） */
function onDocMouseDown(e: MouseEvent) {
  if (!open.value) return
  const t = e.target as Node | null
  if (rootEl.value && t && !rootEl.value.contains(t)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onUnmounted(() => document.removeEventListener('mousedown', onDocMouseDown))

async function send() {
  const text = input.value.trim()
  if (!text || busy.value) return
  if (!cfg.value.enabled) {
    error.value = '智能客服未启用（请在系统设置中开启）'
    return
  }
  if (!cfg.value.apiKey) {
    error.value = '未配置 API Key，请在系统设置中填写'
    return
  }

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  busy.value = true
  error.value = ''
  await nextTick()
  scroll()

  const sys = `${cfg.value.systemPrompt}\n\n以下是项目介绍，作为回答依据：\n${cfg.value.projectIntro}`
  const history: ChatMessage[] = [
    { role: 'system', content: sys },
    ...messages.value.map((m) => ({ role: m.role, content: m.content }))
  ]
  const r = await chatWithAI(history, cfg.value)
  busy.value = false
  if (r.ok && r.content) messages.value.push({ role: 'assistant', content: r.content })
  else error.value = r.error || '请求失败'
  await nextTick()
  scroll()
}

function scroll() {
  if (msgsEl.value) msgsEl.value.scrollTop = msgsEl.value.scrollHeight
}

/** 轻量标记渲染：先转义防 XSS，再支持 **加粗** 与 `代码`，换行由 white-space 处理 */
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function renderBubble(raw: string) {
  let s = escapeHtml(raw ?? '')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  return s
}

function clearChat() {
  messages.value = []
  error.value = ''
}
</script>

<style scoped>
.assistant-root {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1000;
}

/* 悬浮按钮：胶囊样式 + 浅灰图标 */
.fab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px 8px 10px;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  color: var(--text);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.14);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.fab:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(15, 23, 42, 0.18); }
.fab:active { transform: translateY(0); }
.fab.active { box-shadow: 0 8px 22px rgba(15, 23, 42, 0.2); }
.fab-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--bg-soft);
  color: #aab2c0;            /* 浅灰图标 */
  transition: color 0.18s ease;
}
.fab:hover .fab-ic { color: #8b94a6; }
.fab-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--text);
  white-space: nowrap;
}
.fab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22b07d;
  box-shadow: 0 0 0 3px rgba(34, 176, 125, 0.18);
}

/* 面板 */
.panel {
  position: fixed;
  left: 20px;
  bottom: 78px;
  width: min(277px, calc(100vw - 40px));
  height: min(405px, 60vh);
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.ph {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px;
  border-bottom: 1px solid var(--border-soft);
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
}
.ph-l { display: flex; align-items: center; gap: 10px; }
.ph-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.18);
}
.ph-tx { display: flex; flex-direction: column; line-height: 1.2; }
.ph-tx strong { font-size: 14px; }
.ph-tx small { font-size: 11px; opacity: 0.85; }
.ph-tx small.on { color: #c8ffd9; }
.x {
  display: flex;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border-radius: 8px;
  padding: 5px;
  cursor: pointer;
}
.x:hover { background: rgba(255, 255, 255, 0.3); }

.msgs {
  flex: 1 1 auto;
  min-height: 0;            /* 关键：允许内部滚动，避免长内容撑破面板 */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  position: relative;       /* 供输入中标签 sticky 定位 */
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-soft);
}
/* 微信式对话：每条消息独立一行，头像留白对齐 */
.msg { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.msg.user { flex-direction: row-reverse; }
.av, .av-placeholder {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}
.av-placeholder { visibility: hidden; } /* 占位，保证气泡对齐 */
.a-ai { background: linear-gradient(135deg, #5b8bff, #345ce0); color: #fff; }
.a-me { background: var(--bg-elev); color: var(--text-2); border: 1px solid var(--border); }
.bubble {
  box-sizing: border-box;
  position: relative;
  min-width: 0;              /* 关键：flex 子项允许收缩，长串才不会撑破 */
  width: fit-content;
  max-width: calc(100% - 40px); /* 整行扣掉头像+间距，绝不横向溢出 */
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
}
.msg.user .bubble {
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
  border-bottom-right-radius: 3px;
}
.msg.assistant .bubble {
  background: var(--bg-elev);
  color: var(--text);
  border: 1px solid var(--border);
  border-bottom-left-radius: 3px;
}
/* 气泡指向头像的小尖角 */
.msg.assistant .bubble::after {
  content: '';
  position: absolute;
  left: -6px;
  top: 9px;
  width: 0;
  height: 0;
  border: 6px solid transparent;
  border-right-color: var(--bg-elev);
}
.msg.user .bubble::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 9px;
  width: 0;
  height: 0;
  border: 6px solid transparent;
  border-left-color: #345ce0;
}
/* 同一方连续消息之间的间距收紧 */
.msg + .msg.assistant { margin-top: 2px; }
.msg + .msg.user { margin-top: 2px; }
/* 换角色时恢复默认间距 */
.msg.assistant + .msg.user,
.msg.user + .msg.assistant { margin-top: 12px; }
.typing-bar {
  position: sticky;
  top: 0;
  align-self: flex-start;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-2);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
}
.typing-bar .tdot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5b8bff;
  animation: tdot 1s infinite ease-in-out;
}
@keyframes tdot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.25); }
}
.bubble strong { font-weight: 700; }
.bubble code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.06);
  border-radius: 5px;
  padding: 1px 5px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
.msg.user .bubble code { background: rgba(255, 255, 255, 0.22); }
.warn {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-2);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}
.warn a { color: var(--primary); cursor: pointer; }
.err {
  font-size: 12.5px;
  color: #e5484d;
  background: rgba(229, 72, 77, 0.08);
  border-radius: 10px;
  padding: 8px 10px;
  line-height: 1.6;
}

.pf {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid var(--border-soft);
  background: var(--bg-elev);
}
.pf textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 11px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  background: var(--bg-soft);
  color: var(--text);
  max-height: 96px;
}
.pf textarea:focus { outline: none; border-color: var(--primary); }
.send {
  flex: 0 0 auto;
  width: 40px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.send:disabled { opacity: 0.45; cursor: not-allowed; }

.hint {
  padding: 7px 12px;
  font-size: 11px;
  color: var(--text-3);
  border-top: 1px solid var(--border-soft);
  background: var(--bg-elev);
}
.hint a { color: var(--primary); cursor: pointer; margin-right: 4px; }

.pop-enter-active, .pop-leave-active { transition: opacity 0.16s, transform 0.16s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(8px); }
</style>
