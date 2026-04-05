import { useRef, useEffect, useCallback } from 'react'

const CELL = 5
const GAP = 1
const SZ = CELL + GAP

// Bitmap font — each char is 5 wide x 7 tall
const FONT: Record<string, number[]> = {
  s: [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  u: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  n: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  g: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  j: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  a: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  e: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
}
const CHAR_W = 5
const CHAR_H = 7
const CHAR_GAP = 2

function textPixelWidth(text: string): number {
  return text.length * (CHAR_W + CHAR_GAP) - CHAR_GAP
}

interface Props {
  onComplete: () => void
}

type Phase = 'gol' | 'converge' | 'hold' | 'fade'

/*
  Two-rule blend cellular automaton:

  Background rule (B3/S2)     — standard birth, stricter survival (cells die easier)
  Text rule      (B2,3/S1-4)  — easier birth, very sticky survival

  During the 'converge' phase, blend ∈ [0,1] ramps up.
  Each cell picks which rule to use based on:
    - target cells use lerp(background, textRule, blend)
    - non-target cells use lerp(background, harsherRule, blend)

  The lerp is implemented as: for a given (alive, neighbors) pair,
  we compute survival/birth under both rules, then pick based on
  a threshold comparison with blend.
*/

// Rule: given neighbor count, return sets of counts that cause birth / survival
// Background: B3/S23 (normal GoL)
function bgRule(alive: number, nb: number): number {
  return alive ? (nb === 2 || nb === 3 ? 1 : 0) : (nb === 3 ? 1 : 0)
}
// Text attractor: B23/S1234 — easy to be born near text, very hard to die
function textRule(alive: number, nb: number): number {
  return alive ? (nb >= 1 && nb <= 4 ? 1 : 0) : (nb === 2 || nb === 3 ? 1 : 0)
}
// Harsh background: B3/S2 — cells die faster in the background
function harshRule(alive: number, nb: number): number {
  return alive ? (nb === 2 ? 1 : 0) : (nb === 3 ? 1 : 0)
}

export default function CellularAutomataIntro({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{
    grid: Uint8Array
    cols: number
    rows: number
    gen: number
    phase: Phase
    phaseTime: number
    fadeOpacity: number
    isTarget: Uint8Array  // flat bool array
    blend: number
  } | null>(null)

  const init = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'

    const cols = Math.floor(w / SZ)
    const rows = Math.floor(h / SZ)
    const grid = new Uint8Array(cols * rows)

    for (let i = 0; i < grid.length; i++) {
      grid[i] = Math.random() < 0.3 ? 1 : 0
    }

    // Build target lookup
    const text = 'sung jae'
    const tw = textPixelWidth(text)
    const ox = Math.floor((cols - tw) / 2)
    const oy = Math.floor((rows - CHAR_H) / 2)

    const isTarget = new Uint8Array(cols * rows)
    let cx = ox
    for (const ch of text) {
      const charRows = FONT[ch]
      if (!charRows) { cx += CHAR_W + CHAR_GAP; continue }
      for (let r = 0; r < CHAR_H; r++) {
        for (let c = 0; c < CHAR_W; c++) {
          if (charRows[r] & (1 << (CHAR_W - 1 - c))) {
            isTarget[(oy + r) * cols + (cx + c)] = 1
          }
        }
      }
      cx += CHAR_W + CHAR_GAP
    }

    stateRef.current = {
      grid, cols, rows, gen: 0,
      phase: 'gol', phaseTime: 0, fadeOpacity: 1,
      isTarget, blend: 0,
    }
  }, [])

  const step = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    const { grid, cols, rows, isTarget, blend } = s
    const next = new Uint8Array(cols * rows)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Count neighbors
        let nb = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            nb += grid[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)]
          }
        }

        const idx = y * cols + x
        const alive = grid[idx]
        const onTarget = isTarget[idx]

        // Pure GoL when blend = 0
        const base = bgRule(alive, nb)

        if (blend === 0) {
          next[idx] = base
        } else {
          // Blend between base rule and spatially-varying rule
          const variant = onTarget ? textRule(alive, nb) : harshRule(alive, nb)

          if (base === variant) {
            // Both rules agree
            next[idx] = base
          } else {
            // Rules disagree — blend decides who wins
            // Use a deterministic-ish hash so it doesn't flicker randomly each frame
            const hash = ((x * 7919 + y * 104729 + s.gen * 31) & 0xffff) / 0xffff
            next[idx] = hash < blend ? variant : base
          }
        }
      }
    }
    s.grid = next
    s.gen++
  }, [])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current
    if (!s) return
    const { grid, cols, rows, isTarget, fadeOpacity, blend } = s
    const dpr = window.devicePixelRatio || 1

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!grid[y * cols + x]) continue
        const onTarget = isTarget[y * cols + x]
        // Target cells brighten as text crystallizes
        const brightness = onTarget
          ? 0.4 + blend * 0.5
          : 0.2 + (1 - blend) * 0.25
        const alpha = brightness * fadeOpacity
        ctx.fillStyle = onTarget && blend > 0.4
          ? `rgba(210, 190, 255, ${alpha})`
          : `rgba(167, 139, 250, ${alpha})`
        ctx.fillRect(x * SZ, y * SZ, CELL, CELL)
      }
    }
    ctx.restore()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    init(canvas)

    let raf: number
    let last = 0

    const TICK = 40          // ms per generation
    const GOL_GENS = 15      // pure GoL before blend
    const CONVERGE_GENS = 30 // convergence generations
    const HOLD_MS = 500      // pause after fully formed
    const FADE_SPEED = 0.04

    const loop = (t: number) => {
      const s = stateRef.current
      if (!s) return
      const dt = t - last

      switch (s.phase) {
        case 'gol':
          if (dt > TICK) {
            step()
            last = t
            if (s.gen >= GOL_GENS) {
              s.phase = 'converge'
              s.phaseTime = 0
            }
          }
          break

        case 'converge':
          if (dt > TICK) {
            s.phaseTime++
            // Front-loaded ease-out curve — text emerges fast, then settles
            const linear = Math.min(1, s.phaseTime / CONVERGE_GENS)
            s.blend = 1 - (1 - linear) * (1 - linear)
            step()
            last = t
            if (s.phaseTime >= CONVERGE_GENS) {
              s.blend = 1
              // Guarantee every target cell is alive
              for (let i = 0; i < s.isTarget.length; i++) {
                if (s.isTarget[i]) s.grid[i] = 1
              }
              s.phase = 'hold'
              s.phaseTime = 0
              last = t
            }
          }
          break

        case 'hold':
          // Clean 500ms pause on the fully formed text
          s.phaseTime += dt
          last = t
          if (s.phaseTime >= HOLD_MS) {
            s.phase = 'fade'
          }
          break

        case 'fade':
          s.fadeOpacity -= FADE_SPEED
          if (s.fadeOpacity <= 0) {
            s.fadeOpacity = 0
            draw(ctx)
            onComplete()
            return
          }
          break
      }

      draw(ctx)
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [init, step, draw, onComplete])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 cursor-pointer"
      onClick={onComplete}
      style={{ background: '#0a0a0a' }}
    />
  )
}
