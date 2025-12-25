import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SettingsIcon } from 'lucide-react'
import { GRID_DENSITY_OPTIONS, STORAGE_KEYS } from '@/lib/constants'
import GridPreview from './grid-preview'
import type { GridDensityType } from '@/lib/types'

export default function Settings() {
  const [density, setDensity] = useState<GridDensityType>('default')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.GRID_DENSITY], (result) => {
      const stored = result[STORAGE_KEYS.GRID_DENSITY] as string | undefined
      if (stored && stored in GRID_DENSITY_OPTIONS) {
        setDensity(stored as GridDensityType)
      }
    })
  }, [])

  const handleDensityChange = (value: string) => {
    if (value in GRID_DENSITY_OPTIONS) {
      const newDensity = value as GridDensityType
      setDensity(newDensity)
      chrome.storage.local.set({ [STORAGE_KEYS.GRID_DENSITY]: newDensity })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[340px] p-4 pt-6">
        <DialogHeader>
          <DialogTitle className="text-left">Settings</DialogTitle>
          <DialogDescription className="sr-only">Customize your preferences</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Grid Density</label>
          <p className="text-xs text-zinc-500">
            Controls how thoroughly elements are detected in the selected area.
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            value={density}
            onValueChange={handleDensityChange}
            className="w-full"
          >
            {(Object.keys(GRID_DENSITY_OPTIONS) as GridDensityType[]).map((key) => (
              <ToggleGroupItem key={key} value={key} className="flex-1 capitalize">
                {key}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <GridPreview density={density} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
