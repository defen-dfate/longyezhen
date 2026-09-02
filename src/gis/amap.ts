/* ============================================================
 * 高德地图（AMap）JS API 2.0 加载器
 * 坐标说明：本系统数据采用 WGS-84（普通经纬度），而高德使用 GCJ-02
 * （国测局加密坐标），直接绘制会有数百米偏移，因此投影时做 WGS-84→GCJ-02 转换。
 * ============================================================ */

/** 高德 Web端(JS API) Key（控制台需选「Web端(JS API)」类型） */
export const AMAP_KEY = 'f9c07e55a0fbc521031a1d2709e8a682'
/** 高德「安全密钥」(securityJsCode)。若加载失败，多半是 Key / 安全密钥 填反或类型不对 */
export const AMAP_SECURITY = 'longyezhen'

let loaderPromise: Promise<any> | null = null

/** 加载并返回全局 AMap 对象（同一会话只加载一次） */
export function loadAMap(): Promise<any> {
  const w = window as any
  if (w.AMap) return Promise.resolve(w.AMap)
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    // 安全密钥必须在脚本加载前设置
    w._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY }

    const s = document.createElement('script')
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
    s.async = true
    s.onload = () => (w.AMap ? resolve(w.AMap) : reject(new Error('AMap 已加载但全局对象缺失')))
    s.onerror = () => reject(new Error('高德地图脚本加载失败（检查网络 / 域名白名单 / Key）'))
    document.head.appendChild(s)
  })
  return loaderPromise
}

/* ---------------- 坐标转换 ---------------- */
export function wgs2gcj(lon: number, lat: number): [number, number] {
  const a = 6378245.0
  const ee = 0.00669342162296594323
  if (outOfChina(lon, lat)) return [lon, lat]
  let dLat = transformLat(lon - 105.0, lat - 35.0)
  let dLon = transformLon(lon - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI)
  dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [lon + dLon, lat + dLat]
}

export function gcj2wgs(lon: number, lat: number): [number, number] {
  const [gl, gt] = wgs2gcj(lon, lat)
  return [lon * 2 - gl, lat * 2 - gt]
}

function outOfChina(lon: number, lat: number) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271
}
function transformLat(x: number, y: number) {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0
  return ret
}
function transformLon(x: number, y: number) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0
  return ret
}
