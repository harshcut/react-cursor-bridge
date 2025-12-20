export interface ElementInfo {
  nodeId: string
  tagName: string
  id: string | null
  classes: string[]
  textContent: string | null
  href: string | null
  src: string | null
  alt: string | null
  placeholder: string | null
}

export interface SelectionCoordinates {
  x: number
  y: number
  width: number
  height: number
  devicePixelRatio: number
}
