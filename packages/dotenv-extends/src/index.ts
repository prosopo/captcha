import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const parseFileList = (str: string): string[] => {
    // TODO json?
    return str.split(',').map((s) => s.trim())
}

// an env file can optionally inherit off other env file(s)
// so when we load an env file, we need to load the inherited env files first, then the env file itself
// if multiple env files are specified, we have to load them in order

type Node = {
    envFile: string
    extends: Node[]
    origin: Node | null
}

const getEnvFileGraph = (envFilePath: string): Node => {
    // the env hierarchy can be represented as a acyclic graph
    // extends links to nodes which get loaded before the env file
    // origin is the node which refers to this node
    const root: Node = {
        envFile: envFilePath,
        extends: [],
        origin: null,
    }
    const queue: Node[] = [root]
    while (queue.length > 0) {
        const node = queue.pop()
        if (node === undefined) {
            throw new Error('Unexpected undefined node') // this should never happen
        }
        // if the node has an origin, we need to check there is no circular reference between any of the nodes
        // this would manifest by this node having the same env file as an origin node
        let origin = node.origin
        const origins = []
        while (origin !== null) {
            origins.push(origin)
            if (origin.envFile === node.envFile) {
                throw new Error(
                    `Circular env file reference detected: ${origins
                        .reverse()
                        .concat([origin])
                        .map((n) => n.envFile)
                        .join(` -> `)}`
                )
            }
            origin = origin.origin
        }
        // read the env file
        if (!fs.existsSync(node.envFile)) {
            throw new Error(`Env file does not exist: ${node.envFile}`)
        }
        const env: any = {}
        dotenv.config({
            path: node.envFile,
            processEnv: env,
        })
        // check if the file extends another file
        const ext = env['EXTENDS']
        if (ext !== undefined) {
            const extFiles = parseFileList(ext)
            // resolve the path to the extended file
            const resolvedExtFiles = extFiles.map((f) => {
                if (path.isAbsolute(f)) {
                    return f
                }
                return path.resolve(path.dirname(node.envFile), f)
            })
            for (const extFile of resolvedExtFiles) {
                const extNode: Node = {
                    envFile: extFile,
                    extends: [],
                    origin: node,
                }
                node.extends.push(extNode)
                // add the node to the queue so we visit it in the future
                queue.push(extNode)
            }
        }
    }
    return root
}

const nodeToStringArray = (node: Node): string[] => {
    const strs = [node.envFile]
    for (const ext of node.extends) {
        strs.push(...nodeToStringArray(ext).map((s) => `\t${s}`))
    }
    return strs
}

const nodeToString = (node: Node): string => {
    return nodeToStringArray(node).join('\n')
}

const expandEnvFile = (envFilePath: string, args: Args): string[] => {
    const root = getEnvFileGraph(envFilePath)
    if (args.debug) {
        console.log('env file graph\n', nodeToString(root))
    }

    // we need to load them in order
    // iterate over the graph in a depth first search
    const envFiles: string[] = []
    const stack: Node[] = [root]
    while (stack.length > 0) {
        const node = stack.pop()
        if (node === undefined) {
            throw new Error('Unexpected undefined node') // this should never happen
        }
        envFiles.push(node.envFile)
        stack.push(...node.extends.reverse())
    }

    return envFiles.reverse()
}

export type Args = dotenv.DotenvConfigOptions

export default function config(args?: Args): {
    [key: string]: string | undefined
} {
    args = args || {}
    args.path = args.path || '.env'

    const envFiles: string[] = []
    if (Array.isArray(args.path)) {
        envFiles.push(...args.path.map((p) => p.toString()))
    } else {
        envFiles.push(args.path.toString())
    }

    // expand the env files
    // this looks for EXTENDS directives in the env files
    // and loads the files in the correct order
    const expandedEnvFiles: string[] = []
    for (const envFile of envFiles) {
        expandedEnvFiles.push(...expandEnvFile(envFile, { ...args, path: undefined }))
    }

    // load the env files in order into the process env / destination
    const dest: {
        [key: string]: string | undefined
    } = {}
    for (const envFile of expandedEnvFiles) {
        dotenv.config({
            ...args,
            path: envFile,
            processEnv: dest as dotenv.DotenvPopulateInput,
            override: true,
        })
    }

    // delete extends field
    delete dest['EXTENDS']

    // assign the destination to the process env
    const env = args.processEnv || process.env
    for (const [key, value] of Object.entries(dest)) {
        env[key] = value
    }

    return dest
}
