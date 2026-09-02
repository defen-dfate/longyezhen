import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.css'

// 主题需要在挂载前应用，避免首屏闪烁
try {
  const saved = JSON.parse(localStorage.getItem('wb.app.v1') || '{}')
  document.documentElement.setAttribute('data-theme', saved.theme || 'light')
} catch {
  document.documentElement.setAttribute('data-theme', 'light')
}

createApp(App).use(createPinia()).use(router).mount('#app')
