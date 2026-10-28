export interface TextFile {
  name: string
  mime: string
  content: string
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Guarda los archivos en el celular. En iOS un link de descarga abre el archivo
 * en vez de guardarlo, así que se usa el menú de compartir ("Guardar en Archivos").
 * Llamarla desde un toque: iOS solo abre ese menú dentro del gesto.
 */
export async function downloadFiles(files: TextFile[]): Promise<void> {
  const blobs = files.map((f) => new File([f.content], f.name, { type: f.mime }))
  if (isIOS() && navigator.canShare?.({ files: blobs })) {
    await navigator.share({ files: blobs })
    return
  }
  for (const file of blobs) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
