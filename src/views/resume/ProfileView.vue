<template>
  <div class="grid" style="gap: 14px">
    <!-- 个人名片 -->
    <section class="card">
      <div class="card-bd profile">
        <div class="ava">{{ profile.avatarText }}</div>
        <div class="grow">
          <div class="row wrap" style="gap: 10px">
            <h2 style="font-size: 20px">{{ profile.name }}</h2>
            <span class="tag primary">{{ profile.title }}</span>
            <span class="tag">{{ profile.years }}</span>
          </div>
          <p class="muted small mt-sm">{{ profile.location }}</p>

          <div class="contacts">
            <span class="ct"><AppIcon name="user" :size="13" /> {{ profile.email }}</span>
            <span class="ct"><AppIcon name="list" :size="13" /> {{ profile.phone }}</span>
            <span v-if="profile.github" class="ct"><AppIcon name="globe" :size="13" /> {{ profile.github.replace('https://', '') }}</span>
          </div>
        </div>
        <div class="qr">
          <div class="qr-box">
            <AppIcon name="zap" :size="22" />
          </div>
          <span class="dim" style="font-size: 11px">可导 PDF / 打印</span>
        </div>
      </div>
    </section>

    <!-- 关键指标 -->
    <div class="grid grid-4">
      <div v-for="s in stats" :key="s.k" class="stat" :class="{ accent: s.accent }">
        <div class="k">{{ s.k }}</div>
        <div class="v">{{ s.v }}</div>
        <div class="d">{{ s.d }}</div>
      </div>
    </div>

    <!-- 个人简介 -->
    <section class="card">
      <div class="card-hd"><h3>个人简介</h3></div>
      <div class="card-bd">
        <p class="summary">{{ profile.summary }}</p>
      </div>
    </section>

    <!-- 核心能力 -->
    <div class="grid grid-2">
      <div
        v-for="h in profile.highlights"
        :key="h.title"
        class="card"
        style="box-shadow: none"
      >
        <div class="card-bd hl">
          <div class="hl-icon"><AppIcon :name="h.icon" :size="17" /></div>
          <div>
            <strong style="font-size: 13px">{{ h.title }}</strong>
            <p class="muted small">{{ h.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 联系方式 -->
    <section class="card">
      <div class="card-hd"><h3>联系方式</h3><span class="sub">点击可复制</span></div>
      <div class="card-bd flush">
        <table class="table">
          <tbody>
            <tr v-for="c in contactRows" :key="c.k">
              <td style="width: 100px" class="muted small">{{ c.k }}</td>
              <td>
                <span class="mono">{{ c.v }}</span>
                <button class="cp" @click="copy(c.v)">复制</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { experiences, profile, projects, skillGroups } from '@/data/resume'

const stats = [
  { k: '工作经验', v: ' 硕士在读 ', d: '异常检测 + 图像分割 ', accent: true },
  { k: '主导项目', v: projects.length + ' 个', d: '含 1 个平台级项目' },
  { k: '技能方向', v: skillGroups.length + ' 类', d: ' 深度学习 / 全栈 / 前端 / 后端 / AI' },
  { k: '实习经历', v: experiences.length + ' 段', d: '航天宏图软件开发实习' }
]

const contactRows = [
  { k: '邮箱', v: profile.email },
  { k: '手机', v: profile.phone },
  ...(profile.github ? [{ k: 'GitHub', v: profile.github }] : []),
  ...(profile.blog ? [{ k: '个人博客', v: profile.blog }] : []),
  { k: '所在城市', v: profile.location }
]

const copied = ref('')
function copy(text: string) {
  navigator.clipboard?.writeText(text)
  copied.value = text
  setTimeout(() => (copied.value = ''), 1200)
}
void copied
</script>

<style scoped>
.profile { display: flex; gap: 18px; align-items: flex-start; }
.ava {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  border-radius: 16px;
  background: linear-gradient(135deg, #5b8bff, #345ce0);
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  flex: 0 0 auto;
}
.contacts { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; }
.ct { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-2); }

.qr { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 0 0 auto; }
.qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-3);
}

.summary { font-size: 13px; line-height: 1.85; color: var(--text-2); }

.hl { display: flex; gap: 12px; align-items: flex-start; }
.hl-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--primary-soft);
  color: var(--primary);
  flex: 0 0 auto;
}

.cp {
  margin-left: 8px;
  padding: 1px 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.cp:hover { color: var(--primary); border-color: var(--primary); }

@media (max-width: 1100px) {
  .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
