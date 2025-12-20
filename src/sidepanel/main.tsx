import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../tailwind.css'
import SidePanel from './sidepanel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>
)
