import { Glob } from 'glob'
import { ProsopoEnvError, getLogger } from '@prosopo/common'
import { at } from '@prosopo/util'
import child_process from 'child_process'
import fs from 'fs'
import path from 'path'
import util from 'util'
const logger = getLogger(`Info`, `config.dependencies.js`)
const exec = util.promisify(child_process.exec)
const tsConfigRegex = /\/[a-z.]*\.json$/
const peerDepsRegex = /UNMET\sOPTIONAL\sDEPENDENCY\s+(@*[\w-/._]+)@/
const depsRegex = /\s+(@*[\w-/._]+)@/
async function getPackageDir(packageName: string): Promise<string> {
    let pkg = packageName
    if (packageName && !packageName.startsWith('@prosopo/')) {
        pkg = `@prosopo/${packageName}`
    }
    const pkgCommand = `npm list ${pkg} -ap`
    logger.info(`Running command ${pkgCommand}`)
    // get package directory
    const { stdout: packageDir, stderr } = await exec(pkgCommand)
    if (stderr) {
        throw new ProsopoEnvError(new Error(stderr))
    }
    return packageDir.trim()
}

/**
 * Get the tsconfig paths for a package
 * @param tsConfigPath
 * @param ignorePatterns
 * @param tsConfigPaths
 */
export function getTsConfigs(
    tsConfigPath: string,
    ignorePatterns: RegExp[] = [],
    tsConfigPaths: string[] = []
): string[] {
    const references = JSON.parse(fs.readFileSync(tsConfigPath).toString()).references
    if (!tsConfigPaths.includes(tsConfigPath)) {
        const ignore =
            ignorePatterns && ignorePatterns.length > 0 ? new RegExp(`${ignorePatterns.join('|')}`) : undefined
        tsConfigPaths.push(tsConfigPath)
        if (references) {
            for (const reference of references) {
                // ignore the packages we don't want to bundle
                if (ignore) {
                    if (ignore.test(reference.path)) {
                        continue
                    }
                }
                // remove tsconfig.*.json from the path and get the path to the new directory via the reference path
                let refTSConfigPath = path.resolve(tsConfigPath.replace(tsConfigRegex, ''), reference.path)
                if (!refTSConfigPath.endsWith('.json')) {
                    refTSConfigPath = path.resolve(refTSConfigPath, 'tsconfig.json')
                }
                const newTsConfigs = getTsConfigs(refTSConfigPath, ignorePatterns, tsConfigPaths)
                if (newTsConfigs.length > 0) {
                    tsConfigPaths = tsConfigPaths.concat()
                }
            }
        }
    }
    return tsConfigPaths
}

/**
 * Get the workspace externals for a package
 * @param tsConfigPath
 * @param ignorePatterns
 */
export function getExternalsFromReferences(tsConfigPath: string, ignorePatterns: RegExp[] = []): string[] {
    const externals: string[] = []
    const tsConfigPaths = getTsConfigs(tsConfigPath, ignorePatterns)
    for (const tsConfigPath of tsConfigPaths) {
        const packageJsonPath = path.resolve(tsConfigPath.replace(tsConfigRegex, ''), 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(new URL(packageJsonPath, import.meta.url)).toString())
        const pkg = packageJson.name
        externals.push(pkg)
    }
    return externals
}

/**
 * Get the dependencies for a package
 * @param packageName
 */
export async function getDependencies(
    packageName?: string
): Promise<{ dependencies: string[]; optionalPeerDependencies: string[] }> {
    let cmd = 'npm ls -a'

    if (packageName) {
        const packageDir = await getPackageDir(packageName)
        cmd = `cd ${packageDir.trim()} && ${cmd}`
        logger.info(`Running command ${cmd} in ${packageDir}`)
    }

    const { stdout, stderr } = await exec(cmd)
    if (stderr) {
        throw new ProsopoEnvError(new Error(stderr))
    }
    const deps: string[] = []
    const peerDeps: string[] = []
    // for each line, check if there is an unmet optional dependency
    stdout.split('\n').forEach((line) => {
        if (line.includes('UNMET OPTIONAL DEPENDENCY')) {
            //  │ │ │   ├── UNMET OPTIONAL DEPENDENCY bufferutil@^4.0.1
            const parts = line.match(peerDepsRegex)
            if (parts && parts.length > 1) {
                peerDeps.push(at(parts, 1))
            }
        } else {
            //  │ │ │ ├─┬ mongodb-memory-server-core@8.15.1
            const parts = line.match(depsRegex)
            if (parts && parts.length > 1) {
                deps.push(at(parts, 1))
            }
        }
    })
    // dedupe and return deps and peer deps
    return {
        dependencies: deps.filter((x, i) => i === deps.indexOf(x)),
        optionalPeerDependencies: peerDeps.filter((x, i) => i === peerDeps.indexOf(x)),
    }
}

/**
 * Filter out the dependencies we don't want
 * @param deps
 * @param filters
 */
export function filterDependencies(deps: string[], filters: string[]): { internal: string[]; external: string[] } {
    const depsDeduped = deps.filter((x, i) => i === deps.indexOf(x))
    const depsWithLength = depsDeduped.filter((dep) => dep.length > 0).sort()
    const exclude = new RegExp(`${filters.join('|')}`)
    // filter out the deps we don't want
    const internal: string[] = []
    const external: string[] = []
    for (const dep of depsWithLength) {
        if (exclude.test(dep)) {
            external.push(dep)
        } else {
            internal.push(dep)
        }
    }
    return { internal, external }
}

/** Takes an array of partial module directories, finds the full path, and returns an array containing the file paths
 * of the files contained within the matching module directories [ filePath, filePath, ... ]
 * @param startDir
 * @param includePatterns
 * @param excludePatterns
 * @returns
 * @example
 * const includePatterns = ['kusama.js', 'westend.js']
 * const excludePatterns = ['bytes.js']
 * const startDir = path.resolve(__dirname, '../../node_modules/@polkadot')
 * const files = getFilesInDirs(startDir, includePatterns, excludePatterns)
 * console.log(files)
 * // [ '/home/.../node_modules/@polkadot/types/interfaces/bytes/bytes.js',
 * // '/home/.../node_modules/@polkadot/types/interfaces/bytes/bytes.d.ts']
 * */
export function getFilesInDirs(startDir: string, includePatterns: string[] = [], excludePatterns: string[] = []) {
    const files: string[] = []
    logger.info(`getFilesInDirs: ${startDir} excluding ${includePatterns} including ${excludePatterns}`)
    const ignorePatterns = excludePatterns.map((pattern) => `${startDir}/**/${pattern}`)
    includePatterns.forEach((searchPattern) => {
        // get matching module directories
        const globPattern = `${startDir}/**/${searchPattern}${searchPattern.indexOf('.') > -1 ? '' : '/*'}`
        //log.info(`globPattern: ${globPattern}`)
        const globResult = new Glob(globPattern, { recursive: true, ignore: ignorePatterns }).walkSync()
        //log.info(`globResult: ${globResult}`)
        for (const filePath of globResult) {
            files.push(filePath)
            //log.info(`ignoring ${filePath}`)
        }
    })
    return files
}
