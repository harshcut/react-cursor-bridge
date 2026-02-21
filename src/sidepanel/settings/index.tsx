import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SettingsIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import GridDensitySetting from './grid-density'

const PAGES = [GridDensitySetting]

export default function Settings() {
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const handlePageChange = (direction: 1 | -1) => {
    setCurrentPage((prev) => (prev + direction + PAGES.length) % PAGES.length)
  }

  const PageComponent = PAGES[currentPage]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[340px] p-4 pt-6" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-left">Settings</DialogTitle>
        </DialogHeader>
        <PageComponent />
        <DialogFooter className="flex-row sm:justify-between justify-between">
          <ButtonGroup>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(-1)}>
              <ChevronLeftIcon />
              <span className="sr-only">Previous</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)}>
              <ChevronRightIcon />
              <span className="sr-only">Next</span>
            </Button>
          </ButtonGroup>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
