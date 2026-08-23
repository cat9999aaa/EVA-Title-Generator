import { getFormat } from '@/lib/config/formats'
import { alpha, getTheme } from '@/lib/config/themes'
import { getEvaFontFamily } from '@/lib/generator/font-loader'
import { getLayout, splitTitle, toCrisp } from '@/lib/generator/layout'
import type { SvgBuildOptions } from '@/lib/generator/types'

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
}
function ticker(width:number):string{return 'DASHEN TITLE // 研究・判断・构建 // SYSTEM READY // '.repeat(Math.ceil(width/360)+2)}
function estimateWidth(text:string,size:number):number{return Array.from(text).reduce((sum,ch)=>sum+(/[\u3400-\u9fff\uf900-\ufaff]/u.test(ch)?size:/[A-Z]/.test(ch)?size*.73:/[a-z0-9]/.test(ch)?size*.58:ch===' '?size*.28:size*.5),0)}
function fit(text:string,size:number,max:number):number{const width=estimateWidth(text,size);return width>max?Math.floor(size*(max/width)*.96):size}

export function buildSvg(options:SvgBuildOptions):string{
 const format=getFormat(options.formatId),theme=getTheme(options.themeId),layout=getLayout(format),font=getEvaFontFamily()
 const W=format.width,H=format.height,ei=layout.edgeInset,ci=layout.contentInset,contentWidth=W-ci*2
 const rawTitle=options.content.title.trim()||'—'
 const lines=splitTitle(rawTitle,layout.maxLineUnits,Math.min(3,layout.maxTitleLines))
 const longest=lines.reduce((a,b)=>estimateWidth(a,layout.titleFontSize)>estimateWidth(b,layout.titleFontSize)?a:b,'')
 const linePenalty=lines.length===3?.78:lines.length===2?.9:1
 const titleSize=fit(longest,Math.round(layout.titleFontSize*linePenalty),contentWidth)
 const lineHeight=Math.round(titleSize*1.12)
 const subtitle=options.content.subtitle.trim(),hasSubtitle=Boolean(subtitle)
 const subtitleSize=hasSubtitle?fit(subtitle,Math.round(titleSize*.31),contentWidth*.86):Math.round(titleSize*.31)
 const centerY=(layout.railTop+layout.railBottom)/2
 const titleBlock=lines.length*lineHeight,subtitleGap=hasSubtitle?Math.round(subtitleSize*1.65):0
 const blockHeight=titleBlock+subtitleGap
 const firstY=centerY-blockHeight/2+titleSize*.78
 const subtitleY=firstY+(lines.length-1)*lineHeight+subtitleGap
 const seriesY=(ei+layout.railTop)/2,authorY=(layout.railBottom+H-ei)/2
 const soft=alpha(theme.accent,.72),faint=alpha(theme.accent,.18),hair=alpha(theme.accent,.1)
 const outer=toCrisp(ei*.42),cut=Math.round(Math.min(W,H)*.055)
 const embedded=options.embeddedFontCss??''
 const background=options.backgroundUrl?`<image href="${escapeXml(options.backgroundUrl)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" opacity="${(options.backgroundOpacity/100).toFixed(2)}"/>`:''
 const titleSpans=lines.map((line,index)=>`<tspan x="${W/2}" y="${firstY+index*lineHeight}">${escapeXml(line)}</tspan>`).join('')
 const fullTitle=escapeXml(rawTitle.replace(/\s+/g,' '))
 return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dashen-title dashen-desc" shape-rendering="geometricPrecision">
<title id="dashen-title">${fullTitle}</title><desc id="dashen-desc">大神UI标题封面。${escapeXml([options.content.series,options.content.issue,options.content.author].filter(Boolean).join('，'))}</desc>
<defs><clipPath id="dashen-cut"><polygon points="${outer},${outer} ${W-outer-cut},${outer} ${W-outer},${outer+cut} ${W-outer},${H-outer} ${outer},${H-outer}"/></clipPath><pattern id="dashen-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${hair}" stroke-width="1"/></pattern><style>${embedded}.title{font-family:'${font}','Noto Serif SC',serif;font-weight:800;fill:${theme.accent};text-anchor:middle}.label{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;fill:${theme.accent}}.minor{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600;fill:${soft}}.ticker{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;fill:${faint}}</style></defs>
<rect width="${W}" height="${H}" fill="${theme.base}"/>${background}<rect x="${outer}" y="${outer}" width="${W-outer*2}" height="${H-outer*2}" fill="url(#dashen-grid)" opacity=".55" clip-path="url(#dashen-cut)"/>
<polygon points="${outer},${outer} ${W-outer-cut},${outer} ${W-outer},${outer+cut} ${W-outer},${H-outer} ${outer},${H-outer}" fill="none" stroke="${soft}" stroke-width="1.5"/>
<path d="M${outer} ${outer+cut*2}V${outer}H${outer+cut*2}M${W-outer-cut*3} ${outer}H${W-outer-cut}L${W-outer} ${outer+cut}V${outer+cut*2}M${outer} ${H-outer-cut*2}V${H-outer}H${outer+cut*2}M${W-outer-cut*2} ${H-outer}H${W-outer}" fill="none" stroke="${theme.accent}" stroke-width="3"/>
<line x1="${ei}" y1="${layout.railTop}" x2="${W-ei}" y2="${layout.railTop}" stroke="${theme.accent}" stroke-width="1.5"/><line x1="${ei}" y1="${layout.railBottom}" x2="${W-ei}" y2="${layout.railBottom}" stroke="${theme.accent}" stroke-width="1.5"/>
<text x="${ci}" y="${layout.railTop+12}" class="ticker" font-size="${layout.cautionFontSize}" letter-spacing="2">${escapeXml(ticker(W))}</text><text x="${ci}" y="${layout.railBottom-8}" class="ticker" font-size="${layout.cautionFontSize}" letter-spacing="2">${escapeXml(ticker(W))}</text>
<text x="${ci}" y="${seriesY}" dominant-baseline="central" class="label" font-size="${layout.labelFontSize}" letter-spacing="3">${escapeXml([options.content.series,options.content.issue].filter(Boolean).join(' ／ '))}</text><text x="${W-ci}" y="${seriesY}" dominant-baseline="central" text-anchor="end" class="minor" font-size="${layout.labelFontSize}" letter-spacing="2">${escapeXml(options.content.date)}</text>
<text class="title" font-size="${titleSize}" letter-spacing="${layout.titleLetterSpacing}">${titleSpans}</text>${hasSubtitle?`<text x="${W/2}" y="${subtitleY}" class="minor" text-anchor="middle" font-size="${subtitleSize}" letter-spacing="${layout.subtitleLetterSpacing}">${escapeXml(subtitle)}</text>`:''}
<text x="${ci}" y="${authorY}" dominant-baseline="central" class="label" font-size="${layout.labelFontSize}" letter-spacing="2">${escapeXml(options.content.author)}</text><text x="${W-ci}" y="${authorY}" dominant-baseline="central" text-anchor="end" class="minor" font-size="${layout.labelFontSize}" letter-spacing="1.4">${escapeXml([options.content.handle,options.content.site].filter(Boolean).join(' ／ '))}</text>
<g aria-hidden="true"><rect x="${ci}" y="${centerY-2}" width="8" height="4" fill="${theme.accent}"/><rect x="${W-ci-8}" y="${centerY-2}" width="8" height="4" fill="${theme.accent}"/><text x="${W/2}" y="${H-outer-layout.labelFontSize}" text-anchor="middle" class="ticker" font-size="${layout.cautionFontSize}" letter-spacing="4">DASHEN TITLE ／ 研究・判断・构建</text></g>
</svg>`
}
