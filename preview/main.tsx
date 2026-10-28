import React from 'react'
import { createRoot } from 'react-dom/client'
import { createPluginClient } from '../src/client/http-client.ts'
import { ReviewPane } from '../src/client/pane.tsx'

const client = createPluginClient({
  sessionId: 'preview',
  cwd: null,
  openFile(filePath, line) {
    const node = document.getElementById('preview-open')
    if (node) node.textContent = line ? `打开 ${filePath}:${line}` : `打开 ${filePath}`
  },
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReviewPane client={client} preview />
  </React.StrictMode>,
)
