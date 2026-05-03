export type FormatId = 'x52' | 'f169' | 'f219' | 'f43' | 'f11' | 'wechat'

export interface FormatOption {
  id: FormatId
  width: number
  height: number
  ratio: string
}

export const formatOptions: FormatOption[] = [
  { id: 'x52', width: 1500, height: 600, ratio: '5:2' },
  { id: 'f169', width: 1920, height: 1080, ratio: '16:9' },
  { id: 'f219', width: 2520, height: 1080, ratio: '21:9' },
  { id: 'f43', width: 1200, height: 900, ratio: '4:3' },
  { id: 'f11', width: 1080, height: 1080, ratio: '1:1' },
  { id: 'wechat', width: 900, height: 383, ratio: '2.35:1' },
]

export const formatMap = Object.fromEntries(
  formatOptions.map((format) => [format.id, format]),
) as Record<FormatId, FormatOption>

export function getFormat(formatId: FormatId): FormatOption {
  return formatMap[formatId]
}
