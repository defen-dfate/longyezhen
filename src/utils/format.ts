/** 字节大小格式化 */
export function fmtBytes(bytes: number, digits = 1): string {
  if (!bytes || bytes < 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(digits) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

/** 百分比（0-1 → 45%） */
export function fmtPct(ratio: number, digits = 0): string {
  return (ratio * 100).toFixed(digits) + '%'
}

/** 时间格式化 */
export function fmtTime(ts: number | string | Date, withSec = true): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  return withSec ? `${base}:${p(d.getSeconds())}` : base
}

/** 相对时间 */
export function fmtAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return Math.floor(diff / 86400000) + ' 天前'
}

/** 数字千分位 */
export function fmtNum(n: number): string {
  return n.toLocaleString('zh-CN')
}

/** 经纬度格式化 */
export function fmtLonLat(lon: number, lat: number): string {
  return `${lon.toFixed(3)}°E, ${lat.toFixed(3)}°N`
}
