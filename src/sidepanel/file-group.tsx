import { useState } from 'react'
import {
  FileTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BoxIcon,
  SquareMousePointerIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MESSAGE_TYPES, PROJECT_NAME_PREFIX } from '@/lib/constants'
import type { ElementInfo } from '@/lib/types'

interface FileGroup {
  filePath: string
  fileName: string
  elements: ElementInfo[]
  components: string[]
}

export default function FileGroup({ fileGroup }: { fileGroup: FileGroup }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasComponents = fileGroup.components.length > 0
  const isUnknownSource = fileGroup.filePath === ''

  return (
    <article className="rounded-lg border border-zinc-200 text-xs overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-zinc-50',
          isExpanded ? 'border-b border-zinc-100' : ''
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileTextIcon
            className={cn('size-4 shrink-0', isUnknownSource ? 'text-zinc-400' : 'text-amber-500')}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-zinc-800 truncate flex items-center gap-2">
              {fileGroup.fileName}
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 font-normal">
                {fileGroup.elements.length}
              </span>
            </div>
            {fileGroup.filePath && !isUnknownSource && (
              <div
                className="text-[10px] text-zinc-400 truncate"
                title={fileGroup.filePath}
                style={{ direction: 'rtl', textAlign: 'left' }}
              >
                <span style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                  {fileGroup.filePath}
                </span>
              </div>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="size-4 text-zinc-400 shrink-0 ml-2" />
        ) : (
          <ChevronDownIcon className="size-4 text-zinc-400 shrink-0 ml-2" />
        )}
      </button>
      {isExpanded && (
        <div className="p-2 space-y-2 bg-zinc-50/50">
          {hasComponents && (
            <div className="rounded-md bg-white border border-zinc-100 p-2.5">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2 font-medium flex items-center gap-1.5">
                <BoxIcon className="size-3.5" />
                Components Detected
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fileGroup.components.map((componentName, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 font-mono text-[11px] text-violet-700"
                  >
                    {componentName}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-md bg-white border border-zinc-100 p-2.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2 font-medium flex items-center gap-1.5">
              <SquareMousePointerIcon className="size-3.5" />
              Elements ({fileGroup.elements.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fileGroup.elements.map((element, idx) => (
                <ElementPill key={idx} element={element} />
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function ElementPill({ element }: { element: ElementInfo }) {
  const [copied, setCopied] = useState(false)

  const filePath = element.sourceInfo?.file?.replace(/^webpack:\/\/\//, '') || null
  const line = element.sourceInfo?.line
  const column = element.sourceInfo?.column
  const hasSourceLocation = filePath && typeof line === 'number'

  const fullPath = hasSourceLocation
    ? `${filePath}:${line}${typeof column === 'number' ? `:${column}` : ''}`
    : null

  const handleClick = async () => {
    if (!fullPath) return

    try {
      await navigator.clipboard.writeText(fullPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error(`${PROJECT_NAME_PREFIX} Failed to copy:`, error)
    }
  }

  return (
    <span
      onMouseEnter={() =>
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.HIGHLIGHT_ELEMENT,
          selector: element.selector,
        })
      }
      onMouseLeave={() => chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_HIGHLIGHT })}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] transition-colors ${
        copied
          ? 'bg-green-200 text-green-800'
          : hasSourceLocation
          ? 'bg-zinc-200 text-zinc-700 cursor-pointer hover:bg-zinc-300'
          : 'bg-zinc-200 text-zinc-700 cursor-default'
      }`}
      title={fullPath ? `Click to copy: ${fullPath}` : element.textContent || element.selector}
    >
      {element.tagName}
      {typeof line === 'number' && (
        <span className={copied ? 'text-green-600' : 'text-zinc-500'}>
          :{line}
          {typeof column === 'number' && `:${column}`}
        </span>
      )}
      {element.textContent && (
        <span
          className={cn(
            'font-sans truncate max-w-[100px]',
            copied ? 'text-green-600' : 'text-zinc-500'
          )}
        >
          {element.textContent.slice(0, 20)}
          {element.textContent.length > 20 ? '...' : ''}
        </span>
      )}
    </span>
  )
}
