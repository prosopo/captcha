import { getLogLevel, getLogger } from '@prosopo/common'
import { getRootDir } from '@prosopo/config'
import { loadEnv } from '@prosopo/cli'
import { parse, stringify } from '@iarna/toml'
import fs from 'fs'
import path from 'path'

// We have to load env here if we're importing this file from cli/index.ts, otherwise, the env is loaded after the
// logger is created
loadEnv()
const logLevel = getLogLevel()
const log = getLogger(logLevel, 'setVersion')
log.info('Log level:', logLevel)

const parseVersion = (version: string) => {
    try {
        const parts = version.split('.')
        if (parts.length !== 3) {
            throw new Error()
        }
        let [major, minor, patch] = parts
        major = parseInt(major ?? '').toString()
        minor = parseInt(minor ?? '').toString()
        patch = parseInt(patch ?? '').toString()
        if (major === 'NaN' || minor === 'NaN' || patch === 'NaN') {
            throw new Error()
        }
        return `${major}.${minor}.${patch}`
    } catch (e) {
        throw new Error('Version must be in the format of x.y.z')
    }
}

const find = (pth: string, filter: (pth: string) => boolean): string[] => {
    const files = fs.readdirSync(pth)
    const results: string[] = []
    for (const file of files) {
        const fullPath = path.join(pth, file)
        if (filter(fullPath)) {
            results.push(fullPath)
        }
        try {
            if (fs.statSync(fullPath).isDirectory()) {
                results.push(...find(fullPath, filter))
            }
        } catch (e) {
            log.debug(`Not a directory: {fullPath}`)
        }
    }
    return results
}

export default async function setVersion(version: string, ignore?: string[]) {
    log.info('Setting version to ', version)
    version = parseVersion(version)
    const root = getRootDir()
    const ignorePaths = ['node_modules', 'cargo-cache', ...(ignore ?? [])]
    log.debug('Ignoring paths: ', ignorePaths)
    // walk through all files finding .json or .toml
    const files = find(root, (pth) => {
        // ignore node_modules and any user specified paths
        if (ignorePaths.some((ignorePath) => pth.includes(ignorePath))) {
            return false
        }
        const basename = path.basename(pth)
        return basename === 'package.json' || basename === 'Cargo.toml'
    })
    // split into json and toml
    files
        .filter((pth) => path.extname(pth) === '.json')
        .forEach((pth) => {
            log.debug('setting version in', pth)
            const content = fs.readFileSync(pth, 'utf8')
            // replace version in all json files
            const jsonContent = JSON.parse(content)
            if (jsonContent.version) {
                // only replace if version is set
                jsonContent.version = version
            }
            // go through dependencies
            for (const obj of [
                jsonContent.dependencies ?? {},
                jsonContent.devDependencies ?? {},
                jsonContent.peerDependencies ?? {},
            ]) {
                // detect any prosopo dependencies
                for (const key of Object.keys(obj)) {
                    if (key.startsWith('@prosopo') && !key.includes('typechain')) {
                        // and replace version
                        log.debug(`setting ${key} to ${version} in ${pth}`)
                        obj[key] = version
                    }
                }
            }
            fs.writeFileSync(pth, JSON.stringify(jsonContent, null, 4) + '\n')
        })

    // replace version in tomls
    files
        .filter((pth) => path.extname(pth) === '.toml')
        .filter((pth) => {
            // ignore node_modules and any user specified paths
            return !ignorePaths.some((ignorePath) => pth.includes(ignorePath))
        })
        .forEach((pth) => {
            log.debug('setting version in', pth)
            const content = fs.readFileSync(pth, 'utf8')
            // replace version in all toml files
            const tomlContent: any = parse(content)
            if (tomlContent.workspace) {
                if ((tomlContent.workspace as any).version) {
                    ;(tomlContent.workspace as any).version = version
                }
            } else {
                // replace dependency versions in all toml files
                tomlContent['package'].version = version
            }
            fs.writeFileSync(pth, stringify(tomlContent) + '\n')
        })

    // go through tomls again now versions have updated and update the version field for dependencies with paths set, as we can follow the path to get the version
    files
        .filter((pth) => path.extname(pth) === '.toml')
        .forEach((pth) => {
            log.debug('setting dependency versions in', pth)
            const content = fs.readFileSync(pth, 'utf8')
            // replace version in all toml files
            const tomlContent = parse(content)
            if (tomlContent.workspace) {
                if ((tomlContent.workspace as any).version) {
                    ;(tomlContent.workspace as any).version = version
                }
            } else {
                for (const obj of [tomlContent.dependencies ?? {}, tomlContent['dev-dependencies'] ?? {}]) {
                    // detect any prosopo dependencies
                    for (const [key, value] of Object.entries(obj)) {
                        if (value.path) {
                            // trace path to get version
                            path.join(value.path, 'Cargo.toml')
                            const depContent = fs.readFileSync(pth, 'utf8')
                            const depTomlContent = parse(depContent)
                            value.version = depTomlContent.version
                        }
                    }
                }
            }
            fs.writeFileSync(pth, stringify(tomlContent as any) + '\n')
        })
}
