import type { FormatOption } from '@/lib/config/formats'

export interface SvgLayout {
  width: number
  height: number
  edgeInset: number
  contentInset: number
  railTop: number
  railBottom: number
  titleFontSize: number
  subtitleFontSize: number
  labelFontSize: number
  cautionFontSize: number
  titleLineHeight: number
  titleLetterSpacing: number
  subtitleLetterSpacing: number
  maxTitleLines: number
  maxLineUnits: number
}

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u

function crisp(value: number): number {
  return Math.round(value) + 0.5
}

function tokenUnits(token: string): number {
  return Array.from(token).reduce((total, char) => {
    if (char === ' ') {
      return total + 0.34
    }

    if (CJK_RE.test(char)) {
      return total + 1
    }

    if (/[A-Z]/.test(char)) {
      return total + 0.78
    }

    if (/[a-z0-9]/.test(char)) {
      return total + 0.64
    }

    return total + 0.52
  }, 0)
}

function tokenize(paragraph: string): string[] {
  return paragraph.match(/[\u3400-\u9fff\uf900-\ufaff]|[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)*|\s+|./gu) ?? []
}

function breakLongToken(token: string, maxUnits: number): string[] {
  const chars = Array.from(token)
  const pieces: string[] = []
  let current = ''
  let units = 0

  for (const char of chars) {
    const nextUnits = units + tokenUnits(char)
    if (current && nextUnits > maxUnits) {
      pieces.push(current)
      current = char
      units = tokenUnits(char)
      continue
    }

    current += char
    units = nextUnits
  }

  if (current) {
    pieces.push(current)
  }

  return pieces
}

export function splitTitle(title: string, maxUnits: number, maxLines: number): string[] {
  const paragraphs = title.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
  const lines: string[] = []

  if (!paragraphs.length) {
    return ['']
  }

  for (const paragraph of paragraphs) {
    const tokens = tokenize(paragraph)
    let current = ''
    let currentUnits = 0

    for (const token of tokens) {
      if (!token.trim()) {
        if (current && !current.endsWith(' ')) {
          current += ' '
        }
        continue
      }

      const pieces = tokenUnits(token) > maxUnits ? breakLongToken(token, maxUnits) : [token]

      for (const piece of pieces) {
        const pieceUnits = tokenUnits(piece)
        const joiner = current && !current.endsWith(' ') && /^[A-Za-z0-9]/.test(piece) ? ' ' : ''
        const nextUnits = currentUnits + tokenUnits(joiner) + pieceUnits

        if (current && nextUnits > maxUnits) {
          lines.push(current.trim())
          current = piece
          currentUnits = pieceUnits
        } else {
          current += `${joiner}${piece}`
          currentUnits = nextUnits
        }
      }
    }

    if (current.trim()) {
      lines.push(current.trim())
    }
  }

  return lines.slice(0, maxLines)
}

export function getLayout(format: FormatOption): SvgLayout {
  const ar        = format.width / format.height
  const wide      = ar >= 2
  const extraWide = ar >= 2.2
  const compact   = format.height < 500

  const edgeInset    = crisp(format.width * (extraWide ? 0.038 : 0.05))
  // Increased side margin: 5% of width gives breathing room between text and frame
  const contentInset = crisp(edgeInset + format.width * 0.05)

  // Rail lines: label zone = ~15% top + 15% bottom; title zone = 70% centre
  const railTop    = crisp(format.height * (compact ? 0.158 : 0.148))
  const railBottom = crisp(format.height * (compact ? 0.842 : 0.852))

  // ── Title font size: height-based proportion (research: Bringhurst, Müller-Brockmann)
  // Headline = 13–16% of image height for standard covers; 22–23% for compact banners.
  // Same height → same base size regardless of width (21:9 ≠ smaller than 16:9).
  const titleFontSize = Math.round(
    compact            ? format.height * 0.228  // wechat 383 → 87  (compact banner)
    : extraWide        ? format.height * 0.148  // 5:2   600 → 89  | 21:9 1080 → 160
    : format.height >= 960 ? format.height * 0.136  // 16:9  1080 → 147
    : format.height * 0.128                     // 4:3   900  → 115
  )

  return {
    width: format.width,
    height: format.height,
    edgeInset,
    contentInset,
    railTop,
    railBottom,
    titleFontSize,
    // Subtitle: 32% of title — classical editorial 1:3 headline:subhead hierarchy
    subtitleFontSize: Math.round(titleFontSize * 0.32),
    // Label: 18.5% of title — clearly subordinate, still legible
    labelFontSize: Math.max(16, Math.round(titleFontSize * 0.185)),
    // Caution ticker: 11% — technical readout feel, never competes with content
    cautionFontSize: Math.max(12, Math.round(titleFontSize * 0.11)),
    titleLineHeight: Math.round(titleFontSize * 1.18),
    titleLetterSpacing: titleFontSize >= 140 ? 6 : titleFontSize >= 100 ? 4 : 3,
    subtitleLetterSpacing: 3,
    maxTitleLines: compact ? 3 : 4,
    maxLineUnits: compact ? 13 : extraWide ? 18 : wide ? 16 : 15,
  }
}

export function toCrisp(value: number): number {
  return crisp(value)
}
