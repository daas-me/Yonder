/* Resize uploaded photos so they fit comfortably in localStorage */
export function resizeImage(file: File, max = 640): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      res(c.toDataURL('image/jpeg', 0.78)); URL.revokeObjectURL(img.src)
    }
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}
