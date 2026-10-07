export type FormatId = 'x52' | 'f169' | 'f219' | 'f43' | 'f11' | 'wechat' | 'article' | 'square' | 'promo'

export interface FormatOption {
  id: FormatId
  width: number
  height: number
  ratio: string
  defaultScale: 1 | 2
}

export const formatOptions: FormatOption[] = [
  { id: 'article', width: 1200, height: 675, ratio: '16:9', defaultScale: 1 },
  { id: 'square', width: 1200, height: 1200, ratio: '1:1', defaultScale: 1 },
  { id: 'promo', width: 1280, height: 320, ratio: '4:1', defaultScale: 1 },
  { id: 'x52', width: 1500, height: 600, ratio: '5:2', defaultScale: 2 },
  { id: 'f169', width: 1920, height: 1080, ratio: '16:9', defaultScale: 2 },
  { id: 'f219', width: 2520, height: 1080, ratio: '21:9', defaultScale: 2 },
  { id: 'f43', width: 1200, height: 900, ratio: '4:3', defaultScale: 2 },
  { id: 'f11', width: 1080, height: 1080, ratio: '1:1', defaultScale: 2 },
  { id: 'wechat', width: 900, height: 383, ratio: '2.35:1', defaultScale: 2 },
]

export const formatMap = Object.fromEntries(
  formatOptions.map((format) => [format.id, format]),
) as Record<FormatId, FormatOption>

export function getFormat(formatId: FormatId): FormatOption {
  return formatMap[formatId]
}

export function pngPixels(format: FormatOption, scale: number): { width: number; height: number } {
  const safe = scale === 2 ? 2 : 1
  return { width: format.width * safe, height: format.height * safe }
}
