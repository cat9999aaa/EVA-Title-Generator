function readRgb(root: HTMLElement): string {
  return getComputedStyle(root).getPropertyValue('--theme-accent-rgb').trim() || '232 232 232'
}

export function initAmbientGrid(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-eva-grid]')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5
  let raf = 0

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(r.width * dpr) || 1
    canvas.height = Math.floor(r.height * dpr) || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const draw = (t: number) => {
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    const rgb = readRgb(root)

    ctx.clearRect(0, 0, W, H)

    if (!reduced.matches) {
      tmx += (mx - tmx) * 0.04
      tmy += (my - tmy) * 0.04
    }

    // Vanishing point — mouse nudges it slightly
    const vpx = W * (0.5 + (tmx - 0.5) * 0.10)
    const vpy = H * (0.38 + (tmy - 0.5) * 0.06)

    // ── Layer 1: Perspective tunnel grid ─────────────────────────────
    // Vertical lines radiate from vanishing point to bottom edge
    const COLS = 9
    ctx.lineWidth = 0.7
    for (let c = 0; c <= COLS; c++) {
      const t_norm = c / COLS  // 0..1
      const xNear = vpx + (t_norm - 0.5) * W * 1.7
      const a = 0.09 * (1 - Math.abs(t_norm - 0.5) * 1.9)
      if (a <= 0) continue
      ctx.strokeStyle = `rgb(${rgb} / ${a.toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(vpx, vpy)
      ctx.lineTo(xNear, H)
      ctx.stroke()
    }

    // Horizontal lines: depth-animated, match vertical perspective
    const ROWS = 14
    const scroll = reduced.matches ? 0 : (t * 0.000055) % 1
    for (let r = 1; r <= ROWS; r++) {
      const depth = ((r / ROWS) + scroll) % 1  // 0=horizon 1=near
      if (depth < 0.03) continue
      const y = vpy + (H - vpy) * Math.pow(depth, 0.6)
      // spread matches where vertical lines are at this y
      const spread = 0.5 * W * 1.7 * Math.pow(depth, 0.6)
      const a = Math.pow(depth, 1.8) * 0.20
      ctx.strokeStyle = `rgb(${rgb} / ${a.toFixed(3)})`
      ctx.lineWidth = depth * 1.1
      ctx.beginPath()
      ctx.moveTo(vpx - spread, y)
      ctx.lineTo(vpx + spread, y)
      ctx.stroke()
    }

    // ── Layer 2: Corner brackets (pulsing) ────────────────────────────
    const bLen = Math.min(W, H) * 0.065
    const pad = 18
    const pulse = reduced.matches ? 0.38 : 0.26 + 0.14 * Math.sin(t * 0.0017)
    ctx.strokeStyle = `rgb(${rgb} / ${pulse.toFixed(3)})`
    ctx.lineWidth = 1.4
    ctx.setLineDash([])

    const corners: [number, number, 1 | -1, 1 | -1][] = [
      [pad, pad, 1, 1], [W - pad, pad, -1, 1],
      [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1],
    ]
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath()
      ctx.moveTo(cx + dx * bLen, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + dy * bLen)
      ctx.stroke()
    }

    // ── Layer 3: Mouse-tracking reticle ───────────────────────────────
    if (!reduced.matches) {
      const rx = tmx * W
      const ry = tmy * H
      const s = 11
      ctx.strokeStyle = `rgb(${rgb} / 0.22)`
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.moveTo(rx - s * 2.6, ry); ctx.lineTo(rx - s * 0.55, ry)
      ctx.moveTo(rx + s * 0.55, ry); ctx.lineTo(rx + s * 2.6, ry)
      ctx.moveTo(rx, ry - s * 2.6); ctx.lineTo(rx, ry - s * 0.55)
      ctx.moveTo(rx, ry + s * 0.55); ctx.lineTo(rx, ry + s * 2.6)
      ctx.stroke()
      ctx.strokeRect(rx - s * 0.48, ry - s * 0.48, s * 0.96, s * 0.96)
    }

    raf = window.requestAnimationFrame(draw)
  }

  const onMove = (e: PointerEvent) => {
    const r = root.getBoundingClientRect()
    mx = (e.clientX - r.left) / r.width
    my = (e.clientY - r.top) / r.height
  }
  const onLeave = () => { mx = 0.5; my = 0.5 }

  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  window.addEventListener('resize', resize)
  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerleave', onLeave)
  raf = window.requestAnimationFrame(draw)

  window.addEventListener('beforeunload', () => {
    ro.disconnect()
    window.removeEventListener('resize', resize)
    root.removeEventListener('pointermove', onMove)
    root.removeEventListener('pointerleave', onLeave)
    window.cancelAnimationFrame(raf)
  }, { once: true })
}
