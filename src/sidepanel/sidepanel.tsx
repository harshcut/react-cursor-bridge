import { useState, useEffect } from 'react'
import { ArrowUpIcon, ScanIcon, SettingsIcon } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { MESSAGE_TYPES, STORAGE_KEYS } from '@/lib/constants'
import type { ElementInfo } from '@/lib/types'
import { groupElementsByFile } from '@/lib/utils'
import FileGroup from './file-group'

export default function SidePanel() {
  const [image, setImage] = useState<string | null>(null)
  const [elements, setElements] = useState<ElementInfo[]>([])
  const [prompt, setPrompt] = useState<string>('')

  useEffect(() => {
    chrome.storage.local.get(
      [STORAGE_KEYS.CAPTURED_IMAGE, STORAGE_KEYS.CAPTURED_ELEMENTS],
      (result) => {
        const image = result[STORAGE_KEYS.CAPTURED_IMAGE] as string | undefined
        const elements = result[STORAGE_KEYS.CAPTURED_ELEMENTS] as ElementInfo[] | undefined

        if (image) setImage(image)
        if (elements) setElements(elements)
      }
    )

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: 'local' | 'sync' | 'managed' | 'session'
    ) => {
      if (areaName === 'local') {
        if (changes[STORAGE_KEYS.CAPTURED_IMAGE]) {
          const newValue = changes[STORAGE_KEYS.CAPTURED_IMAGE].newValue as string | undefined
          setImage(newValue || null)
        }
        if (changes[STORAGE_KEYS.CAPTURED_ELEMENTS]) {
          const newValue = changes[STORAGE_KEYS.CAPTURED_ELEMENTS].newValue as
            | ElementInfo[]
            | undefined
          setElements(newValue || [])
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleClearElements = () => {
    chrome.storage.local.remove([STORAGE_KEYS.CAPTURED_IMAGE, STORAGE_KEYS.CAPTURED_ELEMENTS])
    setImage(null)
    setElements([])
    setPrompt('')
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="p-2 flex items-center justify-between border-b border-zinc-200">
        <Button variant="outline" onClick={handleClearElements}>
          Reset
        </Button>
        <Button variant="outline" size="icon" disabled>
          <SettingsIcon />
        </Button>
      </header>
      <main className="flex-1 overflow-auto p-2 pb-0 relative">
        {image ? (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              <img src={image} className="max-h-60 w-full object-contain" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">
                Detected Elements ({elements.length})
              </h2>
              {groupElementsByFile(elements).map((fileGroup, idx) => (
                <FileGroup key={idx} fileGroup={fileGroup} />
              ))}
              <div className="sticky bottom-0 left-0 right-0 h-8 bg-linear-to-t from-white to-transparent pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-zinc-100 p-4">
              <ScanIcon className="text-zinc-400" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-zinc-700">No capture yet</h2>
            <p className="mb-4 max-w-2xs text-sm text-zinc-500 text-pretty">
              Select a region of the current page to get started
            </p>
            <Button
              onClick={() => chrome.runtime.sendMessage({ type: MESSAGE_TYPES.START_CAPTURE })}
            >
              Start Capture
            </Button>
          </div>
        )}
      </main>
      <footer className="p-2 pt-0">
        <InputGroup>
          <InputGroupTextarea
            placeholder="Ask, Search or Chat..."
            className="max-h-10 text-sm"
            onChange={(e) => setPrompt(e.target.value)}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto"
              size="icon-xs"
              disabled={!image || !prompt.trim()}
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </footer>
    </div>
  )
}
