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
  SYSTEM_PROMPT: 'SYSTEM_PROMPT',
} as const

export const GRID_DENSITY_OPTIONS: Record<
  GridDensityType,
  { minGridSpacing: number; minGridLines: number; maxGridLines: number }
> = {
  loose: { minGridSpacing: 50, minGridLines: 2, maxGridLines: 8 },
  default: { minGridSpacing: 25, minGridLines: 3, maxGridLines: 12 },
  compact: { minGridSpacing: 10, minGridLines: 6, maxGridLines: 30 },
} as const

export const DEFAULT_SYSTEM_PROMPT = `## Instructions
Please approach this task with the following steps:
1.  **Visual Decomposition**: Analyze the screenshot to identify the key UI components and layout structure.
2.  **Code Mapping**: Correlate the visual elements with the provided source files. Determine which code blocks correspond to the parts of the UI relevant to the user's request.
3.  **Implementation/Resolution**:
    *   If the request involves a **change**: Provide the specific code modifications needed, ensuring they align with the existing design system and codebase patterns.
    *   If the request is a **question**: Provide a detailed explanation referencing both the visual and code aspects.
**Important**: Ensure all code suggestions are syntactically correct and follow best practices for React and JavaScript/TypeScript.`
