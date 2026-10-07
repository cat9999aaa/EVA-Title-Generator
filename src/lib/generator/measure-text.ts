export class TextDoesNotFitError extends Error {
  readonly field: string
  readonly code = 'TEXT_DOES_NOT_FIT'

  constructor(field: string, message: string) {
    super(message)
    this.name = 'TextDoesNotFitError'
    this.field = field
  }
}

export const TITLE_MIN_SIZE = 24
export const SUBTITLE_MIN_SIZE = 14
export const LABEL_MIN_SIZE = 12

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u

export function estimateWidth(text: string, size: number, letterSpacing = 0): number {
  const chars = Array.from(text)
  if (chars.length === 0) {
    return 0
  }
  const advance = chars.reduce((sum, ch) => {
    if (ch === ' ') {
      return sum + size * 0.28
    }
    if (CJK_RE.test(ch)) {
      return sum + size * 1.08
    }
    if (/[A-Z]/.test(ch)) {
      return sum + size * 0.78
    }
    if (/[a-z0-9]/.test(ch)) {
      return sum + size * 0.64
    }
    return sum + size * 0.62
  }, 0)
  return advance + Math.max(0, chars.length - 1) * letterSpacing
}

export function fitSingleLine(
  text: string,
  maxSize: number,
  minSize: number,
  maxWidth: number,
  letterSpacingAtMax: number,
  field: string,
): number {
  const value = text.trim()
  if (value === '') {
    return maxSize
  }
  if (/[\r\n]/.test(text)) {
    throw new TextDoesNotFitError(field, `${field}必须是单行。`)
  }
  const floor = Math.min(minSize, maxSize)
  const spacingRatio = maxSize > 0 ? letterSpacingAtMax / maxSize : 0
  let lo = floor
  let hi = Math.max(maxSize, floor)
  let best = floor
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const width = estimateWidth(value, mid, spacingRatio * mid)
    if (width <= maxWidth) {
      best = mid
      lo = mid
    } else {
      hi = mid
    }
  }
  const finalWidth = estimateWidth(value, best, spacingRatio * best)
  if (finalWidth > maxWidth + 1) {
    throw new TextDoesNotFitError(field, `${field}过长，单行无法放入封面安全区。`)
  }
  return best
}

export function displayDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}.${month}.${day}`
}

export const LEGACY_SAMPLE_DATE = '2026.05.03'
