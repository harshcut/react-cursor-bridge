import { useState } from 'react'
import { ArrowUpIcon, ScanIcon } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { MESSAGE_TYPES } from '@/lib/constants'

export default function SidePanel() {
  const [image] = useState<string | null>(null)

  return (
    <div className="h-screen flex flex-col">
      <main className="flex-1 overflow-auto">
        {!image && (
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
      <footer className="p-2">
        <InputGroup>
          <InputGroupTextarea placeholder="Ask, Search or Chat..." className="max-h-10 text-sm" />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto"
              size="icon-xs"
              disabled={!image}
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
