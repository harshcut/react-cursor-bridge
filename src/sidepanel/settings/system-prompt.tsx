import { useState, useEffect } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { STORAGE_KEYS, DEFAULT_SYSTEM_PROMPT } from '@/lib/constants'

export default function SystemPromptSetting() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.SYSTEM_PROMPT], (result) => {
      const stored = result[STORAGE_KEYS.SYSTEM_PROMPT] as string | undefined
      if (stored !== undefined) {
        setSystemPrompt(stored)
      }
    })
  }, [])

  const handleChange = (value: string) => {
    setSystemPrompt(value)
    chrome.storage.local.set({ [STORAGE_KEYS.SYSTEM_PROMPT]: value })
  }

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
    chrome.storage.local.remove(STORAGE_KEYS.SYSTEM_PROMPT)
  }

  return (
    <div>
      <label className="text-sm font-medium text-zinc-700">System Prompt</label>
      <p className="text-xs text-zinc-500 text-pretty">
        Shapes how the AI interprets and responds to every request. Use to enforce coding style,
        conventions, or preferred frameworks.
      </p>
      <InputGroup className="mt-4 overflow-hidden">
        <InputGroupTextarea
          placeholder="Set your rules, style, or preferences..."
          className="max-h-40 min-h-40 text-sm break-all"
          value={systemPrompt}
          onChange={(e) => handleChange(e.target.value)}
        />
        <InputGroupAddon align="block-end" className="justify-between pb-1.5">
          <InputGroupText className="text-xs text-muted-foreground">
            {systemPrompt.length} characters
          </InputGroupText>
          <InputGroupButton
            variant="ghost"
            size="xs"
            onClick={handleReset}
            disabled={systemPrompt === DEFAULT_SYSTEM_PROMPT}
            className="h-auto px-2 py-0.5 text-xs"
          >
            Reset
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
