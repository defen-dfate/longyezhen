/* ============================================================
 * ECharts 按需注册 + 响应式封装
 * ============================================================ */
import * as echarts from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  EffectScatterChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  RadarComponent,
  GeoComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  EffectScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  RadarComponent,
  GeoComponent,
  CanvasRenderer
])

export type EChartsOption = echarts.EChartsCoreOption

/** 基础配色（浅色主题） */
export const PALETTE = [
  '#5b8bff',
  '#61ddaa',
  '#f6bd16',
  '#7262fd',
  '#78d3f8',
  '#f08bb4',
  '#9661bc',
  '#ff9845'
]

export const AXIS_STYLE = {
  axisLine: { lineStyle: { color: 'rgba(140,150,175,.35)' } },
  axisLabel: { color: '#7a8299', fontSize: 11 },
  splitLine: { lineStyle: { color: 'rgba(140,150,175,.14)' } }
}

/**
 * 在指定元素上挂载 ECharts 实例，自动响应 option 变化与容器尺寸变化
 * @param el 容器 ref
 * @param makeOption 生成配置的函数
 * @param watchSources 需要监听的响应式依赖
 */
export function useChart(
  el: Ref<HTMLElement | null>,
  makeOption: () => EChartsOption,
  watchSources: Ref<unknown> | Ref<unknown>[] = []
) {
  let chart: echarts.ECharts | null = null
  let ro: ResizeObserver | null = null
  const ready = ref(false)

  function render() {
    if (!el.value) return
    if (!chart) {
      chart = echarts.init(el.value)
      ready.value = true
    }
    chart.setOption(makeOption(), true)
  }

  function resize() {
    chart?.resize()
  }

  const sources = Array.isArray(watchSources) ? watchSources : [watchSources]

  onMounted(() => {
    render()
    if (el.value && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => resize())
      ro.observe(el.value)
    }
    window.addEventListener('resize', resize)
  })

  onBeforeUnmount(() => {
    ro?.disconnect()
    window.removeEventListener('resize', resize)
    chart?.dispose()
    chart = null
  })

  if (sources.length) {
    watch(sources, () => render(), { deep: true })
  }

  return { render, resize, ready, getInstance: () => chart }
}

export { echarts }
