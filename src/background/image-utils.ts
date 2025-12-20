import { PROJECT_NAME_PREFIX } from '@/lib/constants'
import type { SelectionCoordinates } from '@/lib/types'

export async function cropImage(
  dataUrl: string,
  coordinates: SelectionCoordinates
): Promise<string> {
  const { x, y, width, height, devicePixelRatio } = coordinates

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const imageBitmap = await createImageBitmap(blob)

  const scaledX = x * devicePixelRatio
  const scaledY = y * devicePixelRatio
  const scaledWidth = width * devicePixelRatio
  const scaledHeight = height * devicePixelRatio

  const canvas = new OffscreenCanvas(scaledWidth, scaledHeight)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error(`${PROJECT_NAME_PREFIX} Failed to get 2D context from OffscreenCanvas`)
  }

  ctx.drawImage(
    imageBitmap,
    scaledX,
    scaledY,
    scaledWidth,
    scaledHeight,
    0,
    0,
    scaledWidth,
    scaledHeight
  )

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' })
  return blobToDataUrl(croppedBlob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error(`${PROJECT_NAME_PREFIX} Failed to convert blob to data URL`))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
