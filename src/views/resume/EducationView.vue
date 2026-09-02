<template>
  <div class="grid" style="gap: 14px">
    <!-- 教育背景 -->
    <section class="card">
      <div class="card-hd"><h3>教育经历</h3><span class="sub">{{ education.length }} 段</span></div>
      <div class="card-bd">
        <div v-for="e in education" :key="e.school" class="edu">
          <div class="edu-ic"><AppIcon name="file" :size="17" /></div>
          <div class="grow">
            <div class="row wrap" style="gap: 8px">
              <strong style="font-size: 14px">{{ e.school }}</strong>
              <span class="tag">{{ e.degree }}</span>
            </div>
            <div class="muted small mt-sm">{{ e.major }}</div>
            <div class="mono small dim">{{ e.period }}</div>
            <p class="desc">{{ e.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 证书荣誉 -->
    <section class="card">
      <div class="card-hd"><h3>证书与荣誉</h3><span class="sub">{{ certificates.length }} 项</span></div>
      <div class="card-bd flush">
        <table class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>颁发机构</th>
              <th class="num">获得时间</th>
              <th style="width: 90px">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in certificates" :key="c.name">
              <td>{{ c.name }}</td>
              <td class="muted">{{ c.issuer }}</td>
              <td class="num mono">{{ c.date }}</td>
              <td><span class="tag success">已获得</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 持续学习 -->
    <section class="card">
      <div class="card-hd"><h3>持续学习</h3><span class="sub">近期关注方向</span></div>
      <div class="card-bd">
        <div class="grid grid-3">
          <div v-for="l in learnings" :key="l.t" class="learn">
            <AppIcon :name="l.icon" :size="15" />
            <strong>{{ l.t }}</strong>
            <p class="dim small">{{ l.d }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { certificates, education } from '@/data/resume'

const learnings = [
  { icon: 'globe', t: '时空大数据', d: '海量轨迹与栅格数据的可视化性能' },
  { icon: 'zap', t: 'WebGPU / 渲染', d: '下一代浏览器图形渲染管线' },
  { icon: 'settings', t: '云原生', d: 'K8s 调度策略与可观测性建设' }
]
</script>

<style scoped>
.edu { display: flex; gap: 14px; align-items: flex-start; }
.edu-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  flex: 0 0 auto;
}
.desc { margin-top: 10px; font-size: 13px; line-height: 1.8; color: var(--text-2); }

.learn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--primary);
}
.learn strong { font-size: 13px; color: var(--text); font-weight: 500; }

@media (max-width: 1000px) {
  .grid-3 { grid-template-columns: 1fr; }
}
</style>
