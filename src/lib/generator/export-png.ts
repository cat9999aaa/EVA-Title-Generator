import { pngPixels, type FormatOption } from '@/lib/config/formats'
import type { ExportKind } from '@/lib/generator/types'

export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) {
    return 80
  }
  return Math.min(100, Math.max(1, Math.round(quality)))
}

export async function rasterizeSvg(
  svgMarkup: string,
  format: FormatOption,
  scale: number = format.defaultScale,
  kind: ExportKind = 'png',
  quality: number = 80,
): Promise<{ blob: Blob; width: number; height: number; mime: string }> {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const pixels = pngPixels(format, scale)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = pixels.width
    canvas.height = pixels.height
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas context unavailable')
    }

    context.scale(pixels.width / format.width, pixels.height / format.height)
    context.drawImage(image, 0, 0)

    const mime = kind === 'webp' ? 'image/webp' : 'image/png'
    const href = kind === 'webp'
      ? canvas.toDataURL(mime, clampQuality(quality) / 100)
      : canvas.toDataURL(mime)
    const raster = await (await fetch(href)).blob()
    return { blob: raster, width: pixels.width, height: pixels.height, mime }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function exportPng(
  svgMarkup: string,
  format: FormatOption,
  fileName: string,
  scale: number = format.defaultScale,
  kind: ExportKind = 'png',
  quality: number = 80,
): Promise<{ width: number; height: number }> {
  const raster = await rasterizeSvg(svgMarkup, format, scale, kind, quality)
  const href = URL.createObjectURL(raster.blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 500)
  return { width: raster.width, height: raster.height }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image failed to load'))
    image.src = src
  })
}
