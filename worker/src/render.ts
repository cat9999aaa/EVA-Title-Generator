import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import webpEncoder from '@jsquash/webp/codec/enc/webp_enc.js'
import webpWasm from '@jsquash/webp/codec/enc/webp_enc.wasm'
import { defaultOptions } from '@jsquash/webp/meta.js'
import { initEmscriptenModule } from '@jsquash/webp/utils.js'
import { getFormat, pngPixels } from '../../src/lib/config/formats.ts'
import { buildSvg } from '../../src/lib/generator/build-svg.ts'
import { getEvaFontFamily } from '../../src/lib/generator/font-loader.ts'
import type { CoverRequest } from './schema.ts'

export class WebpUnavailableError extends Error {
  readonly code = 'WEBP_UNAVAILABLE' as const

  constructor(message = 'WebP encoding is unavailable') {
    super(message)
    this.name = 'WebpUnavailableError'
  }
}

export interface RenderedCover {
  bytes: Uint8Array
  contentType: 'image/png' | 'image/webp'
  width: number
  height: number
}

// OTF name table family; SVG still requests EvaMing and resvg falls back here.
const OTF_FAMILY = 'SourceHanSerifSC EvaJian'

type WebpModule = {
  encode: (
    data: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    options: Record<string, unknown>,
  ) => Uint8Array | null
}

let resvgReady: Promise<void> | null = null
let webpModule: Promise<WebpModule> | null = null
let webpFailed: Error | null = null

function ensureImageData(): void {
  if (typeof globalThis.ImageData !== 'undefined') {
    return
  }
  globalThis.ImageData = class ImageData {
    readonly data: Uint8ClampedArray
    readonly width: number
    readonly height: number
    readonly colorSpace: PredefinedColorSpace = 'srgb'

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth
        this.width = widthOrHeight ?? 0
        this.height = height ?? 0
      } else {
        this.width = dataOrWidth
        this.height = widthOrHeight ?? 0
        this.data = new Uint8ClampedArray(this.width * this.height * 4)
      }
    }
  } as unknown as typeof ImageData
}

async function ensureResvg(): Promise<void> {
  if (!resvgReady) {
    resvgReady = initWasm(resvgWasm).then(() => undefined)
  }
  try {
    await resvgReady
  } catch (error) {
    resvgReady = null
    throw error
  }
}

async function getWebpModule(): Promise<WebpModule> {
  if (webpFailed) {
    throw new WebpUnavailableError(webpFailed.message)
  }
  if (!webpModule) {
    webpModule = (async () => {
      ensureImageData()
      // TODO(webp): SIMD wasm (`webp_enc_simd.wasm`) is faster but wrangler
      // packaging of wasm-feature-detect + dual modules is fragile. Non-SIMD
      // is the solid Workers path; switch if bundling is proven.
      return await initEmscriptenModule(webpEncoder, webpWasm) as WebpModule
    })().catch((error: unknown) => {
      webpFailed = error instanceof Error ? error : new Error(String(error))
      webpModule = null
      throw new WebpUnavailableError(webpFailed.message)
    })
  }
  return webpModule
}

export async function renderCover(request: CoverRequest, fontBytes: ArrayBuffer): Promise<RenderedCover> {
  await ensureResvg()
  const format = getFormat(request.formatId)
  const cssFamily = getEvaFontFamily()
  const svg = buildSvg({
    formatId: request.formatId,
    themeId: request.themeId,
    backgroundUrl: request.backgroundUrl,
    backgroundOpacity: request.backgroundOpacity,
    content: {
      series: request.series,
      issue: request.issue,
      date: request.date,
      title: request.title,
      subtitle: request.subtitle,
      author: request.author,
      handle: request.handle,
      site: request.site,
      mark: request.mark,
    },
  })
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: request.scale },
    font: {
      fontBuffers: [new Uint8Array(fontBytes)],
      defaultFontFamily: OTF_FAMILY,
      serifFamily: OTF_FAMILY,
      sansSerifFamily: OTF_FAMILY,
      monospaceFamily: cssFamily === OTF_FAMILY ? cssFamily : OTF_FAMILY,
    },
  })
  const rendered = resvg.render()
  const pixels = pngPixels(format, request.scale)
  if (request.output === 'png') {
    const bytes = rendered.asPng()
    rendered.free()
    return { bytes, contentType: 'image/png', width: pixels.width, height: pixels.height }
  }

  try {
    const encoder = await getWebpModule()
    const rgba = rendered.pixels
    const encoded = encoder.encode(
      rgba,
      rendered.width,
      rendered.height,
      { ...defaultOptions, quality: request.quality },
    )
    rendered.free()
    if (!encoded) {
      throw new WebpUnavailableError('encoder returned empty output')
    }
    return {
      bytes: encoded,
      contentType: 'image/webp',
      width: pixels.width,
      height: pixels.height,
    }
  } catch (error) {
    rendered.free()
    if (error instanceof WebpUnavailableError) {
      throw error
    }
    throw new WebpUnavailableError(error instanceof Error ? error.message : String(error))
  }
}
