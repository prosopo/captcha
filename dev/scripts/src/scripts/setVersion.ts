import { getPaths } from '@prosopo/config'
import { parse, stringify } from 'smol-toml'
import fs from 'fs'
import path from 'path'

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
            if (fs.statSync(fullPath).isDirectory()) {
                results.push(...find(fullPath, filter))
            }
        }
    }
    return results
}

export default async function setVersion(version: string) {
    version = parseVersion(version)
    const root = getPaths().root
    // walk through all files finding .json or .toml
    const files = find(root, (pth) => {
        if (pth.includes('node_modules')) {
            return false
        }
        if (pth.endsWith('-lock.json')) {
            return false
        }
        const ext = path.extname(pth)
        return ext === '.json' || ext === '.toml'
    })
    console.log(files)
    process.exit(1)
    // split into json and toml
    files
        .filter((pth) => path.extname(pth) === '.json')
        .forEach((pth) => {
            const content = fs.readFileSync(pth, 'utf8')
            // replace version in all json files
            const jsonContent = JSON.parse(content)
            jsonContent.version = version
            // go through dependencies
            for (const obj of [
                jsonContent.dependencies ?? {},
                jsonContent.devDependencies ?? {},
                jsonContent.peerDependencies ?? {},
            ]) {
                // detect any prosopo dependencies
                for (const key of Object.keys(obj)) {
                    if (key.startsWith('@prosopo')) {
                        // and replace version
                        jsonContent.dependencies[key] = version
                    }
                }
            }
            fs.writeFileSync(pth, JSON.stringify(jsonContent, null, 4))
        })
    files
        .filter((pth) => path.extname(pth) === '.toml')
        .forEach((pth) => {
            const content = fs.readFileSync(pth, 'utf8')
            // replace version in all toml files
            const tomlContent = parse(content)
            // replace dependency versions in all toml files
            tomlContent.version = version
            for (const obj of [tomlContent.dependencies ?? {}, tomlContent.devDependencies ?? {}]) {
                // detect any prosopo dependencies
                for (const key of Object.keys(obj)) {
                    if (key.startsWith('@prosopo')) {
                        // and replace version
                        // tomlContent.dependencies[key] = version
                    }
                }
            }
            fs.writeFileSync(pth, stringify(tomlContent))
        })
}
