const { spawn } = require('child_process')

// const command = 'echo hello && sleep 5 && echo world'
const command = 'npm run test'
const args = []

const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
})

child.on('close', (code) => {
    console.log(`child process exited with code ${code}`)
})

child.stderr?.on('data', (data) => {
    console.error(`stderr: ${data}`)
})

child.stdout?.on('data', (data) => {
    console.log(`stdout: ${data}`)
})