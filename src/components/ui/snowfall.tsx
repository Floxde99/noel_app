"use client"

import { useEffect, useState } from "react"

export function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: string; animationDuration: string; opacity: number }>>([])

  useEffect(() => {
    const count = 50
    const newSnowflakes = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 3 + 2}s`,
      opacity: Math.random(),
    }))
    setSnowflakes(newSnowflakes)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-[-10px] w-2 h-2 bg-white rounded-full animate-snowfall"
          style={{
            left: flake.left,
            animationDuration: flake.animationDuration,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  )
}
