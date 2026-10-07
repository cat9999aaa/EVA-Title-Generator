import { formatMap, pngPixels } from '@/lib/config/formats'
import { themeMap } from '@/lib/config/themes'
import { initAmbientGrid } from '@/lib/generator/ambient'
import { buildSvg } from '@/lib/generator/build-svg'
import { downloadSvg, buildFileName } from '@/lib/generator/export-svg'
import { exportPng } from '@/lib/generator/export-png'
import { getEmbeddedEvaFontCss, loadEvaFont } from '@/lib/generator/font-loader'
import { TextDoesNotFitError } from '@/lib/generator/measure-text'
import { createDefaultState, loadState, persistState, refreshAutoDate } from '@/lib/generator/state'
import type { DateMode, ExportKind, GeneratorCopy, GeneratorState } from '@/lib/generator/types'

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

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function initGeneratorApp(root: HTMLElement): void {
  const copyEl = query<HTMLScriptElement>(root, '[data-generator-copy]')
  const copy = JSON.parse(copyEl.textContent || '{}') as GeneratorCopy
  copyEl.remove()
  const apiBase = root.dataset.apiBase || '/api/v1'

  const dimBar = query<HTMLElement>(root, '[data-dim-bar]')
  const fontStatus = query<HTMLElement>(root, '[data-font-status]')
  const fitStatus = query<HTMLElement>(root, '[data-fit-status]')
  const pngSize = query<HTMLElement>(root, '[data-png-size]')
  const coverCount = query<HTMLElement>(root, '[data-cover-count]')
  const previewViewport = query<HTMLElement>(root, '[data-preview-viewport]')
  const previewFrame = query<HTMLElement>(root, '[data-preview-frame]')
  const previewMount = query<HTMLElement>(root, '[data-preview-svg]')
  const formatSelect = query<HTMLSelectElement>(root, '[data-format-select]')
  const scaleSelect = query<HTMLSelectElement>(root, '[data-scale-select]')
  const kindSelect = query<HTMLSelectElement>(root, '[data-kind-select]')
  const qualityInput = query<HTMLInputElement>(root, '[data-quality-input]')
  const qualityValue = query<HTMLElement>(root, '[data-quality-value]')
  const bgInput = query<HTMLInputElement>(root, '#background-file')
  const bgOpacity = query<HTMLInputElement>(root, '#background-opacity')
  const bgOpacityVal = query<HTMLElement>(root, '[data-bg-opacity-value]')
  const exportImageBtn = query<HTMLButtonElement>(root, '[data-export-image]')
  const exportSvgBtn = query<HTMLButtonElement>(root, '[data-export-svg]')
  const resetBtn = query<HTMLButtonElement>(root, '[data-reset]')
  const clearBgBtn = query<HTMLButtonElement>(root, '[data-clear-background]')
  const themeButtons = root.querySelectorAll<HTMLButtonElement>('[data-theme-button]')

  const inputs = {
    series: query<HTMLInputElement>(root, '#field-series'),
    issue: query<HTMLInputElement>(root, '#field-issue'),
    date: query<HTMLInputElement>(root, '#field-date'),
    title: query<HTMLInputElement>(root, '#field-title'),
    subtitle: query<HTMLInputElement>(root, '#field-subtitle'),
    mark: query<HTMLInputElement>(root, '#field-mark'),
    author: query<HTMLInputElement>(root, '#field-author'),
    handle: query<HTMLInputElement>(root, '#field-handle'),
    site: query<HTMLInputElement>(root, '#field-site'),
  }

  const fallback = createDefaultState(copy.defaultContent)
  fallback.formatId = copy.defaultFormat
  fallback.themeId = copy.defaultTheme
  fallback.backgroundOpacity = copy.defaultBackgroundOpacity
  fallback.exportScale = formatMap[fallback.formatId].defaultScale
  let state: GeneratorState = refreshAutoDate(loadState(copy.storageKey, fallback))
  let embeddedFontCss = ''
  let fontReady = false
  let fitError: TextDoesNotFitError | null = null
  let queued = false
  let inFlightKey: string | null = null

  const syncFields = () => {
    inputs.series.value = state.content.series
    inputs.issue.value = state.content.issue
    inputs.date.value = state.content.date
    inputs.title.value = state.content.title
    inputs.subtitle.value = state.content.subtitle
    inputs.mark.value = state.content.mark
    inputs.author.value = state.content.author
    inputs.handle.value = state.content.handle
    inputs.site.value = state.content.site
    bgOpacity.value = String(state.backgroundOpacity)
    bgOpacityVal.textContent = `${state.backgroundOpacity}%`
    formatSelect.value = state.formatId
    scaleSelect.value = String(state.exportScale)
    kindSelect.value = state.exportKind
    qualityInput.value = String(state.exportQuality)
    qualityValue.textContent = String(state.exportQuality)
  }

  const setExportEnabled = (enabled: boolean) => {
    exportImageBtn.disabled = !enabled
    exportSvgBtn.disabled = !enabled
  }

  const buildSvgNow = (embedded = false) => buildSvg({
    formatId: state.formatId,
    themeId: state.themeId,
    content: state.content,
    backgroundUrl: state.backgroundUrl,
    backgroundOpacity: state.backgroundOpacity,
    embeddedFontCss: embedded ? embeddedFontCss : undefined,
  })

  const render = () => {
    queued = false
    state = refreshAutoDate(state)
    formatSelect.value = state.formatId
    scaleSelect.value = String(state.exportScale)
    kindSelect.value = state.exportKind
    qualityInput.value = String(state.exportQuality)
    qualityValue.textContent = String(state.exportQuality)
    setPressedState(themeButtons, state.themeId, 'themeId')
    if (state.dateMode === 'auto') {
      inputs.date.value = state.content.date
    }

    const format = formatMap[state.formatId]
    const pixels = pngPixels(format, state.exportScale)
    const kindLabel = state.exportKind.toUpperCase()
    pngSize.textContent = `${kindLabel} ${pixels.width}×${pixels.height}`
    exportImageBtn.textContent = state.exportKind === 'webp' ? copy.exportWebp : copy.exportPng
    const bounds = previewViewport.getBoundingClientRect()
    const scale = Math.min(
      Math.max(240, bounds.width - 24) / format.width,
      Math.max(200, bounds.height - 24) / format.height,
      1,
    )
    previewFrame.style.width = `${Math.round(format.width * scale)}px`
    previewFrame.style.height = `${Math.round(format.height * scale)}px`

    fitError = null
    try {
      previewMount.innerHTML = buildSvgNow(false)
      fitStatus.textContent = ''
    } catch (error) {
      fitError = error instanceof TextDoesNotFitError ? error : new TextDoesNotFitError('标题', copy.overflowHint)
      previewMount.innerHTML = ''
      fitStatus.textContent = fitError.message || copy.overflowHint
    }

    const svg = previewMount.querySelector('svg')
    if (svg) {
      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.display = 'block'
    }

    const fc = copy.formatCopy[state.formatId]
    const tc = copy.themeCopy[state.themeId]
    dimBar.textContent = `${fc.label} · ${format.ratio} · ${format.width}×${format.height} · ${kindLabel} ${pixels.width}×${pixels.height} · ${tc.label}`
    setExportEnabled(fontReady && !fitError)
    persistState(copy.storageKey, state)
  }

  const queue = () => {
    if (!queued) {
      queued = true
      window.requestAnimationFrame(render)
    }
  }

  const fromFields = () => {
    const dateValue = inputs.date.value.trim()
    let dateMode: DateMode
    if (dateValue === '') {
      dateMode = 'hidden'
    } else if (state.dateMode === 'auto' && dateValue === state.content.date) {
      dateMode = 'auto'
    } else {
      dateMode = 'manual'
    }
    state = {
      ...state,
      dateMode,
      content: {
        series: inputs.series.value,
        issue: inputs.issue.value,
        date: dateValue,
        title: inputs.title.value.replace(/\r?\n/g, ' '),
        subtitle: inputs.subtitle.value.replace(/\r?\n/g, ' '),
        mark: inputs.mark.value.replace(/\r?\n/g, ' '),
        author: inputs.author.value,
        handle: inputs.handle.value,
        site: inputs.site.value,
      },
    }
    queue()
  }

  syncFields()
  queue()
  initAmbientGrid(root)

  const ro = new ResizeObserver(queue)
  ro.observe(previewViewport)

  formatSelect.addEventListener('change', () => {
    const next = formatSelect.value
    if (next in formatMap) {
      const formatId = next as GeneratorState['formatId']
      state = { ...state, formatId, exportScale: formatMap[formatId].defaultScale }
      queue()
    }
  })

  scaleSelect.addEventListener('change', () => {
    state = { ...state, exportScale: scaleSelect.value === '2' ? 2 : 1 }
    queue()
  })

  kindSelect.addEventListener('change', () => {
    state = { ...state, exportKind: kindSelect.value === 'png' ? 'png' : 'webp' }
    queue()
  })

  qualityInput.addEventListener('input', () => {
    state = { ...state, exportQuality: Number(qualityInput.value) }
    qualityValue.textContent = String(state.exportQuality)
    persistState(copy.storageKey, state)
  })

  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.themeId
      if (next && next in themeMap) {
        state = { ...state, themeId: next as GeneratorState['themeId'] }
        queue()
      }
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

  clearBgBtn.addEventListener('click', () => {
    state = { ...state, backgroundUrl: null }
    bgInput.value = ''
    queue()
  })

  resetBtn.addEventListener('click', () => {
    state = createDefaultState(copy.defaultContent)
    state.formatId = copy.defaultFormat
    state.themeId = copy.defaultTheme
    state.backgroundOpacity = copy.defaultBackgroundOpacity
    state.exportScale = formatMap[state.formatId].defaultScale
    syncFields()
    bgInput.value = ''
    queue()
  })

  setExportEnabled(false)
  fontStatus.textContent = copy.fontStatusLoading

  void loadEvaFont().then(async (ready) => {
    fontReady = ready
    fontStatus.textContent = ready ? copy.fontStatusReady : copy.fontStatusFallback
    if (ready) {
      embeddedFontCss = await getEmbeddedEvaFontCss()
    }
    queue()
  })

  const refreshCount = async () => {
    try {
      const response = await fetch(`${apiBase}/stats`, { headers: { Accept: 'application/json' } })
      if (!response.ok) {
        throw new Error('stats unavailable')
      }
      const body = await response.json() as { count?: number }
      if (typeof body.count === 'number') {
        coverCount.textContent = (copy.counterLabel || '累计生成了 {count} 张封面图').replace('{count}', formatCount(body.count))
      }
    } catch {
      coverCount.textContent = copy.counterUnavailable
    }
  }
  void refreshCount()

  exportSvgBtn.addEventListener('click', () => {
    if (!fontReady || fitError) return
    const svg = buildSvgNow(false)
    downloadSvg(svg, buildFileName(safeFileStem(state.content.title || 'eva-title'), 'svg'))
  })

  exportImageBtn.addEventListener('click', async () => {
    if (!fontReady || fitError) return
    exportImageBtn.disabled = true
    const kind: ExportKind = state.exportKind
    const fileName = buildFileName(safeFileStem(state.content.title || 'eva-title'), kind)
    const key = inFlightKey ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    inFlightKey = key
    try {
      const svg = buildSvgNow(Boolean(embeddedFontCss))
      const posted = await postExport(apiBase, svg, state, kind, key, copy.locale)
      if (posted) {
        const href = URL.createObjectURL(posted)
        const link = document.createElement('a')
        link.href = href
        link.download = fileName
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 500)
        await refreshCount()
      } else {
        await exportPng(svg, formatMap[state.formatId], fileName, state.exportScale, kind, state.exportQuality)
      }
      inFlightKey = null
    } finally {
      setExportEnabled(fontReady && !fitError)
    }
  })

  window.addEventListener('beforeunload', () => ro.disconnect(), { once: true })
}

async function postExport(
  apiBase: string,
  svg: string,
  state: GeneratorState,
  kind: ExportKind,
  idempotencyKey: string,
  locale: string,
): Promise<Blob | null> {
  try {
    const response = await fetch(`${apiBase}/exports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: kind === 'webp' ? 'image/webp' : 'image/png',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        formatId: state.formatId,
        themeId: state.themeId,
        content: state.content,
        backgroundUrl: state.backgroundUrl,
        backgroundOpacity: state.backgroundOpacity,
        scale: state.exportScale,
        output: kind,
        quality: state.exportQuality,
        locale,
        idempotencyKey,
        svg,
      }),
    })
    if (!response.ok) {
      return null
    }
    const type = response.headers.get('content-type') || ''
    if (!type.startsWith('image/')) {
      return null
    }
    return await response.blob()
  } catch {
    return null
  }
}
