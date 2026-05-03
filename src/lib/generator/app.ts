import { formatMap } from '@/lib/config/formats'
import { themeMap } from '@/lib/config/themes'
import { initAmbientGrid } from '@/lib/generator/ambient'
import { buildSvg } from '@/lib/generator/build-svg'
import { downloadSvg, buildFileName } from '@/lib/generator/export-svg'
import { exportPng } from '@/lib/generator/export-png'
import { getEmbeddedEvaFontCss, loadEvaFont } from '@/lib/generator/font-loader'
import { createDefaultState, loadState, persistState } from '@/lib/generator/state'
import type { GeneratorCopy, GeneratorState } from '@/lib/generator/types'

function query<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector)
  if (!el) throw new Error(`Missing: ${selector}`)
  return el
}

function safeFileStem(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'eva-title'
}

function setPressedState(elements: NodeListOf<HTMLButtonElement>, activeId: string, key: string): void {
  elements.forEach((btn) => {
    const sel = btn.dataset[key] === activeId
    btn.dataset.selected = String(sel)
    btn.setAttribute('aria-pressed', String(sel))
  })
}

export function initGeneratorApp(root: HTMLElement): void {
  const copyEl = query<HTMLScriptElement>(root, '[data-generator-copy]')
  const copy = JSON.parse(copyEl.textContent || '{}') as GeneratorCopy
  copyEl.remove()

  const dimBar         = query<HTMLElement>(root, '[data-dim-bar]')
  const fontStatus     = query<HTMLElement>(root, '[data-font-status]')
  const previewViewport = query<HTMLElement>(root, '[data-preview-viewport]')
  const previewFrame   = query<HTMLElement>(root, '[data-preview-frame]')
  const previewMount   = query<HTMLElement>(root, '[data-preview-svg]')
  const formatSelect   = query<HTMLSelectElement>(root, '[data-format-select]')
  const bgInput        = query<HTMLInputElement>(root, '#background-file')
  const bgOpacity      = query<HTMLInputElement>(root, '#background-opacity')
  const bgOpacityVal   = query<HTMLElement>(root, '[data-bg-opacity-value]')
  const exportPngBtn   = query<HTMLButtonElement>(root, '[data-export-png]')
  const exportSvgBtn   = query<HTMLButtonElement>(root, '[data-export-svg]')
  const resetBtn       = query<HTMLButtonElement>(root, '[data-reset]')
  const clearBgBtn     = query<HTMLButtonElement>(root, '[data-clear-background]')
  const themeButtons   = root.querySelectorAll<HTMLButtonElement>('[data-theme-button]')

  const inputs = {
    series:   query<HTMLInputElement>(root, '#field-series'),
    issue:    query<HTMLInputElement>(root, '#field-issue'),
    date:     query<HTMLInputElement>(root, '#field-date'),
    title:    query<HTMLInputElement>(root, '#field-title'),
    subtitle: query<HTMLInputElement>(root, '#field-subtitle'),
    author:   query<HTMLInputElement>(root, '#field-author'),
    handle:   query<HTMLInputElement>(root, '#field-handle'),
    site:     query<HTMLInputElement>(root, '#field-site'),
  }

  const fallback = createDefaultState(copy.defaultContent)
  fallback.formatId = copy.defaultFormat
  fallback.themeId  = copy.defaultTheme
  fallback.backgroundOpacity = copy.defaultBackgroundOpacity
  let state: GeneratorState = loadState(copy.storageKey, fallback)
  let embeddedFontCss = ''
  let queued = false

  const syncFields = () => {
    inputs.series.value   = state.content.series
    inputs.issue.value    = state.content.issue
    inputs.date.value     = state.content.date
    inputs.title.value    = state.content.title.replace(/\r?\n/g, ' ').trim()
    inputs.subtitle.value = state.content.subtitle
    inputs.author.value   = state.content.author
    inputs.handle.value   = state.content.handle
    inputs.site.value     = state.content.site
    bgOpacity.value       = String(state.backgroundOpacity)
    bgOpacityVal.textContent = `${state.backgroundOpacity}%`
    formatSelect.value    = state.formatId
  }

  const buildSvgNow = (embedded = false) => buildSvg({
    formatId: state.formatId,
    themeId:  state.themeId,
    content:  state.content,
    backgroundUrl:     state.backgroundUrl,
    backgroundOpacity: state.backgroundOpacity,
    embeddedFontCss:   embedded ? embeddedFontCss : undefined,
  })

  const render = () => {
    queued = false
    formatSelect.value = state.formatId
    setPressedState(themeButtons, state.themeId, 'themeId')

    const format = formatMap[state.formatId]
    const bounds = previewViewport.getBoundingClientRect()
    const scale  = Math.min(
      Math.max(240, bounds.width  - 24) / format.width,
      Math.max(200, bounds.height - 24) / format.height,
      1,
    )
    previewFrame.style.width  = `${Math.round(format.width  * scale)}px`
    previewFrame.style.height = `${Math.round(format.height * scale)}px`
    previewMount.innerHTML = buildSvgNow(false)

    const svg = previewMount.querySelector('svg')
    if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; svg.style.display = 'block' }

    const fc = copy.formatCopy[state.formatId]
    const tc = copy.themeCopy[state.themeId]
    dimBar.textContent = `${fc.label} · ${format.ratio} · ${format.width}×${format.height} · ${tc.label}`
    persistState(copy.storageKey, state)
  }

  const queue = () => { if (!queued) { queued = true; window.requestAnimationFrame(render) } }

  const fromFields = () => {
    state = { ...state, content: {
      series:   inputs.series.value,
      issue:    inputs.issue.value,
      date:     inputs.date.value,
      title:    inputs.title.value,
      subtitle: inputs.subtitle.value,
      author:   inputs.author.value,
      handle:   inputs.handle.value,
      site:     inputs.site.value,
    } }
    queue()
  }

  syncFields()
  queue()
  initAmbientGrid(root)

  const ro = new ResizeObserver(queue)
  ro.observe(previewViewport)

  formatSelect.addEventListener('change', () => {
    const next = formatSelect.value
    if (next in formatMap) { state = { ...state, formatId: next as GeneratorState['formatId'] }; queue() }
  })

  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.themeId
      if (next && next in themeMap) { state = { ...state, themeId: next as GeneratorState['themeId'] }; queue() }
    })
  })

  Object.values(inputs).forEach((inp) => inp.addEventListener('input', fromFields))

  bgInput.addEventListener('change', () => {
    const file = bgInput.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      state = { ...state, backgroundUrl: typeof reader.result === 'string' ? reader.result : null }
      queue()
    }
    reader.readAsDataURL(file)
  })

  bgOpacity.addEventListener('input', () => {
    state = { ...state, backgroundOpacity: Number(bgOpacity.value) }
    bgOpacityVal.textContent = `${state.backgroundOpacity}%`
    queue()
  })

  clearBgBtn.addEventListener('click', () => { state = { ...state, backgroundUrl: null }; bgInput.value = ''; queue() })

  resetBtn.addEventListener('click', () => {
    state = createDefaultState(copy.defaultContent)
    state.formatId = copy.defaultFormat
    state.themeId  = copy.defaultTheme
    state.backgroundOpacity = copy.defaultBackgroundOpacity
    syncFields()
    bgInput.value = ''
    queue()
  })

  exportPngBtn.disabled = true
  exportSvgBtn.disabled = true
  fontStatus.textContent = copy.fontStatusLoading

  void loadEvaFont().then(async (ready) => {
    fontStatus.textContent = ready ? copy.fontStatusReady : copy.fontStatusFallback
    if (ready) embeddedFontCss = await getEmbeddedEvaFontCss()
    exportPngBtn.disabled = false
    exportSvgBtn.disabled = false
    queue()
  })

  exportSvgBtn.addEventListener('click', () => {
    const svg = buildSvgNow(Boolean(embeddedFontCss))
    downloadSvg(svg, buildFileName(safeFileStem(state.content.title || 'eva-title'), 'svg'))
  })

  exportPngBtn.addEventListener('click', async () => {
    exportPngBtn.disabled = true
    try {
      const svg = buildSvgNow(Boolean(embeddedFontCss))
      await exportPng(svg, formatMap[state.formatId], buildFileName(safeFileStem(state.content.title || 'eva-title'), 'png'))
    } finally { exportPngBtn.disabled = false }
  })

  window.addEventListener('beforeunload', () => ro.disconnect(), { once: true })
}
