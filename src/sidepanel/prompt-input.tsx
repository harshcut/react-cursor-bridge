import { useState } from 'react'
import { ArrowUpIcon } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { PROJECT_NAME_PREFIX, PROJECT_ID_PREFIX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { generateCursorDeeplink, generateCursorPrompt, downloadScreenshot } from '@/lib/utils'
import { useCopyToClipboard } from '@/lib/hooks'
import type { ElementInfo } from '@/lib/types'

interface PromptInputProps {
  image: string | null
  elements: ElementInfo[]
}

export default function PromptInput({ image, elements }: PromptInputProps) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const [prompt, setPrompt] = useState<string>('')

  const buildCursorPrompt = async (): Promise<string> => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${PROJECT_ID_PREFIX}/capture-${timestamp}.png`

    const downloadPath = await downloadScreenshot(image!, filename)

    const sourcePaths = elements
      .filter((el) => el.sourceInfo?.file && el.sourceInfo.type !== 'not_found')
      .map((el) => {
        const filePath = el.sourceInfo!.file!.replace(/^webpack:\/\/\//, '')
        const line = el.sourceInfo?.line
        return typeof line === 'number' ? `${filePath}:${line}` : filePath
      })
      .filter((path, index, self) => self.indexOf(path) === index)

    return generateCursorPrompt(prompt, downloadPath, sourcePaths)
  }

  const handleCopy = async () => {
    if (!prompt.trim() || !image) return

    try {
      const cursorPrompt = await buildCursorPrompt()
      copyToClipboard(cursorPrompt)
    } catch (error) {
      console.error(`${PROJECT_NAME_PREFIX} Failed to copy prompt:`, error)
      alert(`Failed to copy prompt. Please try again.`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || !image) return

    try {
      const cursorPrompt = await buildCursorPrompt()
      window.open(generateCursorDeeplink(cursorPrompt), '_blank')
      setPrompt('')
    } catch (error) {
      console.error(`${PROJECT_NAME_PREFIX} Failed to send to Cursor:`, error)
      alert(`Failed to send to Cursor. Please try again.`)
    }
  }

  return (
    <InputGroup>
      <InputGroupTextarea
        placeholder="Ask, Search or Chat..."
        className="max-h-52 text-sm"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <InputGroupAddon align="block-end">
        <InputGroupText className="opacity-25">v{__APP_VERSION__}</InputGroupText>
        <InputGroupButton
          variant="outline"
          className={cn(
            'ml-auto rounded-full transition-colors font-normal text-[13px]',
            isCopied &&
              'bg-green-200 text-green-800 border-green-200 hover:bg-green-200 hover:text-green-800'
          )}
          size="xs"
          disabled={!image || !prompt.trim()}
          onClick={handleCopy}
        >
          Copy
        </InputGroupButton>
        <InputGroupButton
          variant="default"
          className="rounded-full"
          size="icon-xs"
          disabled={!image || !prompt.trim()}
          onClick={handleSubmit}
        >
          <ArrowUpIcon />
          <span className="sr-only">Send</span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
