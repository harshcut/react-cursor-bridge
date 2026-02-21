import { useState, useEffect, useMemo, useRef } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { GRID_DENSITY_OPTIONS, STORAGE_KEYS } from '@/lib/constants'
import type { GridDensityType } from '@/lib/types'

export default function GridDensitySetting() {
  const [density, setDensity] = useState<GridDensityType>('default')

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.GRID_DENSITY], (result) => {
      const stored = result[STORAGE_KEYS.GRID_DENSITY] as string | undefined
      if (stored && stored in GRID_DENSITY_OPTIONS) {
        setDensity(stored as GridDensityType)
      }
    })
  }, [])

  const handleDensityChange = (value: string) => {
    if (value in GRID_DENSITY_OPTIONS) {
      const newDensity = value as GridDensityType
      setDensity(newDensity)
      chrome.storage.local.set({ [STORAGE_KEYS.GRID_DENSITY]: newDensity })
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-zinc-700">Grid Density</label>
      <p className="text-xs text-zinc-500 text-pretty">
        Controls how thoroughly elements are detected in the selected area.
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        value={density}
        onValueChange={handleDensityChange}
        className="w-full mt-2 mb-4"
      >
        {(Object.keys(GRID_DENSITY_OPTIONS) as GridDensityType[]).map((key) => (
          <ToggleGroupItem key={key} value={key} className="flex-1 capitalize">
            {key}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <GridPreview density={density} />
    </div>
  )
}

const PREVIEW_GRID_LINES: Record<GridDensityType, { x: number; y: number }> = {
  compact: { x: 10, y: 6 },
  default: { x: 7, y: 5 },
  loose: { x: 5, y: 4 },
}

function GridPreview({ density }: { density: GridDensityType }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const padding = 4
  const cornerRadius = 6
  const baseWidth = 260
  const contentHeight = 140
  const contentWidth = containerWidth > 0 ? containerWidth : baseWidth
  const viewBoxWidth = contentWidth + padding * 2
  const viewBoxHeight = contentHeight + padding * 2

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const gridLines = PREVIEW_GRID_LINES[density]

  const points = useMemo(() => {
    const pts: { x: number; y: number; key: string; distFromCenter: number }[] = []
    const centerX = contentWidth / 2
    const centerY = contentHeight / 2

    const xSpacing = baseWidth / (gridLines.x - 1)
    const xCount = Math.floor(contentWidth / xSpacing) + 1
    const yCount = gridLines.y

    const gridWidth = (xCount - 1) * xSpacing
    const xOffset = (contentWidth - gridWidth) / 2

    const xMid = (xCount - 1) / 2
    const yMid = (yCount - 1) / 2

    for (let i = 0; i < xCount; i++) {
      for (let j = 0; j < yCount; j++) {
        const x = padding + xOffset + i * xSpacing
        const normY = j / (yCount - 1)
        const y = padding + normY * contentHeight

        const distFromCenter = Math.sqrt(
          Math.pow(x - padding - centerX, 2) + Math.pow(y - padding - centerY, 2)
        )

        const keyX = i - xMid
        const keyY = j - yMid
        pts.push({ x, y, key: `p-${keyX}-${keyY}`, distFromCenter })
      }
    }
    return pts
  }, [gridLines.x, gridLines.y, contentWidth])

  return (
    <div ref={containerRef} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3.5">
      {containerWidth > 0 && (
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={padding}
            y={padding}
            width={contentWidth}
            height={contentHeight}
            fill="none"
            rx={cornerRadius}
          />
          {points.map(({ x, y, key, distFromCenter }) => (
            <circle
              key={key}
              cx="0"
              cy="0"
              r="2.5"
              fill="oklch(0.97 0.00 286)"
              className="transition-transform duration-500 ease-out"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <animate
                attributeName="r"
                values="1;3;1"
                dur="1.5s"
                repeatCount="indefinite"
                begin={`${distFromCenter * 0.01}s`}
              />
              <animate
                attributeName="fill"
                values="oklch(0.97 0.00 286);oklch(0.71 0.01 286);oklch(0.97 0.00 286)"
                dur="1.5s"
                repeatCount="indefinite"
                begin={`${distFromCenter * 0.01}s`}
              />
            </circle>
          ))}
        </svg>
      )}
    </div>
  )
}
