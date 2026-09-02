<template>
  <div class="grid" style="gap: 14px">
    <div class="page-hd">
      <p class="dim small">共 {{ projects.length }} 个项目 · 按重要性排序</p>
    </div>

    <article v-for="(p, i) in projects" :key="p.name" class="card proj">
      <div class="card-hd">
        <div class="row wrap" style="gap: 9px">
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3>{{ p.name }}</h3>
          <span class="tag primary">{{ p.role }}</span>
        </div>
        <span class="mono small dim">{{ p.period }}</span>
      </div>

      <div class="card-bd">
        <p class="sub-title">{{ p.subtitle }}</p>
        <p class="desc">{{ p.desc }}</p>

        <!-- 项目配图（如论文实验可视化对比图） -->
        <figure v-if="p.image" class="proj-figure">
          <img :src="p.image" :alt="p.imageCaption || p.name" loading="lazy" @click="previewSrc = p.image!" />
          <figcaption v-if="p.imageCaption">{{ p.imageCaption }}</figcaption>
        </figure>

        <div class="row wrap mt" style="gap: 6px">
          <span v-for="t in p.stack" :key="t" class="tag info">{{ t }}</span>
        </div>

        <div class="metrics">
          <div v-for="m in p.metrics" :key="m.k" class="mt-item">
            <div class="mk">{{ m.k }}</div>
            <div class="mv">{{ m.v }}</div>
          </div>
        </div>
      </div>
    </article>

    <!-- 项目技术栈分布 -->
    <section class="card">
      <div class="card-hd"><h3>技术栈使用频次</h3><span class="sub">按项目统计</span></div>
      <div class="card-bd"><div ref="barEl" class="bar-chart"></div></div>
    </section>

    <!-- 配图放大预览 -->
    <transition name="pop">
      <div v-if="previewSrc" class="img-preview" @click="previewSrc = ''">
        <img :src="previewSrc" alt="预览大图" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { projects } from '@/data/resume'
import { useChart, type EChartsOption } from '@/composables/useChart'

const barEl = ref<HTMLElement | null>(null)
/** 当前放大预览的图片地址（空串表示关闭） */
const previewSrc = ref('')

const stackCount = computed(() => {
  const map = new Map<string, number>()
  projects.forEach((p) => p.stack.forEach((s) => map.set(s, (map.get(s) || 0) + 1)))
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
})

const barOption = (): EChartsOption => ({
  grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 10, color: '#7a8299' }, splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } } },
  yAxis: {
    type: 'category',
    data: stackCount.value.map((s) => s[0]).reverse(),
    axisLabel: { fontSize: 11, color: '#7a8299' },
    axisLine: { show: false },
    axisTick: { show: false }
  },
  series: [
    {
      type: 'bar',
      barWidth: 12,
      data: stackCount.value.map((s) => s[1]).reverse(),
      itemStyle: { borderRadius: 3, color: '#5b8bff' },
      label: { show: true, position: 'right', fontSize: 10, color: '#7a8299' }
    }
  ]
})

useChart(barEl, barOption, [stackCount])
</script>

<style scoped>
.idx {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--mono);
}

.sub-title { font-size: 13px; color: var(--primary); font-weight: 500; }
.desc { margin-top: 8px; font-size: 13px; line-height: 1.8; color: var(--text-2); }

/* 项目配图：宽度受限 + 圆角边框 + 点击放大 */
.proj-figure {
  margin: 14px 0 0;
}
.proj-figure img {
  display: block;
  width: 100%;
  max-width: 720px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #fff;
  cursor: zoom-in;
  transition: box-shadow 0.18s ease;
}
.proj-figure img:hover { box-shadow: 0 6px 18px rgba(15, 23, 42, 0.14); }
.proj-figure figcaption {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-3);
  max-width: 720px;
}
/* 放大预览遮罩 */
.img-preview {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: rgba(10, 14, 24, 0.72);
  cursor: zoom-out;
}
.img-preview img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}
.pop-enter-active, .pop-leave-active { transition: opacity 0.16s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
}
.mt-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
}
.mk { font-size: 11px; color: var(--text-3); }
.mv { margin-top: 2px; font-size: 15px; font-weight: 600; font-family: var(--mono); }

.bar-chart { height: 320px; width: 100%; }

@media (max-width: 900px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
}
</style>
