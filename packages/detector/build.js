import fs from 'fs-extra'
import path from 'path'

const __dirname = path.resolve()

const srcDir = path.resolve(__dirname, 'src')
const distDir = path.resolve(__dirname, 'dist')

fs.copy(srcDir, distDir, (err) => {
    if (err) {
        console.error('Error copying files:', err)
        process.exit(1)
    } else {
        console.log('Files copied successfully')
    }
})
