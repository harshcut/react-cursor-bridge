import { SourceMapConsumer } from 'source-map-js'
import { PROJECT_NAME_PREFIX } from '@/lib/constants'
import type { SourceInfo, ElementInfo } from '@/lib/types'

const DEBUGGER_VERSION = '1.3'

const sourceMapCache = new Map<string, SourceMapConsumer>()
const scriptSourceMapUrls = new Map<string, string>()

interface ReactSourceInfo {
  type: 'exact' | 'fuzzy'
  fileName: string | null
  lineNumber: number | null
  componentName: string | null
  error?: string
}

function findReactSourceInfoScript(selector: string): ReactSourceInfo | null {
  try {
    const domNode = document.querySelector(selector)
    if (!domNode) return null

    const key = Object.keys(domNode).find((k) => k.startsWith('__reactFiber$'))
    if (!key)
      return {
        type: 'fuzzy',
        fileName: null,
        lineNumber: null,
        componentName: null,
        error: 'Not a React element',
      }

    let fiber = (domNode as unknown as Record<string, unknown>)[key] as {
      type: unknown
      return: unknown
      _debugSource?: { fileName: string; lineNumber: number }
    } | null

    const isComponent = (f: typeof fiber): boolean =>
      f !== null && (typeof f.type === 'function' || typeof f.type === 'object')

    const isThirdPartySource = (fileName: string | null | undefined): boolean => {
      if (!fileName) return false
      return (
        fileName.includes('node_modules') ||
        fileName.includes('/npm/') ||
        fileName.includes('\\npm\\') ||
        fileName.startsWith('webpack/') ||
        fileName.includes('/.pnpm/') ||
        fileName.includes('\\.pnpm\\')
      )
    }

    const getComponentName = (f: typeof fiber): string => {
      if (!f) return 'Anonymous'
      if (typeof f.type === 'function') {
        return (
          (f.type as { name?: string; displayName?: string }).name ||
          (f.type as { displayName?: string }).displayName ||
          'Anonymous'
        )
      } else if (typeof f.type === 'object' && f.type !== null) {
        const fiberType = f.type as {
          displayName?: string
          render?: { name?: string }
        }
        return fiberType.displayName || (fiberType.render && fiberType.render.name) || 'Anonymous'
      }
      return 'Anonymous'
    }

    let userComponent: typeof fiber = null
    let fallbackComponent: typeof fiber = null

    while (fiber) {
      if (isComponent(fiber)) {
        if (!fallbackComponent) {
          fallbackComponent = fiber
        }

        const debugSource = fiber._debugSource
        if (debugSource && !isThirdPartySource(debugSource.fileName)) {
          userComponent = fiber
          break
        }

        const name = getComponentName(fiber)

        if (!debugSource && name !== 'Anonymous' && !fallbackComponent) {
          fallbackComponent = fiber
        }
      }

      fiber = fiber.return as typeof fiber
    }

    const targetFiber = userComponent || fallbackComponent

    if (!targetFiber) {
      return {
        type: 'fuzzy',
        fileName: null,
        lineNumber: null,
        componentName: null,
        error: 'Could not find parent component',
      }
    }

    const debugSource = targetFiber._debugSource
    const componentName = getComponentName(targetFiber)

    const isUserSource = debugSource && !isThirdPartySource(debugSource.fileName)

    return {
      type: isUserSource ? 'exact' : 'fuzzy',
      fileName: isUserSource ? debugSource.fileName : null,
      lineNumber: isUserSource ? debugSource.lineNumber : null,
      componentName: componentName || 'Anonymous',
    }
  } catch {
    return null
  }
}

async function resolveViaFuzzyMatch(
  tabId: number,
  componentName: string
): Promise<SourceInfo | null> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url) return null

    for (const [scriptId, scriptUrl] of scriptSourceMapUrls) {
      try {
        if (!scriptUrl.includes('.js')) continue

        const scriptSource = await sendCommand<{ scriptSource: string }>(
          tabId,
          'Debugger.getScriptSource',
          { scriptId }
        )

        const sourceMapUrl = extractSourceMapUrl(scriptSource.scriptSource)
        if (!sourceMapUrl) continue

        const consumer = await fetchSourceMap(sourceMapUrl, scriptUrl)
        if (!consumer) continue

        const sources = consumer.sources || []
        const matches = sources.filter((filePath) => {
          if (isThirdPartySource(filePath)) {
            return false
          }
          return (
            filePath.includes(`/${componentName}.`) ||
            filePath.includes(`/${componentName}/index.`) ||
            filePath.endsWith(`${componentName}.tsx`) ||
            filePath.endsWith(`${componentName}.jsx`) ||
            filePath.endsWith(`${componentName}.ts`) ||
            filePath.endsWith(`${componentName}.js`)
          )
        })

        if (matches.length > 0) {
          const bestMatch = matches[0]

          return {
            type: 'fuzzy',
            resolution: 'fuzzy',
            file: bestMatch,
            line: null,
            column: null,
            componentName,
          }
        }
      } catch {}
    }

    return null
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Fuzzy match failed:`, error)
    return null
  }
}

async function fetchSourceMap(
  mapUrl: string,
  scriptUrl: string
): Promise<SourceMapConsumer | null> {
  const resolvedUrl = resolveSourceMapUrl(mapUrl, scriptUrl)

  if (sourceMapCache.has(resolvedUrl)) {
    return sourceMapCache.get(resolvedUrl)!
  }

  try {
    let mapJson: unknown

    if (resolvedUrl.startsWith('data:')) {
      const base64Match = resolvedUrl.match(/^data:application\/json;base64,(.+)$/)
      if (base64Match) {
        const decoded = atob(base64Match[1])
        mapJson = JSON.parse(decoded)
      } else {
        console.error(`${PROJECT_NAME_PREFIX} Invalid data URL format:`, resolvedUrl)
        return null
      }
    } else {
      const response = await fetch(resolvedUrl)
      if (!response.ok) {
        console.error(`${PROJECT_NAME_PREFIX} Failed to fetch source map:`, resolvedUrl)
        return null
      }
      mapJson = await response.json()
    }

    const consumer = new SourceMapConsumer(
      mapJson as ConstructorParameters<typeof SourceMapConsumer>[0]
    )
    sourceMapCache.set(resolvedUrl, consumer)
    return consumer
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Failed to fetch source map:`, error)
    return null
  }
}

function extractSourceMapUrl(scriptContent: string): string | null {
  const regex = /\/\/[#@]\s*sourceMappingURL=([^\s]+)/g
  let match: RegExpExecArray | null
  let lastMatch: RegExpExecArray | null = null

  while ((match = regex.exec(scriptContent)) !== null) {
    lastMatch = match
  }

  return lastMatch ? lastMatch[1].trim() : null
}

type DebuggerEventListener = (
  source: chrome.debugger.Debuggee,
  method: string,
  params?: unknown
) => void

const scriptParsedListeners = new Map<number, DebuggerEventListener>()

function setupScriptParsedListener(tabId: number): void {
  const listener: DebuggerEventListener = (source, method, params) => {
    if (source.tabId === tabId && method === 'Debugger.scriptParsed' && params) {
      const typedParams = params as { scriptId?: string; url?: string }
      if (typedParams.scriptId && typedParams.url) {
        scriptSourceMapUrls.set(typedParams.scriptId, typedParams.url)
      }
    }
  }

  chrome.debugger.onEvent.addListener(listener)

  scriptParsedListeners.set(tabId, listener)
}

function cleanupScriptParsedListener(tabId: number): void {
  const listener = scriptParsedListeners.get(tabId)
  if (listener) {
    chrome.debugger.onEvent.removeListener(listener)
    scriptParsedListeners.delete(tabId)
  }
}

async function resolveElementSource(tabId: number, element: ElementInfo): Promise<SourceInfo> {
  const selector = element.selector

  try {
    const fiberResult = await resolveViaReactFiber(tabId, selector)

    if (fiberResult) {
      if (fiberResult.type === 'exact') {
        return fiberResult
      }

      if (fiberResult.componentName && fiberResult.componentName !== 'Anonymous') {
        const fuzzyResult = await resolveViaFuzzyMatch(tabId, fiberResult.componentName)
        if (fuzzyResult) {
          return fuzzyResult
        }

        return fiberResult
      }
    }
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} React Fiber source resolution failed:`, error)
  }

  return {
    type: 'not_found',
    resolution: null,
    file: null,
    line: null,
    column: null,
    componentName: null,
  }
}

export async function resolveSourceForElements(
  tabId: number,
  elements: ElementInfo[]
): Promise<ElementInfo[]> {
  scriptSourceMapUrls.clear()

  console.info(`${PROJECT_NAME_PREFIX} Starting source resolution for ${elements.length} elements.`)

  try {
    await attachDebugger(tabId)

    setupScriptParsedListener(tabId)

    await sendCommand(tabId, 'DOM.enable')
    await sendCommand(tabId, 'Debugger.enable')

    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.info(
      `${PROJECT_NAME_PREFIX} Source map discovery complete. Found ${scriptSourceMapUrls.size} scripts with source maps.`
    )

    const elementsWithSource = await Promise.all(
      elements.map(async (element) => {
        const sourceInfo = await resolveElementSource(tabId, element)
        return { ...element, sourceInfo }
      })
    )

    return elementsWithSource
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Source resolution failed:`, error)
    return elements.map((el) => ({
      ...el,
      sourceInfo: {
        type: 'not_found',
        resolution: null,
        file: null,
        line: null,
        column: null,
        componentName: null,
      },
    }))
  } finally {
    cleanupScriptParsedListener(tabId)
    await detachDebugger(tabId)
  }
}

function sendCommand<T = unknown>(
  tabId: number,
  method: string,
  params?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(result as T)
      }
    })
  })
}

async function attachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, DEBUGGER_VERSION, () => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message?.includes('already attached')) {
          resolve()
        } else {
          reject(new Error(chrome.runtime.lastError.message))
        }
      } else {
        resolve()
      }
    })
  })
}

async function detachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      resolve()
    })
  })
}

async function resolveViaReactFiber(tabId: number, selector: string): Promise<SourceInfo | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: findReactSourceInfoScript,
      args: [selector],
    })

    const reactInfo = results[0]?.result as ReactSourceInfo | null
    if (!reactInfo) {
      return null
    }

    if (reactInfo.type === 'exact' && reactInfo.fileName) {
      return {
        type: 'exact',
        resolution: 'react_fiber',
        file: reactInfo.fileName,
        line: reactInfo.lineNumber,
        column: null,
        componentName: reactInfo.componentName,
      }
    }

    if (reactInfo.componentName && reactInfo.componentName !== 'Anonymous') {
      return {
        type: 'fuzzy',
        resolution: 'react_fiber',
        file: null,
        line: null,
        column: null,
        componentName: reactInfo.componentName,
      }
    }

    return null
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} React Fiber source resolution failed:`, error)
    return null
  }
}

function isThirdPartySource(fileName: string | null | undefined): boolean {
  if (!fileName) return false
  return (
    fileName.includes('node_modules') ||
    fileName.includes('/npm/') ||
    fileName.includes('\\npm\\') ||
    fileName.startsWith('webpack/') ||
    fileName.includes('/.pnpm/') ||
    fileName.includes('\\.pnpm\\')
  )
}

function resolveSourceMapUrl(sourceMapUrl: string, scriptUrl: string): string {
  if (sourceMapUrl.startsWith('http://') || sourceMapUrl.startsWith('https://')) {
    return sourceMapUrl
  }

  if (sourceMapUrl.startsWith('data:')) {
    return sourceMapUrl
  }

  try {
    const baseUrl = new URL(scriptUrl)
    return new URL(sourceMapUrl, baseUrl).href
  } catch {
    return sourceMapUrl
  }
}
