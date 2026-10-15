export async function downloadFileFromUrl(
  url: string,
  fileName: string,
): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Kunne ikke hente fil (${res.status})`)
  }
  const blob = await res.blob()
  triggerBlobDownload(blob, fileName)
}

export function downloadLocalFile(file: File): void {
  const objectUrl = URL.createObjectURL(file)
  try {
    triggerAnchorDownload(objectUrl, file.name)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  try {
    triggerAnchorDownload(objectUrl, fileName)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function triggerAnchorDownload(href: string, fileName: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
