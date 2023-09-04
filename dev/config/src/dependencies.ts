import { Glob } from 'glob'
import { ProsopoEnvError, getLogger } from '@prosopo/common'
import child_process from 'child_process'
import util from 'util'
import { at } from '@prosopo/util'
const logger = getLogger(`Info`, `config.dependencies.js`)
/**
 * Get the dependencies for a package
 * @param dir
 * @param packageName
 */
export async function getDependencies(packageName?: string): Promise<string[]> {
    let cmd = 'npm ls --pa'
    const exec = util.promisify(child_process.exec)

    if (packageName) {
        let pkg = packageName
        if (packageName && !packageName.startsWith('@prosopo/')) {
            pkg = `@prosopo/${packageName}`
        }
        const pkgCommand = `npm list ${pkg} -ap`
        logger.info(`Running command ${pkgCommand}`)
        // get package directory
        const { stdout: packageDir, stderr } = await exec(pkgCommand)
        console.log('packageDir', packageDir)
        if (stderr) {
            throw new ProsopoEnvError(new Error(stderr))
        }
        cmd = `cd ${packageDir.trim()} && npm ls --pa`
        logger.info(`Running command ${cmd} in ${packageDir}`)
    }

    const { stdout, stderr } = await exec(cmd)
    if (stderr) {
        throw new ProsopoEnvError(new Error(stderr))
    }
    const deps: string[] = []
    // for each line, split on "/" and take the last part
    stdout.split('\n').forEach((line) => {
        const parts = line.split('node_modules/')
        deps.push(at(parts,parts.length - 1))
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
