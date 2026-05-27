import { useEffect, useRef, useState } from 'react'

// Opening animation, ported from the design bundle (opening.jsx).
// 1) the real signature draws in on cream paper as one continuous pen motion
// 2) six Fourier basis waves derived from the signature's own y-profile
//    emerge from its vertical center and split — three up, three down

const PAPER = '#f5f1e8'
const PAPER2 = '#ede7d4'
const INK = '#15140f'
const RED = '#7a1c1c'

const W = 1280
const H = 720

const SIG_START = 0.2
const SIG_DURATION = 1.5
const FOURIER_START = SIG_START + SIG_DURATION + 0.05 // 1.75
const CURTAIN_START = FOURIER_START + 0.18
const CURTAIN_DURATION = 1.75
const TOTAL_DURATION = CURTAIN_START + CURTAIN_DURATION + 0.35

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeInCubic = (t: number) => t * t * t
const easeFastSlowFast = (t: number) => {
  const peaked =
    t < 0.5
      ? 0.5 * (1 - Math.pow(1 - 2 * t, 3))
      : 0.5 + 0.5 * Math.pow(2 * t - 1, 3)
  return 0.3 * peaked + 0.7 * t
}

type SigPath = { d: string; length: number; startOffset: number }
type SigData = {
  width: number
  height: number
  paths: SigPath[]
  totalLength: number
  coeffs: { k: number; a: number; b: number }[]
  profile: number[]
}

const usePlaybackTime = (duration: number, onComplete: () => void) => {
  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const raf = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)
  const timeRef = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    if (!isPlaying) {
      lastTs.current = null
      return
    }

    const step = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const delta = (ts - lastTs.current) / 1000
      lastTs.current = ts

      const next = Math.min(duration, timeRef.current + delta)
      timeRef.current = next
      setTime(next)

      if (next >= duration) {
        setIsPlaying(false)
        if (!done.current) {
          done.current = true
          onComplete()
        }
        return
      }

      raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [duration, isPlaying, onComplete])

  return {
    time,
  }
}

const useSignatureData = () => {
  const [data, setData] = useState<SigData | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/signature-paths.json')
        const json = await res.json()
        if (cancelled) return
        const tmp = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        )
        tmp.style.cssText =
          'position:absolute;left:-9999px;top:-9999px;visibility:hidden'
        document.body.appendChild(tmp)
        let cum = 0
        for (const p of json.paths) {
          const el = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          )
          el.setAttribute('d', p.d)
          tmp.appendChild(el)
          p.length = el.getTotalLength()
          p.startOffset = cum
          cum += p.length
        }
        document.body.removeChild(tmp)
        json.totalLength = cum
        if (!cancelled) setData(json)
      } catch (e) {
        console.error('sig load:', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return data
}

const Signature = ({
  time,
  data,
  centerY,
}: {
  time: number
  data: SigData
  centerY: number
}) => {
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const writeT = clamp01((time - SIG_START) / SIG_DURATION)
  const drawT = easeFastSlowFast(writeT)

  const DISPLAY_W = 820
  const DISPLAY_H = (DISPLAY_W * data.height) / data.width

  // pen tip
  let penPt: { x: number; y: number } | null = null
  if (writeT > 0.005 && writeT < 0.998) {
    const globalDraw = drawT * data.totalLength
    let activeIdx = -1
    for (let i = 0; i < data.paths.length; i++) {
      const p = data.paths[i]
      if (
        globalDraw >= p.startOffset &&
        globalDraw < p.startOffset + p.length
      ) {
        activeIdx = i
        break
      }
    }
    if (activeIdx >= 0) {
      const p = data.paths[activeIdx]
      const local = globalDraw - p.startOffset
      const el = pathRefs.current[activeIdx]
      if (el && el.getPointAtLength) {
        try {
          const pt = el.getPointAtLength(local)
          penPt = { x: pt.x, y: pt.y }
        } catch {
          // ignore
        }
      }
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: (W - DISPLAY_W) / 2,
        top: centerY - DISPLAY_H / 2,
        width: DISPLAY_W,
        height: DISPLAY_H,
      }}
    >
      <svg
        width={DISPLAY_W}
        height={DISPLAY_H}
        viewBox={`0 0 ${data.width} ${data.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}
      >
        {data.paths.map((p, i) => {
          const globalDraw = drawT * data.totalLength
          const local = clamp01((globalDraw - p.startOffset) / p.length)
          return (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el
              }}
              d={p.d}
              fill="none"
              stroke={INK}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={p.length}
              strokeDashoffset={p.length * (1 - local)}
            />
          )
        })}
        {penPt && (
          <g style={{ pointerEvents: 'none' }}>
            <circle
              cx={penPt.x}
              cy={penPt.y}
              r="14"
              fill={RED}
              fillOpacity="0.1"
            />
            <circle
              cx={penPt.x}
              cy={penPt.y}
              r="7"
              fill={RED}
              fillOpacity="0.22"
            />
            <circle cx={penPt.x} cy={penPt.y} r="3.2" fill={RED} />
          </g>
        )}
      </svg>
    </div>
  )
}

const WAVE_W = 880
const WAVE_X = (W - WAVE_W) / 2

const buildMorphPath = (
  c: { k: number; a: number; b: number },
  profile: number[],
  morph: number
) => {
  const N = 240
  let d = ''
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const yBasis =
      c.a * Math.cos(2 * Math.PI * c.k * u) +
      c.b * Math.sin(2 * Math.PI * c.k * u)
    const profIdx = Math.round(u * (profile.length - 1))
    const yProf = profile[profIdx] ?? 0
    const y = yProf + (yBasis - yProf) * morph
    const x = u * WAVE_W
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `
  }
  return d
}

const BasisWave = ({
  time,
  c,
  profile,
  idx,
  slot,
  dir,
  centerY,
}: {
  time: number
  c: { k: number; a: number; b: number }
  profile: number[]
  idx: number
  slot: 1 | 2 | 3
  dir: 'up' | 'down'
  centerY: number
}) => {
  const fadeInAt = FOURIER_START + idx * 0.03
  const fadeIn = easeOutCubic(clamp01((time - fadeInAt) / 0.22))

  const moveAt = FOURIER_START + 0.18 + idx * 0.05
  const move = easeInOutCubic(clamp01((time - moveAt) / 0.85))

  const slotDist = { 1: 130, 2: 200, 3: 270 }[slot]
  const sign = dir === 'up' ? -1 : 1
  const curtain = easeInCubic(clamp01((time - CURTAIN_START) / CURTAIN_DURATION))
  const pullDist = H * 1.45 + slot * 90
  const finalY = centerY + sign * slotDist
  const splitY = centerY + (finalY - centerY) * move
  const currentY = splitY + sign * pullDist * curtain

  const d = buildMorphPath(c, profile, move)
  const amp = Math.sqrt(c.a * c.a + c.b * c.b)
  const strokeW = 0.9 + 1.4 * Math.min(1, amp / 40)
  const opacity = fadeIn * (1 - curtain * 0.18)

  return (
    <svg
      width={WAVE_W}
      height={200}
      style={{
        position: 'absolute',
        left: WAVE_X,
        top: currentY - 100,
        opacity,
        pointerEvents: 'none',
      }}
      viewBox={`0 -100 ${WAVE_W} 200`}
    >
      <path
        d={d}
        fill="none"
        stroke={INK}
        strokeOpacity={0.8 - idx * 0.04}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
    </svg>
  )
}

const CurtainPanel = ({
  side,
  progress,
}: {
  side: 'top' | 'bottom'
  progress: number
}) => {
  const direction = side === 'top' ? -1 : 1
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        [side]: 0,
        height: '50vh',
        background: PAPER,
        transform: `translateY(${direction * progress * 108}%)`,
        transition: 'none',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            side === 'top'
              ? `radial-gradient(circle at 30% 20%, ${PAPER2}aa, transparent 60%)`
              : `radial-gradient(circle at 70% 80%, ${PAPER2}88, transparent 55%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          [side === 'top' ? 'bottom' : 'top']: 0,
          height: 18,
          boxShadow:
            side === 'top'
              ? '0 14px 28px rgba(21, 20, 15, 0.16)'
              : '0 -14px 28px rgba(21, 20, 15, 0.14)',
        }}
      />
    </div>
  )
}

const useFit = () => {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(window.innerWidth / W, window.innerHeight / H, 1)
      )
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

export default function Opening({ onComplete }: { onComplete: () => void }) {
  const data = useSignatureData()
  const playback = usePlaybackTime(TOTAL_DURATION, onComplete)
  const { time } = playback
  const scale = useFit()
  const centerY = H / 2
  const curtain = easeInOutCubic(clamp01((time - CURTAIN_START) / CURTAIN_DURATION))
  const signatureOpacity = 1 - easeOutCubic(clamp01((time - CURTAIN_START + 0.08) / 0.85))

  let assigned: ({
    k: number
    a: number
    b: number
    slot: 1 | 2 | 3
    dir: 'up' | 'down'
  })[] = []
  if (data) {
    const sorted = [...data.coeffs].sort((a, b) => {
      const ampA = Math.sqrt(a.a * a.a + a.b * a.b)
      const ampB = Math.sqrt(b.a * b.a + b.b * b.b)
      return ampB - ampA
    })
    const layout: { slot: 1 | 2 | 3; dir: 'up' | 'down' }[] = [
      { dir: 'up', slot: 1 },
      { dir: 'down', slot: 1 },
      { dir: 'up', slot: 2 },
      { dir: 'down', slot: 2 },
      { dir: 'up', slot: 3 },
      { dir: 'down', slot: 3 },
    ]
    assigned = sorted.slice(0, 6).map((c, i) => ({ ...c, ...layout[i] }))
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <CurtainPanel side="top" progress={curtain} />
      <CurtainPanel side="bottom" progress={curtain} />
      <div
        style={{
          width: W,
          height: H,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          background: 'transparent',
          overflow: 'hidden',
        }}
      >
        <div style={{ opacity: signatureOpacity }}>
          {data && <Signature time={time} data={data} centerY={centerY} />}
        </div>
        {data &&
          assigned.map((c, i) => (
            <BasisWave
              key={i}
              time={time}
              c={c}
              profile={data.profile}
              idx={i}
              slot={c.slot}
              dir={c.dir}
              centerY={centerY}
            />
          ))}
      </div>
    </div>
  )
}
