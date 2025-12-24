import {
  PROJECT_ID_PREFIX,
  PROJECT_NAME_PREFIX,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  GRID_DENSITY_OPTIONS,
  type GridDensityType,
} from '@/lib/constants'
import type { ElementInfo } from '@/lib/types'

const CONTENT_ELEMENT_IDS = {
  SELECTION_OVERLAY: `${PROJECT_ID_PREFIX}-selection-overlay`,
  SELECTION_BOX: `${PROJECT_ID_PREFIX}-selection-box`,
  INSTRUCTIONS_MESSAGE: `${PROJECT_ID_PREFIX}-instructions-message`,
  HIGHLIGHT_OVERLAY: `${PROJECT_ID_PREFIX}-highlight-overlay`,
} as const

;(() => {
  if (document.getElementById(CONTENT_ELEMENT_IDS.SELECTION_OVERLAY)) {
    console.warn(`${PROJECT_NAME_PREFIX} Overlay already injected, cleaning up previous instance.`)

    document.getElementById(CONTENT_ELEMENT_IDS.SELECTION_OVERLAY)?.remove()
    document.getElementById(CONTENT_ELEMENT_IDS.SELECTION_BOX)?.remove()
    document.getElementById(CONTENT_ELEMENT_IDS.INSTRUCTIONS_MESSAGE)?.remove()
  }

  let gridDensity: GridDensityType = 'default'

  chrome.storage.local.get([STORAGE_KEYS.GRID_DENSITY], (result) => {
    const stored = result[STORAGE_KEYS.GRID_DENSITY] as string | undefined
    if (stored && stored in GRID_DENSITY_OPTIONS) {
      gridDensity = stored as GridDensityType
    }
  })

  function calculateGridLines(dimension: number): number {
    const config = GRID_DENSITY_OPTIONS[gridDensity]
    const optimalLines = Math.ceil(dimension / config.minGridSpacing) + 1
    return Math.max(config.minGridLines, Math.min(config.maxGridLines, optimalLines))
  }

  function getElementsFromSelection(left: number, top: number, width: number, height: number) {
    const uniqueElements = new Set<Element>()
    const elementsInfo: ElementInfo[] = []

    const gridLinesX = calculateGridLines(width)
    const gridLinesY = calculateGridLines(height)
    const stepX = width / (gridLinesX - 1)
    const stepY = height / (gridLinesY - 1)

    selectionOverlay.style.display = 'none'
    selectionBox.style.display = 'none'
    instructionMessage.style.display = 'none'

    for (let i = 0; i < gridLinesX; i++) {
      for (let j = 0; j < gridLinesY; j++) {
        const x = left + i * stepX
        const y = top + j * stepY

        const element = document.elementFromPoint(x, y)

        if (element && !uniqueElements.has(element)) {
          if ((Object.values(CONTENT_ELEMENT_IDS) as string[]).includes(element.id)) continue

          uniqueElements.add(element)

          let textContent = element.textContent?.trim() || null
          if (textContent && textContent.length > 100) {
            textContent = textContent.substring(0, 100) + '...'
          }

          const info: ElementInfo = {
            selector: generateSelector(element),
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: Array.from(element.classList),
            textContent,
            href: (element as HTMLAnchorElement).href || null,
            src: (element as HTMLImageElement).src || null,
            alt: (element as HTMLImageElement).alt || null,
            placeholder: (element as HTMLInputElement).placeholder || null,
            sourceInfo: null,
          }

          elementsInfo.push(info)
        }
      }
    }

    selectionOverlay.style.display = ''
    selectionBox.style.display = ''

    return elementsInfo
  }

  const state = {
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  }

  const selectionOverlay = document.createElement('div')
  selectionOverlay.id = CONTENT_ELEMENT_IDS.SELECTION_OVERLAY
  selectionOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    cursor: crosshair;
    z-index: 2147483647;
    user-select: none;
  `

  const selectionBox = document.createElement('div')
  selectionBox.id = CONTENT_ELEMENT_IDS.SELECTION_BOX
  selectionBox.style.cssText = `
    position: fixed;
    border: 2px dashed #fff;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    display: none;
    z-index: 2147483647;
  `

  const instructionMessage = document.createElement('div')
  instructionMessage.id = CONTENT_ELEMENT_IDS.INSTRUCTIONS_MESSAGE
  instructionMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    text-align: center;
    z-index: 2147483647;
    pointer-events: none;
  `
  instructionMessage.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">Select a region to capture</div>
    <div style="opacity: 0.8;">Click and drag to select • Press Escape to cancel</div>
  `

  function cleanup() {
    console.info(`${PROJECT_NAME_PREFIX} Cleaning up elements and removing event listeners.`)

    selectionOverlay.remove()
    selectionBox.remove()
    instructionMessage.remove()

    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  function handleMouseDown(e: MouseEvent) {
    state.isSelecting = true
    state.startX = e.clientX
    state.startY = e.clientY
    state.currentX = e.clientX
    state.currentY = e.clientY

    instructionMessage.style.display = 'none'
    selectionBox.style.display = 'block'

    selectionBox.style.left = `${Math.min(state.startX, state.currentX)}px`
    selectionBox.style.top = `${Math.min(state.startY, state.currentY)}px`
    selectionBox.style.width = `${Math.abs(state.currentX - state.startX)}px`
    selectionBox.style.height = `${Math.abs(state.currentY - state.startY)}px`
  }

  function handleMouseMove(e: MouseEvent) {
    if (!state.isSelecting) return

    state.currentX = e.clientX
    state.currentY = e.clientY

    selectionBox.style.left = `${Math.min(state.startX, state.currentX)}px`
    selectionBox.style.top = `${Math.min(state.startY, state.currentY)}px`
    selectionBox.style.width = `${Math.abs(state.currentX - state.startX)}px`
    selectionBox.style.height = `${Math.abs(state.currentY - state.startY)}px`
  }

  function handleMouseUp(e: MouseEvent) {
    if (!state.isSelecting) return

    state.isSelecting = false
    state.currentX = e.clientX
    state.currentY = e.clientY

    const left = Math.min(state.startX, state.currentX)
    const top = Math.min(state.startY, state.currentY)
    const width = Math.abs(state.currentX - state.startX)
    const height = Math.abs(state.currentY - state.startY)

    if (width < 10 || height < 10) {
      selectionBox.style.display = 'none'
      instructionMessage.style.display = 'block'
      return
    }

    const elements = getElementsFromSelection(left, top, width, height)

    cleanup()

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.SELECTION_COMPLETE,
          coordinates: {
            x: left,
            y: top,
            width,
            height,
            devicePixelRatio: window.devicePixelRatio,
          },
          elements,
        })
      })
    })
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SELECTION_CANCELLED,
      })
      cleanup()
    }
  }

  function initializeSelectionOverlay() {
    console.info(`${PROJECT_NAME_PREFIX} Initializing selection overlay.`)

    document.body.appendChild(selectionOverlay)
    document.body.appendChild(selectionBox)
    document.body.appendChild(instructionMessage)

    selectionOverlay.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  initializeSelectionOverlay()
})()

;(() => {
  if ((window as any).__react_cursor_bridge_highlight_listener_active) {
    console.warn(`${PROJECT_NAME_PREFIX} Highlight listener already initialized.`)
    return
  }

  ;(window as any).__react_cursor_bridge_highlight_listener_active = true

  function createHighlightOverlay(rect: DOMRect): HTMLElement {
    const highlightOverlay = document.createElement('div')
    highlightOverlay.id = CONTENT_ELEMENT_IDS.HIGHLIGHT_OVERLAY
    highlightOverlay.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid rgba(239, 68, 68, 0.8);
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
    transition: all 0.15s ease-out;
    `
    return highlightOverlay
  }

  let currentHighlight: HTMLElement | null = null

  function clearHighlight() {
    if (currentHighlight) {
      currentHighlight.remove()
      currentHighlight = null
    }
    document.getElementById(CONTENT_ELEMENT_IDS.HIGHLIGHT_OVERLAY)?.remove()
  }

  function highlightElement(selector: string) {
    clearHighlight()

    try {
      const element = document.querySelector(selector)

      if (element) {
        const rect = element.getBoundingClientRect()
        currentHighlight = createHighlightOverlay(rect)
        document.body.appendChild(currentHighlight)

        const isInViewport =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth

        if (!isInViewport) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            if (currentHighlight) {
              const newRect = element.getBoundingClientRect()
              currentHighlight.style.left = `${newRect.left}px`
              currentHighlight.style.top = `${newRect.top}px`
              currentHighlight.style.width = `${newRect.width}px`
              currentHighlight.style.height = `${newRect.height}px`
            }
          }, 500)
        }
      }
    } catch (error) {
      console.error(`${PROJECT_NAME_PREFIX} Failed to highlight element:`, error)
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.HIGHLIGHT_ELEMENT) {
      highlightElement(message.selector)
    } else if (message.type === MESSAGE_TYPES.CLEAR_HIGHLIGHT) {
      clearHighlight()
    }
  })

  console.info(`${PROJECT_NAME_PREFIX} Highlight listener initialized.`)
})()

function generateSelector(element: Element): string {
  const path: string[] = []
  let current: Element | null = element

  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector += `#${current.id}`
      path.unshift(selector)
      break
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  if (path[0] !== 'html' && path[0]?.indexOf('#') === -1) {
    path.unshift('html')
  }

  return path.join(' > ')
}
