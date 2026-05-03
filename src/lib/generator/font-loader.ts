const FONT_FAMILY = 'EvaMing'
const FONT_URL = '/fonts/Eva-Ming-SC-v0.1.woff2'

let fontLoadPromise: Promise<boolean> | null = null
let embeddedFontCssPromise: Promise<string> | null = null

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return window.btoa(binary)
}

export function getEvaFontFamily(): string {
  return FONT_FAMILY
}

export function getEvaFontUrl(): string {
  return FONT_URL
}

export function loadEvaFont(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false)
  }

  if (!fontLoadPromise) {
    fontLoadPromise = (async () => {
      if (document.fonts.check(`700 28px "${FONT_FAMILY}"`)) {
        return true
      }

      const fontFace = new FontFace(
        FONT_FAMILY,
        `url(${FONT_URL}) format("woff2")`,
        { style: 'normal', weight: '400 900' },
      )

      await fontFace.load()
      document.fonts.add(fontFace)
      await document.fonts.load(`700 28px "${FONT_FAMILY}"`)
      await document.fonts.ready
      return document.fonts.check(`700 28px "${FONT_FAMILY}"`)
    })().catch(() => false)
  }

  return fontLoadPromise
}

export async function getEmbeddedEvaFontCss(): Promise<string> {
  if (typeof window === 'undefined') {
    return ''
  }

  if (!embeddedFontCssPromise) {
    embeddedFontCssPromise = (async () => {
      const response = await window.fetch(FONT_URL)
      const buffer = await response.arrayBuffer()
      const base64 = arrayBufferToBase64(buffer)
      return `@font-face{font-family:'${FONT_FAMILY}';src:url(data:font/woff2;base64,${base64}) format('woff2');font-style:normal;font-weight:400 900;font-display:block;}`
    })()
  }

  return embeddedFontCssPromise
}
