import { useEffect, useRef } from 'react'

export type AuraMode = 'disconnected' | 'idle' | 'user-speaking' | 'agent-speaking'

interface AuraVisualizerProps {
  auraMode: AuraMode
  rmsRef: React.RefObject<number>
}

interface HSL { h: number; s: number; l: number }

const TARGET_COLORS: Record<AuraMode, HSL> = {
  disconnected: { h: 190, s: 15, l: 50 },
  idle: { h: 190, s: 55, l: 72 },
  'user-speaking': { h: 188, s: 65, l: 80 },
  'agent-speaking': { h: 178, s: 60, l: 75 },
}

const BASE_ALPHA: Record<AuraMode, number> = {
  disconnected: 0.2,
  idle: 0.5,
  'user-speaking': 0.85,
  'agent-speaking': 0.9,
}

const SEGMENTS = 128
const NUM_LAYERS = 3

function buildRingPoints(
  cx: number, cy: number, baseRadius: number,
  t: number, rms: number, layerOffset: number,
) {
  const points: Array<{ x: number; y: number; thickness: number }> = []

  // Amplified RMS — cubic curve so even small audio input produces visible movement
  const amp = rms * rms * 0.5 + rms * 0.5 // boost low-level signals

  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2

    // Time speeds up with audio — ring animates faster when speaking
    const speedMult = 1.0 + amp * 3.0
    const st = t * speedMult

    // Warp harmonics — dramatically larger with audio
    const warp1 = Math.sin(theta * 3 + st * 0.8 + layerOffset) * (6 + amp * 60)
    const warp2 = Math.sin(theta * 5 - st * 0.6 + layerOffset * 2) * (3 + amp * 35)
    const warp3 = Math.cos(theta * 2 + st * 1.1 + layerOffset) * (5 + amp * 45)
    const warp4 = Math.sin(theta * 7 + st * 1.5 + layerOffset * 0.7) * (amp * 20)
    const breathe = Math.sin(t * 0.5 + layerOffset) * (3 + amp * 15)

    // Radius expands significantly with audio
    const r = baseRadius + warp1 + warp2 + warp3 + warp4 + breathe + amp * 50

    // 3D ribbon twist — much thicker when audio is active
    const twist = Math.sin(theta * 2 + st * 0.7 + layerOffset) * 0.5 + 0.5
    const depthFold = Math.sin(theta * 3 - st * 0.9 + layerOffset * 1.5) * 0.4 + 0.6
    const thickness = (4 + amp * 40) * twist * depthFold + 2

    points.push({
      x: cx + Math.cos(theta) * r,
      y: cy + Math.sin(theta) * r,
      thickness,
    })
  }
  return points
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; thickness: number }>,
  color: HSL, alpha: number, rms: number,
  drawCore: boolean,
) {
  const amp = rms * rms * 0.5 + rms * 0.5

  const outer: Array<{ x: number; y: number }> = []
  const inner: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const next = points[(i + 1) % points.length]
    const dx = next.x - p.x
    const dy = next.y - p.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const hw = p.thickness / 2
    outer.push({ x: p.x + nx * hw, y: p.y + ny * hw })
    inner.push({ x: p.x - nx * hw, y: p.y - ny * hw })
  }

  // Filled ribbon band — brighter with audio
  ctx.beginPath()
  for (let i = 0; i < outer.length; i++) {
    if (i === 0) ctx.moveTo(outer[i].x, outer[i].y)
    else ctx.lineTo(outer[i].x, outer[i].y)
  }
  for (let i = inner.length - 1; i >= 0; i--) {
    ctx.lineTo(inner[i].x, inner[i].y)
  }
  ctx.closePath()
  ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha * (0.4 + amp * 0.5)})`
  ctx.fill()

  if (drawCore) {
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i].x, points[i].y)
      else ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.closePath()
    ctx.strokeStyle = `hsla(${color.h}, ${Math.min(100, color.s + 20)}%, ${Math.min(97, color.l + 15)}%, ${alpha * (0.7 + amp * 0.3)})`
    ctx.lineWidth = 1.5 + amp * 5
    ctx.stroke()
  }
}

export default function AuraVisualizer({ auraMode, rmsRef }: AuraVisualizerProps) {
  const glowRef = useRef<HTMLCanvasElement>(null)
  const sharpRef = useRef<HTMLCanvasElement>(null)
  const auraModeRef = useRef(auraMode)

  useEffect(() => { auraModeRef.current = auraMode }, [auraMode])

  useEffect(() => {
    const glowCanvas = glowRef.current
    const sharpCanvas = sharpRef.current
    if (!glowCanvas || !sharpCanvas) return
    const glowCtx = glowCanvas.getContext('2d')
    const sharpCtx = sharpCanvas.getContext('2d')
    if (!glowCtx || !sharpCtx) return

    function resize() {
      const rect = glowCanvas!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      for (const c of [glowCanvas!, sharpCanvas!]) {
        c.width = rect.width * dpr
        c.height = rect.height * dpr
      }
      glowCtx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      sharpCtx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let smoothedRms = 0
    const color: HSL = { ...TARGET_COLORS[auraModeRef.current] }
    let frameId: number

    function draw() {
      const mode = auraModeRef.current
      const rawRms = rmsRef.current ?? 0

      // Faster EMA tracking when audio rises, slower decay for smooth falloff
      const emaUp = 0.18
      const emaDown = 0.04
      const emaFactor = rawRms > smoothedRms ? emaUp : emaDown
      smoothedRms += (rawRms - smoothedRms) * emaFactor

      const target = TARGET_COLORS[mode]
      color.h += (target.h - color.h) * 0.04
      color.s += (target.s - color.s) * 0.04
      color.l += (target.l - color.l) * 0.04

      const alpha = BASE_ALPHA[mode]
      const t = performance.now() / 1000

      const rect = glowCanvas!.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = h / 2
      const baseRadius = Math.min(w, h) * 0.33

      glowCtx!.clearRect(0, 0, w, h)
      sharpCtx!.clearRect(0, 0, w, h)

      for (let layer = 0; layer < NUM_LAYERS; layer++) {
        const layerOffset = layer * 0.5
        const layerAlpha = alpha * (1 - layer * 0.25)
        const layerRadius = baseRadius + layer * 3

        const points = buildRingPoints(cx, cy, layerRadius, t, smoothedRms, layerOffset)

        // Glow canvas — wider ribbon, no core stroke
        drawRibbon(glowCtx!, points, color, layerAlpha, smoothedRms, false)

        // Sharp canvas — primary layer with bright core stroke
        if (layer === 0) {
          drawRibbon(sharpCtx!, points, color, layerAlpha, smoothedRms, true)
        }
      }

      frameId = requestAnimationFrame(draw)
    }

    frameId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [rmsRef])

  return (
    <div className="relative w-full h-full max-w-[520px] max-h-[520px] mx-auto">
      {/* Glow layer — heavy blur for soft bloom */}
      <canvas
        ref={glowRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(12px) brightness(1.2)' }}
      />
      {/* Sharp layer — slight blur, retains ribbon definition */}
      <canvas
        ref={sharpRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(2px) brightness(1.1)' }}
      />
    </div>
  )
}
