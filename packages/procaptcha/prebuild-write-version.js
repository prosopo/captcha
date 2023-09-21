import { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import packageJSON from './package.json' assert { type: 'json' }
import path from 'path'

fs.writeFileSync(
    path.resolve(dirname(fileURLToPath(import.meta.url)), 'src/utils/version.ts'),
    `export const version = "${packageJSON.version}"\n`,
    'utf8'
)
