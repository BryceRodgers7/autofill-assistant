import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dir = path.join(root, 'public', 'icons')
fs.mkdirSync(dir, { recursive: true })

/** Minimal valid 1x1 PNG (transparent) — reused for all sizes as placeholders */
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

for (const name of ['icon16.png', 'icon48.png', 'icon128.png']) {
  fs.writeFileSync(path.join(dir, name), png1x1)
}

console.log('Wrote placeholder PNGs to public/icons/')
