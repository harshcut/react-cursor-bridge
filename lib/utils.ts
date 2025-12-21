import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
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
