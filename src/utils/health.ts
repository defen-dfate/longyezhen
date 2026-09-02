/* ============================================================
 * 模块健康检测（演示性探针）
 * 真实部署时可将每个模块的 status / latency 替换为对后端接口的实际探测
 * ============================================================ */
import { MODULES } from '@/config/modules'
import type { ModuleHealth } from '@/stores/app'

const NOTES: Record<ModuleHealth['status'], string> = {
  ok: '运行正常，接口响应正常',
  warn: '响应偏慢或存在非关键告警',
  error: '探测失败，请检查服务或接口',
  unknown: '尚未检测'
}

/** 运行一次全量探测，返回各模块健康状态 */
export function runHealthChecks(): ModuleHealth[] {
  return MODULES.map((m) => {
    const r = Math.random()
    let status: ModuleHealth['status'] = 'ok'
    if (m.group === 'admin') {
      // 综合管理自身始终可用
      status = 'ok'
    } else if (r < 0.08) {
      status = 'error'
    } else if (r < 0.24) {
      status = 'warn'
    }
    const latency =
      status === 'error' ? 0 : status === 'warn' ? Math.round(220 + Math.random() * 400) : Math.round(20 + Math.random() * 160)
    return {
      key: m.key,
      name: m.name,
      path: m.path,
      group: m.group,
      status,
      latency,
      visits: 0,
      note: NOTES[status],
      checkedAt: Date.now()
    }
  })
}

export function statusTone(s: ModuleHealth['status']): string {
  return s === 'ok' ? 'success' : s === 'warn' ? 'warning' : s === 'error' ? 'danger' : ''
}
