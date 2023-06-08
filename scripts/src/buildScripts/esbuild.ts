import esbuild from 'esbuild'
import glob from 'glob'
import dependencyTree, { Tree } from 'dependency-tree'
import * as path from 'path'

export enum PackageName {
    api = 'api',
    cli = 'cli',
    common = 'common',
    contract = 'contract',
    database = 'database',
    datasets = 'datasets',
    env = 'env',
    procaptcha = 'procaptcha',
    'procaptcha-react' = 'procaptcha-react',
    provider = 'provider',
    server = 'server',
    types = 'types',
    'types-database' = 'types-database',
    'types-env' = 'types-env',
}

function getSourceFiles(pkg: PackageName) {
    const fileTypesGlobPattern = '{ts,tsx}'
    const files = glob
        .sync(`../packages/${pkg}/src/**/*.${fileTypesGlobPattern}`)
        .concat(glob.sync(`../packages/${pkg}/src/*.${fileTypesGlobPattern}`))
    return files
}

function getPackageExternals(): { [key: string]: string } {
    const imports = {}
    Object.values(PackageName).map((pkg) => {
        const packageImport = `@prosopo/${pkg}`
        imports[packageImport] = `${packageImport}/dist`
    })
    return imports
}

function findIndexFile(pkg: PackageName) {
    let files = glob.sync(`../packages/${pkg}/src/index.ts`) // TODO pass base Url as argument
    if (files.length === 0) {
        // Look deeper for index files (e.g. in js subfolder if there are multiple languages in the project)
        files = glob.sync(`../packages/${pkg}/src/**/index.ts`) // TODO pass base Url as argument
    }
    if (files.length === 0) {
        throw new Error(`No index.ts file found for ${pkg}`)
    }
    console.info('Found index file: ', files[0])
    return files[0]
}

// Get a list of packages from the tsconfig.json that are to built first, and the order in which they're to be built
function getDependencyTree(pkg: PackageName, tsConfigPath: string): Tree {
    // Requires this issue to be resolved to work with tsconfig paths https://github.com/dependents/node-dependency-tree/pull/138
    const packagePath = path.resolve(__dirname, `../../../packages/${pkg}`)
    console.log(`Looking in ${packagePath} for ${pkg} dependencies`)
    // Get the dependency list from the dependency-tree
    const depList = dependencyTree({
        filename: findIndexFile(pkg),
        directory: packagePath,
        tsConfig: tsConfigPath,
        //noTypeDefinitions: true,
        filter: (path) => path.indexOf('node_modules') === -1 && path.indexOf('/src') !== -1, // optional
    })
    return depList
}

// Parse the dependency tree to work out which workspace packages need compiled in which order
const packageNameRegex = /captcha\/packages\/([^/]+)/
function convertToDotNotation<Key extends PropertyKey>(
    tree: Tree,
    transformedTree = {},
    prefix = '',
    level = 0
): { [K in Key]?: boolean } {
    const keys = Object.keys(tree)
    for (const key of keys) {
        const matcher = key.match(packageNameRegex)
        if (matcher) {
            const packageName = matcher[1] // Extract package name
            const fullPath = prefix ? `${prefix}.${level}.${packageName}` : `${packageName}.${level}`
            if (!transformedTree[fullPath]) {
                transformedTree[fullPath] = true
                convertToDotNotation(tree[key], transformedTree, fullPath, level++)
            }
        }
    }
    return transformedTree
}
const parseDependencyTree = (dependencyTree: Tree): PackageName[][] => {
    // TODO add repeated template literal type
    //  https://stackoverflow.com/questions/65336900/template-literal-types-typescript-repeat
    const packageLevelDependencies = convertToDotNotation<string>(dependencyTree)
    // Remove any `.1` or `.2` etc. from the end of the package names and then remove empty arrays
    const packageDependencies: PackageName[][] = Object.keys(packageLevelDependencies).map((value) =>
        value
            .split('.')
            .filter((x) => isNaN(Number(x)))
            .flatMap((item) => (item ? [item] : []))
    ) as PackageName[][]

    // Remove duplicates from internal arrays i.e. [["1","1","2","3","4","4"], ...] => [["1","2","3","4"], ...]
    const uniquePackageDependencyArrays: PackageName[][] = packageDependencies.map((value) => [...new Set(value)])
    // Remove duplicate arrays from array of arrays by converting to sets of strings and then back to arrays
    return dedupeArrays<PackageName>(uniquePackageDependencyArrays)
}
function dedupeArrays<T>(arrays: T[][]): T[][] {
    return [...new Set(arrays.map((arr) => JSON.stringify(arr)))].map((str) => JSON.parse(str))
}

async function buildPackage(pkg: PackageName, externals: string[]): Promise<PackageName> {
    const sourceFiles = getSourceFiles(pkg)
    console.log('source files', sourceFiles)
    return esbuild
        .build({
            stdin: { contents: '' },
            inject: sourceFiles,
            bundle: false,
            platform: 'node',
            // plugins: [tsPaths(tsConfigPath), nodeExternalsPlugin()],
            // external: externals,
            sourcemap: true,
            minify: false,
            outdir: `../packages/${pkg}/dist`,
            loader: { '.node': 'empty' },
        })
        .then(() => {
            console.log(`⚡ ${pkg} Javascript build complete! ⚡`)
            return pkg
        })
        .catch((err) => {
            console.error(err)
            process.exit(1)
        })
}

function pruneLongestTree(dependencyTrees: PackageName[][]): {
    longestTree: PackageName[]
    prunedDependencyTrees: PackageName[][]
    rootPkg: PackageName
} {
    const longestTree = dependencyTrees.reduce((a, b) => (a.length > b.length ? a : b))
    const rootPkg: PackageName | undefined = longestTree.shift()
    if (!rootPkg) {
        throw new Error('No root package found')
    }
    // remove longestTree array from dependencyTrees
    const prunedDependencyTrees = dependencyTrees.filter((x) => x !== longestTree)
    return { longestTree, prunedDependencyTrees, rootPkg }
}

async function builder(packages: PackageName[]): Promise<void> {
    const packageExternals = getPackageExternals()
    const tsConfigPath = 'tsconfig.json' // TODO pass in tsconfig path
    let dependencyTrees: PackageName[][] = []
    for (const pkg of packages) {
        const dependencyTree = getDependencyTree(pkg, tsConfigPath)
        //TODO construct packageNameRegex from tsconfig baseUrl or paths
        console.log(JSON.stringify(dependencyTree, null, 4))
        const parsedDependencyTree = parseDependencyTree(dependencyTree)
        dependencyTrees = dependencyTrees.concat(parsedDependencyTree)
    }
    dependencyTrees = dedupeArrays(dependencyTrees)

    const dependencySet = new Set(dependencyTrees.flat())
    const dependenciesBuilt = new Set()
    const externals = Object.keys(packageExternals).concat(Object.values(packageExternals))

    let { longestTree, prunedDependencyTrees, rootPkg } = pruneLongestTree(dependencyTrees)
    while (dependenciesBuilt.size < dependencySet.size - 1 && prunedDependencyTrees.length > 0) {
        // build all packages in array
        //TODO work out what to build and when based on dependencyTrees

        for (const pkg of longestTree.reverse()) {
            if (!dependenciesBuilt.has(pkg)) {
                console.log('externals', externals)
                dependenciesBuilt.add(await buildPackage(pkg, externals))
            }
        }
        ;({ longestTree, prunedDependencyTrees, rootPkg } = pruneLongestTree(prunedDependencyTrees))
    }
    await buildPackage(rootPkg, externals)
}

export default builder
