import type { GridDensityType } from './types'

export const MESSAGE_TYPES = {
  START_CAPTURE: 'START_CAPTURE',
  SELECTION_COMPLETE: 'SELECTION_COMPLETE',
  SELECTION_CANCELLED: 'SELECTION_CANCELLED',
  HIGHLIGHT_ELEMENT: 'HIGHLIGHT_ELEMENT',
  CLEAR_HIGHLIGHT: 'CLEAR_HIGHLIGHT',
} as const

export const PROJECT_ID_PREFIX = 'react-cursor-bridge'

export const PROJECT_NAME_PREFIX = '[React Cursor Bridge]:'

export const STORAGE_KEYS = {
  CAPTURED_IMAGE: 'CAPTURED_IMAGE',
  CAPTURED_ELEMENTS: 'CAPTURED_ELEMENTS',
  GRID_DENSITY: 'GRID_DENSITY',
} as const

export const GRID_DENSITY_OPTIONS: Record<
  GridDensityType,
  { minGridSpacing: number; minGridLines: number; maxGridLines: number }
> = {
  loose: { minGridSpacing: 50, minGridLines: 2, maxGridLines: 8 },
  default: { minGridSpacing: 25, minGridLines: 3, maxGridLines: 12 },
  compact: { minGridSpacing: 10, minGridLines: 6, maxGridLines: 30 },
} as const
