import { Glob } from 'glob'
import { ProsopoEnvError, getLogger } from '@prosopo/common'
import child_process from 'child_process'
import path from 'path'
import util from 'util'
const logger = getLogger(`Info`, `config.dependencies.js`)
/**
 * Get the dependencies for a package
 * @param dir
 * @param packageName
 */
export async function getDependencies(packageName?: string): Promise<string[]> {
    let cmd = 'npm ls --pa'
    if (packageName) {
        const packagesDirectory = path.resolve(`..`)
        // check in folder called packages
        if (!packagesDirectory.endsWith('packages')) {
            throw new ProsopoEnvError('CONFIG.INVALID_PACKAGES_DIRECTORY', undefined, undefined, { packagesDirectory })
        }
        const directory = path.resolve(packagesDirectory, packageName)
        cmd = `cd ${directory} && npm ls --pa`
        logger.info(`Running command ${cmd} in ${directory}`)
    }
    const exec = util.promisify(child_process.exec)
    const { stdout, stderr } = await exec(cmd)
    if (stderr) {
        throw new ProsopoEnvError(new Error(stderr))
    }
    const deps: string[] = []
    // for each line, split on "/" and take the last part
    stdout.split('\n').forEach((line) => {
        const parts = line.split('node_modules/')
        deps.push(parts[parts.length - 1])
    })
    return deps
}

/**
 * Filter out the dependencies we don't want
 * @param deps
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
export function getFilesInDirs(startDir, includePatterns: string[] = [], excludePatterns: string[] = []) {
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
