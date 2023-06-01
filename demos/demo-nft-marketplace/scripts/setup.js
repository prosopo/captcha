const path = require('path')
const fse = require('fs-extra')

const abiPath = './contracts/target/ink/metadata.json'

async function copyAbi() {
    await Promise.all([fse.copy(abiPath, './src/api/abi.json', { overwrite: true })])
}

function getEnvFile(filename = '.env', filepath = './') {
    const env = process.env.NODE_ENV || 'development'
    return path.join(filepath, `${filename}.${env}`)
}

async function copyEnvFile() {
    const tplEnvFile = getEnvFile('env')
    const envFile = getEnvFile('.env')
    await fse.copy(tplEnvFile, envFile, { overwrite: false })
}

async function setup() {
    console.log('Copying contract abi...')
    await copyAbi()

    console.log('Writing .env file...')
    await copyEnvFile()

    process.exit()
}

setup()
