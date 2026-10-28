export function isSameOrigin(headers: Record<string, string | string[] | undefined>): boolean {
  const site = header(headers, 'sec-fetch-site')
  if (site === 'cross-site') return false
  const origin = header(headers, 'origin')
  const host = header(headers, 'host')
  if (!origin || !host) return site !== 'cross-site'
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function header(headers: Record<string, string | string[] | undefined>, name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function sendJson(res: { writeHead(status: number, headers: Record<string, string>): void; end(body: string): void }, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}
