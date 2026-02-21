import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PROJECT_NAME_PREFIX, DEFAULT_SYSTEM_PROMPT, STORAGE_KEYS } from './constants'
import type { ElementInfo, FileGroup } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function groupElementsByFile(elements: ElementInfo[]): FileGroup[] {
  const fileMap = new Map<string, { elements: ElementInfo[]; components: Set<string> }>()
  const noSourceElements: ElementInfo[] = []

  elements.forEach((element) => {
    const filePath = element.sourceInfo?.file?.replace(/^webpack:\/\/\//, '') || null

    if (!filePath || element.sourceInfo?.type === 'not_found') {
      noSourceElements.push(element)
      return
    }

    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, { elements: [], components: new Set() })
    }

    const group = fileMap.get(filePath)!
    group.elements.push(element)

    if (element.sourceInfo?.componentName && typeof element.sourceInfo.componentName === 'string') {
      group.components.add(element.sourceInfo.componentName)
    }
  })

  const groups: FileGroup[] = []

  Array.from(fileMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([filePath, { elements, components }]) => {
      groups.push({
        filePath,
        fileName: filePath.split('/').pop() || filePath,
        elements,
        components: Array.from(components).sort(),
      })
    })

  if (noSourceElements.length > 0) {
    groups.push({
      filePath: '',
      fileName: 'Unknown Source',
      elements: noSourceElements,
      components: [],
    })
  }

  return groups
}

export function downloadScreenshot(dataUrl: string, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        const listener = (delta: chrome.downloads.DownloadDelta) => {
          if (delta.id === downloadId && delta.state) {
            if (delta.state.current === 'complete') {
              chrome.downloads.onChanged.removeListener(listener)
              chrome.downloads.search({ id: downloadId }, (results) => {
                if (results && results.length > 0 && results[0].filename) {
                  resolve(results[0].filename)
                } else {
                  resolve(`~/Downloads/${filename}`)
                }
              })
            } else if (delta.state.current === 'interrupted') {
              chrome.downloads.onChanged.removeListener(listener)
              reject(
                new Error(`${PROJECT_NAME_PREFIX} Download was interrupted. Please try again.`)
              )
            }
          }
        }

        chrome.downloads.onChanged.addListener(listener)
      }
    )
  })
}

export function generateCursorDeeplink(promptText: string): string {
  return `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(promptText)}`
}

export async function generateCursorPrompt(
  userContext: string,
  screenshotPath: string,
  sourcePaths: string[]
): Promise<string> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.SYSTEM_PROMPT])
  const systemPrompt = stored[STORAGE_KEYS.SYSTEM_PROMPT] ?? DEFAULT_SYSTEM_PROMPT

  const sourceFilesSection =
    sourcePaths.length > 0
      ? `## Relevant Source Files
The following files have been identified as relevant to the UI components in the screenshot. Please review these files to understand the implementation details.
${sourcePaths.map((p) => `- \`${p}\``).join('\n')}`
      : ''

  return `## User Request
${userContext}

## Visual Reference
I've captured a screenshot of the relevant UI area. You can find it at:
${screenshotPath}

${sourceFilesSection}

${systemPrompt}
`
}
