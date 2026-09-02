<template>
  <div class="grid" style="gap: 14px">
    <!-- 工具卡片 -->
    <div class="grid grid-2">
      <router-link
        v-for="t in toolList"
        :key="t.path"
        :to="t.path"
        class="card tool"
        :class="{ soon: !t.ready }"
      >
        <div class="tool-ic" :style="{ background: t.bg, color: t.color }">
          <AppIcon :name="t.icon" :size="20" />
        </div>
        <div class="grow">
          <div class="row" style="gap: 8px">
            <strong style="font-size: 14px">{{ t.name }}</strong>
            <span v-if="!t.ready" class="tag">规划中</span>
            <span v-else class="tag success">可用</span>
          </div>
          <p class="muted small mt-sm">{{ t.desc }}</p>
          <div class="row wrap mt-sm" style="gap: 5px">
            <span v-for="f in t.feats" :key="f" class="tag info">{{ f }}</span>
          </div>
        </div>
        <AppIcon name="chevron" :size="15" class="dim" />
      </router-link>
    </div>

    <!-- 使用统计 -->
    <section class="card">
      <div class="card-hd">
        <h3>工具使用统计</h3>
        <span class="sub">数据来自本机真实累计</span>
      </div>
      <div class="card-bd">
        <div class="grid grid-4">
          <div class="stat accent">
            <div class="k">已处理图片</div>
            <div class="v">{{ app.compressStats.images }}</div>
            <div class="d">张</div>
          </div>
          <div class="stat">
            <div class="k">原始总计</div>
            <div class="v">{{ fmtBytes(app.compressStats.originalBytes) }}</div>
            <div class="d">压缩前体积</div>
          </div>
          <div class="stat">
            <div class="k">压缩后</div>
            <div class="v">{{ fmtBytes(app.compressStats.outputBytes) }}</div>
            <div class="d">输出体积</div>
          </div>
          <div class="stat">
            <div class="k">累计节省</div>
            <div class="v" style="color: var(--success)">{{ fmtBytes(app.savedBytes) }}</div>
            <div class="d">
              {{ app.compressStats.originalBytes ? ((app.savedBytes / app.compressStats.originalBytes) * 100).toFixed(1) : 0 }}%
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useAppStore } from '@/stores/app'
import { fmtBytes } from '@/utils/format'

const app = useAppStore()

const toolList = [
  {
    name: '图像压缩',
    desc: '指定目标大小批量压缩图片，质量二分 + 降采样双策略，可打包 ZIP 下载。',
    path: '/tools/image-compressor',
    icon: 'image',
    color: '#345ce0',
    bg: 'var(--primary-soft)',
    ready: true,
    feats: ['目标大小', '批量', 'ZIP 打包', '本地处理']
  },
  {
    name: '格式转换',
    desc: 'JPG / PNG / WebP / AVIF 互转，支持批量与尺寸调整。',
    path: '/tools/image-compressor',
    icon: 'layers',
    color: '#0891b2',
    bg: 'var(--info-soft)',
    ready: false,
    feats: ['批量转换', '尺寸调整']
  },
  {
    name: 'JSON 格式化',
    desc: 'JSON 校验、格式化、压缩、转义与路径查询。',
    path: '/tools/image-compressor',
    icon: 'file',
    color: '#d97706',
    bg: 'var(--warning-soft)',
    ready: false,
    feats: ['语法校验', '折叠视图']
  },
  {
    name: 'Base64 工具',
    desc: '文本与图片的 Base64 / URL 编解码，支持文件互转。',
    path: '/tools/image-compressor',
    icon: 'zap',
    color: '#15a34a',
    bg: 'var(--success-soft)',
    ready: false,
    feats: ['文本', '图片']
  }
]
</script>

<style scoped>
.tool {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  transition: all .18s;
}
.tool:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.tool.soon { opacity: .62; }
.tool.soon:hover { border-color: var(--border); transform: none; box-shadow: var(--shadow); }

.tool-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 11px;
  flex: 0 0 auto;
}

@media (max-width: 1100px) {
  .grid-2, .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
