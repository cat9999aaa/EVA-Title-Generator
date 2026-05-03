import { getFormat } from '@/lib/config/formats'
import { alpha, getTheme } from '@/lib/config/themes'
import { getEvaFontFamily } from '@/lib/generator/font-loader'
import { getLayout, toCrisp } from '@/lib/generator/layout'
import type { SvgBuildOptions } from '@/lib/generator/types'

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cautionText(width: number): string {
  const base = 'AT FIELD // CAUTION // EVA TITLE GENERATOR // SYSTEM READY // '
  return base.repeat(Math.ceil(width / 320) + 2)
}

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/u

function estimateWidth(text: string, fontSize: number): number {
  return Array.from(text).reduce((sum, ch) => {
    if (CJK.test(ch)) return sum + fontSize
    if (/[A-Z]/.test(ch)) return sum + fontSize * 0.73
    if (/[a-z0-9]/.test(ch)) return sum + fontSize * 0.58
    if (ch === ' ') return sum + fontSize * 0.28
    return sum + fontSize * 0.5
  }, 0)
}

function fitFontSize(text: string, baseSize: number, maxWidth: number): number {
  const est = estimateWidth(text, baseSize)
  return est > maxWidth ? Math.floor(baseSize * (maxWidth / est) * 0.96) : baseSize
}

/** SVG path for a simplified NERV-style fig leaf centered at (0,0) with given radius */
function nervLeafPath(r: number): string {
  // Two overlapping leaf lobes forming the NERV fig-leaf silhouette
  const lx = r * 0.72, ly0 = r * 0.88, ly1 = r * 0.38, ty = r * 0.76
  return [
    // Left lobe
    `M0,${-r * 0.15}`,
    `C${-lx},${-ty} ${-lx},${ly1} ${-lx * 0.55},${ly0}`,
    `C${-lx * 0.25},${r} 0,${r * 0.9} 0,${r * 0.9}`,
    // Right lobe (mirror)
    `C0,${r * 0.9} ${lx * 0.25},${r} ${lx * 0.55},${ly0}`,
    `C${lx},${ly1} ${lx},${-ty} 0,${-r * 0.15}Z`,
  ].join(' ')
}

export function buildSvg(options: SvgBuildOptions): string {
  const format = getFormat(options.formatId)
  const theme = getTheme(options.themeId)
  const layout = getLayout(format)
  const fontFamily = getEvaFontFamily()

  // Define dimension shorthands first — used throughout
  const W  = format.width
  const H  = format.height
  const ei = layout.edgeInset
  const ci = layout.contentInset

  const titleText = options.content.title.replace(/\r?\n+/g, ' ').trim() || '—'
  const subtitleText = options.content.subtitle.trim()
  const hasSubtitle = subtitleText.length > 0

  const contentWidth = W - ci * 2

  const titleFontSize = fitFontSize(titleText, layout.titleFontSize, contentWidth)
  // Subtitle base = 32% of fitted title size (1:3 headline hierarchy, Bringhurst §4.2)
  const subtitleBase = Math.round(titleFontSize * 0.32)
  const subtitleFontSize = hasSubtitle
    ? fitFontSize(subtitleText, subtitleBase, contentWidth * 0.86)
    : subtitleBase

  // ── Vertical centering (cap-height geometry, tight subtitle grouping) ──
  // "Block" = from title cap-top to subtitle descender-bottom
  const titleCapH  = titleFontSize * 0.72
  const subGap     = hasSubtitle ? Math.round(subtitleFontSize * 2.1) : 0   // title-baseline → subtitle-baseline
  const bottomExt  = hasSubtitle
    ? subGap + subtitleFontSize * 0.28
    : titleFontSize * 0.22
  const blockH     = titleCapH + bottomExt

  const centerY     = (layout.railTop + layout.railBottom) / 2
  const titleStartY = centerY - blockH / 2 + titleCapH
  const subtitleY   = titleStartY + subGap

  // ── Label Y: exact zone centre — dominant-baseline="central" on each element ──
  // Top label zone  : [edgeInset … railTop]
  // Bottom label zone: [railBottom … H−edgeInset]
  // Ticker strips   : [railTop … railTop+22]  /  [railBottom−22 … railBottom]
  const seriesCenterY  = (ei + layout.railTop) / 2
  const authorCenterY  = (layout.railBottom + H - ei) / 2
  const tickerTopY     = layout.railTop + 11   // centre of 22 px inner-grid strip
  const tickerBottomY  = layout.railBottom - 11

  // ── Color aliases ─────────────────────────────────────────────────────
  const accentSoft   = alpha(theme.accent, 0.72)
  const accentMid    = alpha(theme.accent, 0.38)
  const accentFaint  = alpha(theme.accent, 0.18)
  const accentHair   = alpha(theme.accent, 0.09)
  const accentStripe = alpha(theme.accent, 0.055)

  const outerInset = toCrisp(ei * 0.42)

  // Corner bracket arm length — scales with image size
  const bk = Math.round(Math.min(W, H) * 0.13)

  const backgroundEl = options.backgroundUrl
    ? `<image href="${escapeXml(options.backgroundUrl)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" opacity="${(options.backgroundOpacity / 100).toFixed(2)}"/>`
    : ''
  const embeddedFontCss = options.embeddedFontCss ?? ''

  // ── NERV watermark emblem (center of content zone, very faint) ────────
  const emblR   = Math.round(Math.min(W, H) * 0.11)
  const emblX   = W / 2
  const emblY   = centerY
  const nervWatermark = `
  <g transform="translate(${emblX},${emblY})" opacity="0.055" aria-hidden="true">
    <circle r="${emblR}" stroke="${theme.accent}" stroke-width="${Math.max(1, emblR * 0.04)}" fill="none"/>
    <circle r="${emblR * 0.78}" stroke="${theme.accent}" stroke-width="${Math.max(0.5, emblR * 0.02)}" fill="none" stroke-dasharray="4 3"/>
    <path d="${nervLeafPath(emblR * 0.68)}" stroke="${theme.accent}" stroke-width="${Math.max(0.7, emblR * 0.025)}" fill="${theme.accent}" fill-opacity="0.4"/>
    <text y="${emblR * 1.22}" text-anchor="middle" font-family="'Inter','Segoe UI',system-ui,sans-serif" font-size="${Math.max(8, emblR * 0.22)}" font-weight="900" letter-spacing="${Math.max(3, emblR * 0.15)}" fill="${theme.accent}">NERV</text>
  </g>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" overflow="hidden" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="EVA title preview" shape-rendering="geometricPrecision">
  <defs>
    <filter id="evaGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="subGlow" x="-12%" y="-25%" width="124%" height="150%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="inner-clip">
      <rect x="${ei}" y="${ei}" width="${W - ei * 2}" height="${H - ei * 2}"/>
    </clipPath>
    <!-- Diagonal hazard stripe pattern -->
    <pattern id="haz" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="7" height="14" fill="${accentStripe}"/>
    </pattern>
    <!-- Corner stripe clip regions -->
    <clipPath id="ctlc"><polygon points="${outerInset},${outerInset} ${outerInset + bk},${outerInset} ${outerInset},${outerInset + bk}"/></clipPath>
    <clipPath id="ctrc"><polygon points="${W - outerInset},${outerInset} ${W - outerInset - bk},${outerInset} ${W - outerInset},${outerInset + bk}"/></clipPath>
    <clipPath id="cblc"><polygon points="${outerInset},${H - outerInset} ${outerInset + bk},${H - outerInset} ${outerInset},${H - outerInset - bk}"/></clipPath>
    <clipPath id="cbrc"><polygon points="${W - outerInset},${H - outerInset} ${W - outerInset - bk},${H - outerInset} ${W - outerInset},${H - outerInset - bk}"/></clipPath>
    <style>
      ${embeddedFontCss}
      .title{font-family:'${fontFamily}','Source Han Serif SC','Noto Serif SC',serif;font-weight:700;fill:${theme.accent};text-anchor:middle;dominant-baseline:alphabetic;}
      .sub{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-weight:600;fill:${accentSoft};text-anchor:middle;}
      .label{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-weight:700;fill:${theme.accent};}
      .minor{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-weight:600;fill:${accentSoft};}
      .ticker{font-family:'Inter','Segoe UI',system-ui,sans-serif;font-weight:700;fill:${accentFaint};}
      .grid{stroke:${accentHair};stroke-width:1;}
      .rail{stroke:${theme.accent};stroke-opacity:0.78;stroke-width:1.4;}
      .frame{stroke:${accentSoft};stroke-width:1.4;}
      .outline{stroke:${accentFaint};stroke-width:0.8;}
      .brace{stroke:${theme.accent};stroke-opacity:0.92;stroke-width:2;fill:none;}
      .brace-sq{stroke:${accentMid};stroke-width:1;fill:none;}
    </style>
  </defs>

  <!-- Base fill -->
  <rect width="${W}" height="${H}" fill="${theme.base}"/>
  ${backgroundEl}

  <!-- Hazard stripe corner fills (triangular) -->
  <rect x="${outerInset}" y="${outerInset}" width="${W - outerInset * 2}" height="${H - outerInset * 2}" fill="url(#haz)" clip-path="url(#ctlc)"/>
  <rect x="${outerInset}" y="${outerInset}" width="${W - outerInset * 2}" height="${H - outerInset * 2}" fill="url(#haz)" clip-path="url(#ctrc)"/>
  <rect x="${outerInset}" y="${outerInset}" width="${W - outerInset * 2}" height="${H - outerInset * 2}" fill="url(#haz)" clip-path="url(#cblc)"/>
  <rect x="${outerInset}" y="${outerInset}" width="${W - outerInset * 2}" height="${H - outerInset * 2}" fill="url(#haz)" clip-path="url(#cbrc)"/>

  <!-- Outer thin border -->
  <rect x="${outerInset}" y="${outerInset}" width="${W - outerInset * 2}" height="${H - outerInset * 2}" class="outline"/>

  <!-- Outer heavy corner marks -->
  <path d="M${outerInset} ${outerInset + bk * 0.45}V${outerInset}H${outerInset + bk * 0.45}" stroke="${accentSoft}" stroke-width="2.4" fill="none"/>
  <path d="M${W - outerInset - bk * 0.45} ${outerInset}H${W - outerInset}V${outerInset + bk * 0.45}" stroke="${accentSoft}" stroke-width="2.4" fill="none"/>
  <path d="M${outerInset} ${H - outerInset - bk * 0.45}V${H - outerInset}H${outerInset + bk * 0.45}" stroke="${accentSoft}" stroke-width="2.4" fill="none"/>
  <path d="M${W - outerInset - bk * 0.45} ${H - outerInset}H${W - outerInset}V${H - outerInset - bk * 0.45}" stroke="${accentSoft}" stroke-width="2.4" fill="none"/>

  <!-- Main inner frame -->
  <rect x="${ei}" y="${ei}" width="${W - ei * 2}" height="${H - ei * 2}" class="frame"/>

  <!-- Rail lines -->
  <line x1="${ei}" y1="${layout.railTop}" x2="${W - ei}" y2="${layout.railTop}" class="rail"/>
  <line x1="${ei}" y1="${layout.railBottom}" x2="${W - ei}" y2="${layout.railBottom}" class="rail"/>

  <!-- Rail end tick marks -->
  <line x1="${ei}" y1="${layout.railTop - 6}" x2="${ei}" y2="${layout.railTop + 6}" stroke="${theme.accent}" stroke-width="3" opacity="0.85"/>
  <line x1="${W - ei}" y1="${layout.railTop - 6}" x2="${W - ei}" y2="${layout.railTop + 6}" stroke="${theme.accent}" stroke-width="3" opacity="0.85"/>
  <line x1="${ei}" y1="${layout.railBottom - 6}" x2="${ei}" y2="${layout.railBottom + 6}" stroke="${theme.accent}" stroke-width="3" opacity="0.85"/>
  <line x1="${W - ei}" y1="${layout.railBottom - 6}" x2="${W - ei}" y2="${layout.railBottom + 6}" stroke="${theme.accent}" stroke-width="3" opacity="0.85"/>

  <!-- Inner secondary grid lines -->
  <line x1="${ci}" y1="${layout.railTop + 22}" x2="${W - ci}" y2="${layout.railTop + 22}" class="grid"/>
  <line x1="${ci}" y1="${layout.railBottom - 22}" x2="${W - ci}" y2="${layout.railBottom - 22}" class="grid"/>

  <!-- Inner corner braces (at rail intersections with frame) -->
  <!-- TL brace -->
  <path d="M${ei} ${layout.railTop + bk * 0.62}V${layout.railTop}H${ei + bk * 0.62}" class="brace"/>
  <rect x="${ei + 5}" y="${layout.railTop + 5}" width="8" height="8" class="brace-sq"/>
  <!-- TR brace -->
  <path d="M${W - ei - bk * 0.62} ${layout.railTop}H${W - ei}V${layout.railTop + bk * 0.62}" class="brace"/>
  <rect x="${W - ei - 13}" y="${layout.railTop + 5}" width="8" height="8" class="brace-sq"/>
  <!-- BL brace -->
  <path d="M${ei} ${layout.railBottom - bk * 0.62}V${layout.railBottom}H${ei + bk * 0.62}" class="brace"/>
  <rect x="${ei + 5}" y="${layout.railBottom - 13}" width="8" height="8" class="brace-sq"/>
  <!-- BR brace -->
  <path d="M${W - ei - bk * 0.62} ${layout.railBottom}H${W - ei}V${layout.railBottom - bk * 0.62}" class="brace"/>
  <rect x="${W - ei - 13}" y="${layout.railBottom - 13}" width="8" height="8" class="brace-sq"/>

  <!-- NERV watermark (centered in title zone, behind content) -->
  ${nervWatermark}

  <!-- All text content (clipped to inner frame) -->
  <g clip-path="url(#inner-clip)">
    <!-- Caution tickers: centred in their 22px strip via dominant-baseline="central" -->
    <text x="${ci}" y="${tickerTopY}" dominant-baseline="central" class="ticker" font-size="${layout.cautionFontSize}" letter-spacing="1.8" textLength="${W - ei * 2}" lengthAdjust="spacingAndGlyphs">${escapeXml(cautionText(W))}</text>
    <text x="${ci}" y="${tickerBottomY}" dominant-baseline="central" class="ticker" font-size="${layout.cautionFontSize}" letter-spacing="1.8" textLength="${W - ei * 2}" lengthAdjust="spacingAndGlyphs">${escapeXml(cautionText(W))}</text>

    <!-- Series // Issue  ·  Date: centred in top label zone [edgeInset → railTop] -->
    <text x="${ci}" y="${seriesCenterY}" dominant-baseline="central" class="label" font-size="${layout.labelFontSize}" letter-spacing="3">${escapeXml([options.content.series, options.content.issue].filter(Boolean).join('  //  '))}</text>
    <text x="${W - ci}" y="${seriesCenterY}" dominant-baseline="central" class="minor" font-size="${layout.labelFontSize}" text-anchor="end" letter-spacing="2.2">${escapeXml(options.content.date)}</text>

    <!-- Main title (cap-height block centred between rails) -->
    <text x="${W / 2}" y="${titleStartY}" class="title" font-size="${titleFontSize}" letter-spacing="${layout.titleLetterSpacing}" filter="url(#evaGlow)">${escapeXml(titleText)}</text>

    <!-- Subtitle (tight below title, part of same block) -->
    ${hasSubtitle ? `<text x="${W / 2}" y="${subtitleY}" class="sub" font-size="${subtitleFontSize}" letter-spacing="${layout.subtitleLetterSpacing}" filter="url(#subGlow)">${escapeXml(subtitleText)}</text>` : ''}

    <!-- Author  ·  Handle // Site: centred in bottom label zone [railBottom → H−edgeInset] -->
    <text x="${ci}" y="${authorCenterY}" dominant-baseline="central" class="label" font-size="${layout.labelFontSize}" letter-spacing="2.2">${escapeXml(options.content.author)}</text>
    <text x="${W - ci}" y="${authorCenterY}" dominant-baseline="central" class="minor" font-size="${layout.labelFontSize}" text-anchor="end" letter-spacing="1.4">${escapeXml([options.content.handle, options.content.site].filter(Boolean).join('  //  '))}</text>
  </g>
</svg>`
}
