export interface SourceInfo {
  file: string | null
  line: number | null
  column: number | null
  componentName: string | null
}

export interface ElementInfo {
  tagName: string
  id: string | null
  selector: string
  classes: string[]
  textContent: string | null
  href: string | null
  src: string | null
  alt: string | null
  placeholder: string | null
  sourceInfo: SourceInfo | null
}

export interface SelectionCoordinates {
  x: number
  y: number
  width: number
  height: number
  devicePixelRatio: number
}
