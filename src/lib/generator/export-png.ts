import type { FormatOption } from '@/lib/config/formats'

export async function exportPng(svgMarkup: string, format: FormatOption, fileName: string): Promise<void> {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = format.width * 2
    canvas.height = format.height * 2
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas context unavailable')
    }

    context.scale(2, 2)
    context.drawImage(image, 0, 0)

    const href = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = href
    link.download = fileName
    link.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image failed to load'))
    image.src = src
  })
}
