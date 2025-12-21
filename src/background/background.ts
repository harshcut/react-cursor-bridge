import { MESSAGE_TYPES, PROJECT_NAME_PREFIX, STORAGE_KEYS } from '@/lib/constants'
import type { ElementInfo, SelectionCoordinates } from '@/lib/types'
import { cropImage } from './image-utils'

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(`${PROJECT_NAME_PREFIX} Failed to set panel behavior:`, error))

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === MESSAGE_TYPES.START_CAPTURE) {
    injectSelectionScript()
  } else if (message.type === MESSAGE_TYPES.SELECTION_COMPLETE) {
    afterSelection(message.coordinates, message.elements, sender.tab?.id, sender.tab?.windowId)
  } else if (message.type === MESSAGE_TYPES.HIGHLIGHT_ELEMENT) {
    relayToActiveTab(message)
  } else if (message.type === MESSAGE_TYPES.CLEAR_HIGHLIGHT) {
    relayToActiveTab(message)
  }
})

async function injectSelectionScript() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tab?.id) return

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    })
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Failed to inject content script:`, error)
  }
}

async function relayToActiveTab(message: any) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tab?.id) return

    await chrome.tabs.sendMessage(tab.id, message)
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Failed to relay message to content script:`, error)
  }
}

async function afterSelection(
  coordinates: SelectionCoordinates,
  elements: ElementInfo[],
  tabId?: number,
  windowId?: number
) {
  if (!tabId || !windowId) return

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png',
    })

    await chrome.storage.local.set({
      [STORAGE_KEYS.CAPTURED_IMAGE]: await cropImage(dataUrl, coordinates),
      [STORAGE_KEYS.CAPTURED_ELEMENTS]: elements,
    })
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Failed to handle selection complete:`, error)
  }
}
