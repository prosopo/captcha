// start react-scripts start as child process
import { spawn } from 'child_process'
let stderrBuffer = ''

function flushStderr() {
    if (stderrBuffer) {
        process.stderr.write(stderrBuffer + '\n')
        stderrBuffer = ''
    }
}

function startWebpackDevServer() {
    return new Promise<void>((resolve, reject) => {
        let resolved = false
        let rejected = false
        process.env.PORT = '3001'
        const reactScriptsProcess = spawn('react-scripts', ['start'])
        reactScriptsProcess.stdout.pipe(process.stdout)
        reactScriptsProcess.stdout.addListener('data', (chunk) => {
            const msg = chunk.toString()
            if (msg.indexOf('No issues found.') >= 0) {
                resolved = true
                resolve()
            } else if (!resolved && msg.indexOf('webpack:') >= 0) {
                rejected = true
                flushStderr()
                reject(msg)
            }
        })
    })
}

function startCypressTests() {
    return new Promise<void>((resolve, reject) => {
        let resolved = false
        let rejected = false
        const cypressProcess = spawn('cypress', ['run'])
        cypressProcess.stdout.pipe(process.stdout)
        cypressProcess.stdout.addListener('data', (chunk) => {
            const msg = chunk.toString()
            if (msg.indexOf('All specs passed!') >= 0) {
                resolved = true
                resolve()
            } else if (!resolved && msg.indexOf('webpack:') >= 0) {
                rejected = true
                flushStderr()
                reject(msg)
            }
        })
    })
}

startWebpackDevServer()
    .then(() => {
        startCypressTests()
            .then(() => {
                console.log('Cypress tests finished')
                process.exit(0)
            })
            .catch((err) => {
                console.error(err)
                process.exit(1)
            })
    })
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
