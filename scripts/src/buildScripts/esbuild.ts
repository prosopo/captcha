import esbuild from 'esbuild'
import glob from 'glob'
import dependencyTree, { Tree } from 'dependency-tree'

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
    const files = glob.sync(`../packages/${pkg}/src/**/*.ts`).concat(glob.sync(`../packages/${pkg}/src/*.ts`))
    console.log(files)
    return files
}

function getPackageImportAliases(): { [key: string]: string } {
    const imports = {}
    Object.values(PackageName).map((pkg) => {
        const packageImport = `@prosopo/${pkg}`
        imports[packageImport] = `${packageImport}/dist`
    })
    console.log(imports)
    return imports
}

// Get a list of packages from the tsconfig.json that are to built first, and the order in which they're to be built
function getDependencyTree(pkg: PackageName, tsConfigPath: string): Tree {
    // Get the dependency list from the dependency-tree
    const depList = dependencyTree({
        filename: `../packages/${pkg}/src/index.ts`,
        directory: '..',
        tsConfig: tsConfigPath,
        filter: (path) => path.indexOf('node_modules') === -1, // optional
    })
    console.log(JSON.stringify(depList, null, 2))
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

function builder(packages: PackageName[]): Promise<void>[] {
    const promises: Promise<void>[] = []
    const packageImportAliases = getPackageImportAliases()
    const tsConfigPath = 'tsconfig.json'
    let dependencyTrees: PackageName[][] = []
    for (const pkg of packages) {
        const dependencyTree = getDependencyTree(pkg, tsConfigPath)
        //TODO construct packageNameRegex from tsconfig baseUrl or paths
        const parsedDependencyTree = parseDependencyTree(dependencyTree)
        console.log('parsedDependencyTree', parsedDependencyTree)
        dependencyTrees = dependencyTrees.concat(parsedDependencyTree)
    }
    dependencyTrees = dedupeArrays(dependencyTrees)
    for (const tree of dependencyTrees) {
        //TODO work out what to build and when based on dependencyTrees
        for (const pkg of tree) {
            promises.push(
                esbuild
                    .build({
                        stdin: { contents: '' },
                        inject: getSourceFiles(pkg),
                        bundle: true,
                        platform: 'node',
                        //plugins: [tsPaths(tsConfigPath), nodeExternalsPlugin()],
                        external: Object.values(packageImportAliases),
                        sourcemap: true,
                        minify: false,
                        outdir: `../packages/${pkg}/dist`,
                        loader: { '.node': 'empty' },
                    })
                    .then(() => console.log(`⚡ ${pkg} Javascript build complete! ⚡`))
                    .catch(() => process.exit(1))
            )
        }
    }
    return promises
}

export default builder
