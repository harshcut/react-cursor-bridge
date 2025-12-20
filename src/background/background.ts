import { MESSAGE_TYPES, PROJECT_NAME_PREFIX } from '@/lib/constants'

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(`${PROJECT_NAME_PREFIX} Failed to set panel behavior:`, error))

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.START_CAPTURE) {
    injectSelectionScript()
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
