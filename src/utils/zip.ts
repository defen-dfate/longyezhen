/* ============================================================
 * 极简 ZIP 打包（store 模式，不二次压缩）
 * ============================================================ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosStamp(d: Date) {
  return {
    time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
    date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
  }
}

export interface ZipEntry {
  name: string
  blob: Blob
}

export async function packZip(files: ZipEntry[]): Promise<Blob> {
  const stamp = dosStamp(new Date())
  const encoder = new TextEncoder()

  const entries = []
  for (const item of files) {
    const data = new Uint8Array(await item.blob.arrayBuffer())
    entries.push({ name: encoder.encode(item.name), data, crc: crc32(data), offset: 0 })
  }

  let total = 0
  for (const e of entries) total += 30 + e.name.length + e.data.length
  const centralSize = entries.reduce((s, e) => s + 46 + e.name.length, 0)
  const centralOffset = total

  const out = new Uint8Array(total + centralSize + 22)
  const view = new DataView(out.buffer)
  let p = 0

  for (const e of entries) {
    e.offset = p
    view.setUint32(p, 0x04034b50, true); p += 4
    view.setUint16(p, 20, true); p += 2
    view.setUint16(p, 0x0800, true); p += 2 // UTF-8 文件名
    view.setUint16(p, 0, true); p += 2 // store
    view.setUint16(p, stamp.time, true); p += 2
    view.setUint16(p, stamp.date, true); p += 2
    view.setUint32(p, e.crc, true); p += 4
    view.setUint32(p, e.data.length, true); p += 4
    view.setUint32(p, e.data.length, true); p += 4
    view.setUint16(p, e.name.length, true); p += 2
    view.setUint16(p, 0, true); p += 2
    out.set(e.name, p); p += e.name.length
    out.set(e.data, p); p += e.data.length
  }

  for (const e of entries) {
    view.setUint32(p, 0x02014b50, true); p += 4
    view.setUint16(p, 20, true); p += 2
    view.setUint16(p, 20, true); p += 2
    view.setUint16(p, 0x0800, true); p += 2
    view.setUint16(p, 0, true); p += 2
    view.setUint16(p, stamp.time, true); p += 2
    view.setUint16(p, stamp.date, true); p += 2
    view.setUint32(p, e.crc, true); p += 4
    view.setUint32(p, e.data.length, true); p += 4
    view.setUint32(p, e.data.length, true); p += 4
    view.setUint16(p, e.name.length, true); p += 2
    view.setUint16(p, 0, true); p += 2
    view.setUint16(p, 0, true); p += 2
    view.setUint16(p, 0, true); p += 2
    view.setUint16(p, 0, true); p += 2
    view.setUint32(p, 0, true); p += 4
    view.setUint32(p, e.offset, true); p += 4
    out.set(e.name, p); p += e.name.length
  }

  view.setUint32(p, 0x06054b50, true); p += 4
  view.setUint16(p, 0, true); p += 2
  view.setUint16(p, 0, true); p += 2
  view.setUint16(p, entries.length, true); p += 2
  view.setUint16(p, entries.length, true); p += 2
  view.setUint32(p, centralSize, true); p += 4
  view.setUint32(p, centralOffset, true); p += 4
  view.setUint16(p, 0, true); p += 2

  return new Blob([out], { type: 'application/zip' })
}

/** 触发浏览器下载 */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 20000)
}
