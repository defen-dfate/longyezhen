<template>
  <div class="login">
    <div class="panel">
      <header class="hd">
        <div class="logo"><AppIcon name="layers" :size="24" /></div>
        <h1>WorkBench</h1>
        <p class="slogan">一站式工作台</p>
      </header>

      <div class="welcome">
        <div class="ava"><AppIcon name="user" :size="20" /></div>
        <div>
          <h2>欢迎回来</h2>
          <p>登录以继续使用 WorkBench</p>
        </div>
      </div>

      <form @submit.prevent="onSubmit">
        <div class="field">
          <label for="username">账号</label>
          <input
            id="username"
            v-model.trim="form.username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
          />
        </div>

        <div class="field">
          <label for="password">密码</label>
          <div class="pwd">
            <input
              id="password"
              v-model="form.password"
              class="input"
              :type="showPwd ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button type="button" class="eye" @click="showPwd = !showPwd">
              {{ showPwd ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <div class="row between small mt-sm">
          <label class="ck">
            <input v-model="remember" type="checkbox" /> 记住登录状态
          </label>
        </div>

        <p v-if="error" class="err">
          <AppIcon name="alert" :size="13" /> {{ error }}
        </p>

        <button class="btn primary block lg mt" type="submit" :disabled="auth.loading">
          <span v-if="auth.loading" class="spin"><AppIcon name="refresh" :size="15" /></span>
          {{ auth.loading ? '登录中…' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const showPwd = ref(false)
const remember = ref(true)
const error = ref('')

const form = ref({ username: '', password: '' })

async function onSubmit() {
  error.value = ''
  if (!form.value.username) return (error.value = '请输入账号')
  if (!form.value.password) return (error.value = '请输入密码')

  const ok = await auth.login({
    username: form.value.username,
    password: form.value.password
  })

  if (!ok) {
    error.value = auth.error || '登录失败'
    return
  }

  if (!remember.value) sessionStorage.setItem('wb.session-only', '1')
  const redirect = (route.query.redirect as string) || '/select'
  router.replace(redirect)
}
</script>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(900px 460px at 12% -12%, rgba(91, 139, 255, .30), transparent 60%),
    radial-gradient(700px 360px at 96% 112%, rgba(80, 200, 255, .18), transparent 60%),
    linear-gradient(140deg, #0f1d3f 0%, #1a2a52 52%, #22386e 100%);
}

.panel {
  width: 100%;
  max-width: 396px;
  padding: 38px 34px 34px;
  border-radius: 20px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  box-shadow: 0 24px 60px rgba(8, 14, 35, .38);
  color: var(--text);
}

.hd { text-align: center; margin-bottom: 26px; }
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
  margin-bottom: 14px;
}
.hd h1 { font-size: 24px; letter-spacing: -.5px; }
.slogan { margin-top: 4px; color: var(--text-3); font-size: 13px; }

.welcome { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.ava {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--primary-soft);
  color: var(--primary);
  flex: 0 0 auto;
}
.welcome h2 { font-size: 19px; }
.welcome p { margin-top: 3px; font-size: 12px; color: var(--text-3); }

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 12px; color: var(--text-2); margin-bottom: 6px; }
.input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s;
}
.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.pwd { position: relative; }
.pwd .input { padding-right: 52px; }
.eye {
  position: absolute;
  right: 4px;
  top: 4px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.eye:hover { color: var(--primary); background: var(--bg-soft); }

.ck { display: flex; align-items: center; gap: 5px; color: var(--text-2); cursor: pointer; font-size: 12px; }
.ck input { accent-color: var(--primary); }

.btn.block.lg {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 14px;
  letter-spacing: 2px;
  margin-top: 18px;
}
.spin { display: inline-flex; animation: rot 1s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }

.err {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
}

.mt-sm { margin-top: 10px; }
.mt { margin-top: 18px; }
.row { display: flex; align-items: center; }
.row.between { justify-content: space-between; }
.small { font-size: 12px; }
</style>
