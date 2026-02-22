import { PROJECT_NAME_PREFIX } from '@/lib/constants'
import type { Fiber, Source } from 'react-reconciler'
import type { SourceInfo, ElementInfo } from '@/lib/types'

interface ReactSourceInfo {
  fileName: string
  lineNumber: number
  columnNumber: number
  componentName: string
}

// type definition for react devtools global hook
type DevToolsHook = {
  renderers?: Map<number, { findFiberByHostInstance?: (element: Element) => unknown }>
}

// extends the dom element type to include react fiber properties
type ElementWithFiber = Element & {
  [fiberKey: string]: Fiber | undefined
}

function findReactSourceInfoScript(selector: string): ReactSourceInfo | null {
  /**
   * react fiber work tags that identify the type of fiber node
   * we need the tag to identify fibers and walk past them in the source resolution
   * @see https://github.com/facebook/react/blob/v18.3.0/packages/react-reconciler/src/ReactWorkTags.js
   */
  const ReactWorkTags = {
    ContextConsumer: 9,
    ContextProvider: 10,
  } as const

  // cache for fiber property keys to avoid repeated object.keys() lookups
  const fiberKeysCache: string[] = []

  function getElementFiber(element: Element): Fiber | null {
    const hook = (window as Window & { __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevToolsHook })
      .__REACT_DEVTOOLS_GLOBAL_HOOK__

    // use react devtools global hook if available to get the fiber
    if (hook?.renderers) {
      for (const renderer of hook.renderers.values()) {
        try {
          const fiber = renderer.findFiberByHostInstance?.(element)
          if (fiber) return fiber as Fiber
        } catch {}
      }
    }

    // check cached fiber keys first for performance
    const elementWithFiber = element as ElementWithFiber
    for (const fiberKey of fiberKeysCache) {
      if (fiberKey in elementWithFiber) {
        return elementWithFiber[fiberKey] as Fiber
      }
    }

    // scan element properties to find fiber reference
    const fiberKey = Object.keys(element).find(
      (key) =>
        key.startsWith('__reactFiber$') || // react 16.14.0+
        key.startsWith('__reactInternalInstance$') // react < 16.14.0
    )

    if (fiberKey) {
      fiberKeysCache.push(fiberKey)
      return elementWithFiber[fiberKey] as Fiber
    }

    return null
  }

  /**
   * recursively traverses up the dom tree to find the first element
   * with an associated react fiber. this handles cases where the
   * target element itself might be a text node or non-react element.
   */
  function getElementFiberUpward(element: Element | null): Fiber | null {
    if (!element) return null
    const fiber = getElementFiber(element)
    if (fiber) return fiber
    return getElementFiberUpward(element.parentElement)
  }

  function getDisplayNameForFiber(fiber: Fiber): string {
    const { elementType } = fiber

    // host elements (native dom tags) have string element types
    if (typeof elementType === 'string') return elementType

    return (
      // standard function/class components
      elementType?.name ||
      // components with explicit displayName (common in hocs)
      elementType?.displayName ||
      // forwardref stores the wrapped function under render
      elementType?.render?.name ||
      // memo/other wrappers store the inner component under type
      elementType?.type?.name ||
      // memo wraps forwardref, so the function is two levels deep
      elementType?.type?.render?.name ||
      // lazy components store the resolved component in _payload._result
      elementType?._payload?._result?.name ||
      'Anonymous'
    )
  }

  // extracts source location from fiber debug source (dev builds only)
  function getSourceFromFiber(fiber: Fiber): Omit<ReactSourceInfo, 'componentName'> | null {
    if (!fiber._debugSource) return null

    const { fileName, lineNumber, columnNumber } = fiber._debugSource as Source & {
      columnNumber?: number
    }
    if (fileName && lineNumber) {
      return {
        // strip angle brackets from filenames when transpiled with rspack
        fileName: fileName.match(/^<.*>$/) ? fileName.replace(/^<|>$/g, '') : fileName,
        lineNumber,
        columnNumber: columnNumber ?? 1,
      }
    }

    return null
  }

  try {
    const element = document.querySelector(selector)
    if (!element) return null

    const fiber = getElementFiberUpward(element)
    if (!fiber) return null

    let current: Fiber | null = fiber

    // walk up the fiber tree until we find a fiber with debug source
    while (current) {
      const source = getSourceFromFiber(current)

      if (source) {
        let ownerFiber: Fiber | null = current
        while (
          ownerFiber &&
          (typeof ownerFiber.elementType === 'string' || // native dom tags
            typeof ownerFiber.elementType === 'symbol' || // react internals
            ownerFiber.tag === ReactWorkTags.ContextProvider ||
            ownerFiber.tag === ReactWorkTags.ContextConsumer)
        ) {
          ownerFiber = ownerFiber._debugOwner ?? ownerFiber.return
        }

        return {
          ...source,
          componentName: getDisplayNameForFiber(ownerFiber ?? current),
        }
      }

      // debug owner is the component that wrote this jsx (leads to source faster)
      // return is the structural tree parent
      current = current._debugOwner ?? current.return
    }

    return null
  } catch {
    return null
  }
}

async function resolveElementSource(tabId: number, element: ElementInfo): Promise<SourceInfo> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: findReactSourceInfoScript,
      args: [element.selector],
    })

    const reactInfo = results[0]?.result as ReactSourceInfo | null

    if (reactInfo?.fileName) {
      return {
        type: 'exact',
        resolution: 'react_fiber',
        file: reactInfo.fileName,
        line: reactInfo.lineNumber,
        column: reactInfo.columnNumber,
        componentName: reactInfo.componentName,
      }
    }

    return resultOnFail()
  } catch (error) {
    console.error(`${PROJECT_NAME_PREFIX} Source resolution failed for ${element.selector}:`, error)
    return resultOnFail()
  }
}

function resultOnFail(): SourceInfo {
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
  console.info(`${PROJECT_NAME_PREFIX} Starting source resolution for ${elements.length} elements.`)

  const elementsWithSource = await Promise.all(
    elements.map(async (element) => {
      try {
        const sourceInfo = await resolveElementSource(tabId, element)
        return { ...element, sourceInfo }
      } catch (error) {
        console.error(
          `${PROJECT_NAME_PREFIX} Source resolution failed for ${element.selector}:`,
          error
        )
        return { ...element, sourceInfo: resultOnFail() }
      }
    })
  )

  return elementsWithSource
}
