import { PROJECT_ID_PREFIX, PROJECT_NAME_PREFIX, MESSAGE_TYPES } from '@/lib/constants'
import type { ElementInfo } from '@/lib/types'

const CONTENT_ELEMENT_IDS = {
  SELECTION_OVERLAY: `${PROJECT_ID_PREFIX}-selection-overlay`,
  SELECTION_BOX: `${PROJECT_ID_PREFIX}-selection-box`,
  INSTRUCTIONS_MESSAGE: `${PROJECT_ID_PREFIX}-instructions-message`,
} as const

;(() => {
  if (document.getElementById(CONTENT_ELEMENT_IDS.SELECTION_OVERLAY)) {
    console.warn(`${PROJECT_NAME_PREFIX} Overlay already injected, cleaning up previous instance.`)

    document.getElementById(CONTENT_ELEMENT_IDS.SELECTION_OVERLAY)?.remove()
    document.getElementById(CONTENT_ELEMENT_IDS.SELECTION_BOX)?.remove()
    document.getElementById(CONTENT_ELEMENT_IDS.INSTRUCTIONS_MESSAGE)?.remove()
  }

  function calculateGridLines(dimension: number): number {
    const MIN_GRID_SPACING = 25
    const MIN_GRID_LINES = 3
    const MAX_GRID_LINES = 12

    const optimalLines = Math.ceil(dimension / MIN_GRID_SPACING) + 1
    return Math.max(MIN_GRID_LINES, Math.min(MAX_GRID_LINES, optimalLines))
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
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: Array.from(element.classList),
            textContent,
            href: (element as HTMLAnchorElement).href || null,
            src: (element as HTMLImageElement).src || null,
            alt: (element as HTMLImageElement).alt || null,
            placeholder: (element as HTMLInputElement).placeholder || null,
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
