/* ============================================================
 * 图片压缩核心（与 Chrome 插件版同源，移植为 TS）
 * 策略：编码质量二分 + 画布等比降采样，逼近目标体积
 * ============================================================ */

const MAX_PIXELS = 40e6
const MIN_QUALITY = 0.05
const MAX_QUALITY = 0.95
const QUALITY_STEPS = 6
const MAX_ROUNDS = 6

export type OutputFormat = 'auto' | 'image/jpeg' | 'image/webp' | 'image/png'

export interface CompressOptions {
  /** 目标字节数 */
  targetBytes: number
  /** 输出格式 */
  format: OutputFormat
  /** 最大宽度，0 表示不限 */
  maxWidth?: number
  onProgress?: (p: number) => void
}

export interface CompressResult {
  id: string
  name: string
  mime: string
  originalSize: number
  size: number
  srcWidth: number
  srcHeight: number
  width: number
  height: number
  quality: number | null
  rounds: number
  steps: number
  reached: boolean
  passthrough: boolean
  blob: Blob | null
  error?: string
}

let webpSupport: boolean | null = null

export function supportsWebP(): boolean {
  if (webpSupport !== null) return webpSupport
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    webpSupport = c.toDataURL('image/webp').indexOf('data:image/webp') === 0
  } catch {
    webpSupport = false
  }
  return webpSupport
}

function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(
      () => createImageBitmap(file).catch(() => decodeViaImg(file))
    )
  }
  return decodeViaImg(file)
}

function decodeViaImg(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败，格式可能不受支持'))
    }
    img.src = url
  })
}

function drawTo(
  bitmap: ImageBitmap | HTMLImageElement,
  w: number,
  h: number,
  mime: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas
}

function encode(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

/** 二分查找：不超过目标体积的最高画质 */
async function searchQuality(canvas: HTMLCanvasElement, mime: string, target: number) {
  let lo = MIN_QUALITY
  let hi = MAX_QUALITY
  let best: { blob: Blob; quality: number } | null = null
  let smallest: { blob: Blob; quality: number } | null = null
  let steps = 0

  for (let i = 0; i < QUALITY_STEPS; i++) {
    const mid = (lo + hi) / 2
    const blob = await encode(canvas, mime, mid)
    steps++
    if (!blob) break
    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality: mid }
    if (blob.size <= target) {
      best = { blob, quality: mid }
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 0.02) break
  }
  return { best, smallest, steps }
}

function resolveMime(setting: OutputFormat, fileType: string, fileName: string): string {
  if (setting && setting !== 'auto') {
    return setting === 'image/webp' && !supportsWebP() ? 'image/jpeg' : setting
  }
  const t = (fileType || '').toLowerCase().split(';')[0].trim()
  if (t === 'image/jpeg') return 'image/jpeg'
  if (t === 'image/webp') return 'image/webp'
  if (t === 'image/png') return supportsWebP() ? 'image/webp' : 'image/jpeg'
  if (/\.(png|webp|gif|bmp)$/i.test(fileName)) {
    return supportsWebP() ? 'image/webp' : 'image/jpeg'
  }
  return 'image/jpeg'
}

export function renameExt(name: string, mime: string): string {
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
  const base = name.replace(/\.[^.\\/]+$/, '') || 'image'
  return `${base}.${ext}`
}

export async function compressImage(file: File, opts: CompressOptions): Promise<CompressResult> {
  const target = Math.max(1024, Math.floor(opts.targetBytes || 0))
  const maxWidth = opts.maxWidth || 0
  const onProgress = opts.onProgress || (() => {})

  const mime = resolveMime(opts.format, file.type, file.name)
  const tunable = mime === 'image/jpeg' || mime === 'image/webp'

  const bitmap = await decode(file)
  const srcW = bitmap.width
  const srcH = bitmap.height

  let baseScale = 1
  if (maxWidth > 0 && srcW > maxWidth) baseScale = maxWidth / srcW
  if (srcW * srcH * baseScale * baseScale > MAX_PIXELS) {
    baseScale = Math.min(baseScale, Math.sqrt(MAX_PIXELS / (srcW * srcH)))
  }
  const baseW = Math.max(1, Math.round(srcW * baseScale))
  const baseH = Math.max(1, Math.round(srcH * baseScale))

  const result: CompressResult = {
    id: Math.random().toString(36).slice(2),
    name: renameExt(file.name, mime),
    mime,
    originalSize: file.size,
    size: 0,
    srcWidth: srcW,
    srcHeight: srcH,
    width: 0,
    height: 0,
    quality: null,
    rounds: 0,
    steps: 0,
    reached: false,
    passthrough: false,
    blob: null
  }

  const originMime = (file.type || '').toLowerCase().split(';')[0].trim()
  if (file.size <= target && mime === originMime && baseW === srcW && baseH === srcH) {
    result.blob = file
    result.size = file.size
    result.width = srcW
    result.height = srcH
    result.reached = true
    result.passthrough = true
    onProgress(1)
    return result
  }

  let scale = 1
  type Chosen = { blob: Blob; quality: number | null; width: number; height: number; reached?: boolean }
  let fallback: Chosen | null = null
  let chosen: Chosen | null = null

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const w = Math.max(1, Math.round(baseW * scale))
    const h = Math.max(1, Math.round(baseH * scale))
    const canvas = drawTo(bitmap, w, h, mime)
    result.rounds = round + 1
    onProgress(Math.min(0.9, (round + 1) / (MAX_ROUNDS + 1)))

    let blob: Blob | null = null
    let quality: number | null = null
    let smallest: { blob: Blob; quality: number | null } | null = null

    if (tunable) {
      const r = await searchQuality(canvas, mime, target)
      result.steps += r.steps
      if (r.best) {
        blob = r.best.blob
        quality = r.best.quality
      }
      smallest = r.smallest ? { blob: r.smallest.blob, quality: r.smallest.quality } : null
    } else {
      blob = await encode(canvas, mime)
      result.steps += 1
      smallest = blob ? { blob, quality: null } : null
    }

    const candidate = blob || smallest?.blob || null
    if (candidate && (!fallback || candidate.size < fallback.blob.size)) {
      fallback = { blob: candidate, quality, width: w, height: h }
    }

    if (blob && blob.size <= target) {
      chosen = { blob, quality, width: w, height: h, reached: true }
      break
    }

    const refSize = blob?.size || smallest?.blob.size || 0
    if (!refSize) break
    let next = scale * Math.max(0.3, Math.min(0.9, Math.sqrt(target / refSize) * 0.95))
    if (next >= scale * 0.995) next = scale * 0.85
    scale = Math.max(0.04, next)
    if (scale <= 0.05) break
  }

  if (!chosen) chosen = fallback
  if (!chosen) {
    result.error = '压缩失败，无法生成有效图片'
    return result
  }

  result.blob = chosen.blob
  result.size = chosen.blob.size
  result.width = chosen.width
  result.height = chosen.height
  result.quality = chosen.quality
  result.reached = !!chosen.reached
  onProgress(1)
  return result
}
