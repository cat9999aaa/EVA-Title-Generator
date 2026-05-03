function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.click()
}

export function buildFileName(prefix: string, extension: 'png' | 'svg'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}-${stamp}.${extension}`
}

export function downloadSvg(svgMarkup: string, fileName: string): void {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  triggerDownload(href, fileName)
  window.setTimeout(() => URL.revokeObjectURL(href), 500)
}
