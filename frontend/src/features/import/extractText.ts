/* ---------- File text extraction ---------- */
export async function extractText(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist')
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = worker
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    let out = ''
    for (let p = 1; p <= doc.numPages; p++) {
      const c = await (await doc.getPage(p)).getTextContent()
      let lastY: number | null = null
      for (const it of c.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
        const y = it.transform[5]
        if (lastY !== null && Math.abs(y - lastY) > 2) out += '\n'
        out += it.str
        if (it.hasEOL) out += '\n'
        lastY = y
      }
      out += '\n'
    }
    return out
  }
  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
  }
  return file.text()
}
