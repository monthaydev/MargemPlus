"use client"

import { useEffect, useRef, useState } from "react"

export function useCountUp(
  target: number,
  duration = 700,
  decimals = 1
): number {
  const [current, setCurrent] = useState(0)
  const frameRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    startRef.current = null

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(parseFloat((eased * target).toFixed(decimals)))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration, decimals])

  return current
}
