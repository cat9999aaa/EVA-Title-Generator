import { getFormat } from '@/lib/config/formats'
import { alpha, getTheme } from '@/lib/config/themes'
import { getEvaFontFamily } from '@/lib/generator/font-loader'
import { getLayout, toCrisp } from '@/lib/generator/layout'
import {
  LABEL_MIN_SIZE,
  SUBTITLE_MIN_SIZE,
  TITLE_MIN_SIZE,
  fitSingleLine,
} from '@/lib/generator/measure-text'
import type { SvgBuildOptions } from '@/lib/generator/types'

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSvg(options: SvgBuildOptions): string {
  const format = getFormat(options.formatId)
  const theme = getTheme(options.themeId)
  const layout = getLayout(format)
  const font = getEvaFontFamily()
  const W = format.width
  const H = format.height
  const ei = layout.edgeInset
  const ci = layout.contentInset
  const contentWidth = W - ci * 2
  const rawTitle = options.content.title.replace(/\r?\n/g, ' ').trim()
  const title = rawTitle || '—'
  const subtitle = options.content.subtitle.replace(/\r?\n/g, ' ').trim()
  const mark = options.content.mark.replace(/\r?\n/g, ' ').trim()
  const titleSize = fitSingleLine(
    title,
    layout.titleFontSize,
    TITLE_MIN_SIZE,
    contentWidth,
    layout.titleLetterSpacing,
    '标题',
  )
  const spacingRatio = layout.titleFontSize > 0 ? layout.titleLetterSpacing / layout.titleFontSize : 0
  const titleTracking = spacingRatio * titleSize
  const hasSubtitle = Boolean(subtitle)
  const subtitleSize = hasSubtitle
    ? fitSingleLine(
        subtitle,
        Math.round(titleSize * 0.32),
        SUBTITLE_MIN_SIZE,
        contentWidth * 0.86,
        layout.subtitleLetterSpacing,
        '副标题',
      )
    : Math.round(titleSize * 0.32)
  const markSize = mark
    ? fitSingleLine(mark, Math.max(LABEL_MIN_SIZE, layout.cautionFontSize + 2), LABEL_MIN_SIZE, contentWidth * 0.7, 3, '标志')
    : layout.cautionFontSize
  const centerY = (layout.railTop + layout.railBottom) / 2
  const subtitleGap = hasSubtitle ? Math.round(subtitleSize * 1.65) : 0
  const blockHeight = titleSize + subtitleGap
  const titleY = centerY - blockHeight / 2 + titleSize * 0.78
  const subtitleY = titleY + subtitleGap
  const seriesY = (ei + layout.railTop) / 2
  const authorY = (layout.railBottom + H - ei) / 2
  const soft = alpha(theme.accent, 0.72)
  const faint = alpha(theme.accent, 0.18)
  const hair = alpha(theme.accent, 0.1)
  const outer = toCrisp(ei * 0.42)
  const cut = Math.round(Math.min(W, H) * 0.055)
  const embedded = options.embeddedFontCss ?? ''
  const background = options.backgroundUrl
    ? `<image href="${escapeXml(options.backgroundUrl)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" opacity="${(options.backgroundOpacity / 100).toFixed(2)}"/>`
    : ''
  const fullTitle = escapeXml(title)
  const series = [options.content.series, options.content.issue].filter(Boolean).join(' ／ ')
  const identity = [options.content.handle, options.content.site].filter(Boolean).join(' ／ ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dashen-title dashen-desc" shape-rendering="geometricPrecision">
<title id="dashen-title">${fullTitle}</title><desc id="dashen-desc">EVA标题封面。${escapeXml([options.content.series, options.content.issue, options.content.author].filter(Boolean).join('，'))}</desc>
<defs><clipPath id="dashen-cut"><polygon points="${outer},${outer} ${W - outer - cut},${outer} ${W - outer},${outer + cut} ${W - outer},${H - outer} ${outer},${H - outer}"/></clipPath><pattern id="dashen-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${hair}" stroke-width="1"/></pattern><style>${embedded}.title{font-family:'${font}','Noto Serif SC',serif;font-weight:800;fill:${theme.accent};text-anchor:middle}.label{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;fill:${theme.accent}}.minor{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600;fill:${soft}}</style></defs>
<rect width="${W}" height="${H}" fill="${theme.base}"/>${background}<rect x="${outer}" y="${outer}" width="${W - outer * 2}" height="${H - outer * 2}" fill="url(#dashen-grid)" opacity=".55" clip-path="url(#dashen-cut)"/>
<polygon points="${outer},${outer} ${W - outer - cut},${outer} ${W - outer},${outer + cut} ${W - outer},${H - outer} ${outer},${H - outer}" fill="none" stroke="${soft}" stroke-width="1.5"/>
<path d="M${outer} ${outer + cut * 2}V${outer}H${outer + cut * 2}M${W - outer - cut * 3} ${outer}H${W - outer - cut}L${W - outer} ${outer + cut}V${outer + cut * 2}M${outer} ${H - outer - cut * 2}V${H - outer}H${outer + cut * 2}M${W - outer - cut * 2} ${H - outer}H${W - outer}" fill="none" stroke="${theme.accent}" stroke-width="3"/>
<line x1="${ei}" y1="${layout.railTop}" x2="${W - ei}" y2="${layout.railTop}" stroke="${theme.accent}" stroke-width="1.5"/><line x1="${ei}" y1="${layout.railBottom}" x2="${W - ei}" y2="${layout.railBottom}" stroke="${theme.accent}" stroke-width="1.5"/>
<text x="${ci}" y="${seriesY}" dominant-baseline="central" class="label" font-size="${layout.labelFontSize}" letter-spacing="3">${escapeXml(series)}</text><text x="${W - ci}" y="${seriesY}" dominant-baseline="central" text-anchor="end" class="minor" font-size="${layout.labelFontSize}" letter-spacing="2">${escapeXml(options.content.date)}</text>
<text x="${W / 2}" y="${titleY}" class="title" font-size="${titleSize}" letter-spacing="${titleTracking}">${fullTitle}</text>${hasSubtitle ? `<text x="${W / 2}" y="${subtitleY}" class="minor" text-anchor="middle" font-size="${subtitleSize}" letter-spacing="${layout.subtitleLetterSpacing}">${escapeXml(subtitle)}</text>` : ''}
<text x="${ci}" y="${authorY}" dominant-baseline="central" class="label" font-size="${layout.labelFontSize}" letter-spacing="2">${escapeXml(options.content.author)}</text><text x="${W - ci}" y="${authorY}" dominant-baseline="central" text-anchor="end" class="minor" font-size="${layout.labelFontSize}" letter-spacing="1.4">${escapeXml(identity)}</text>
${mark ? `<text x="${W / 2}" y="${H - outer - layout.labelFontSize}" text-anchor="middle" class="minor" font-size="${markSize}" letter-spacing="3">${escapeXml(mark)}</text>` : ''}
</svg>`
}
