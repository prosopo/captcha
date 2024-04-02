import dotenv from 'dotenv';
import path from 'path';
import { env } from 'process';

const parseFileList = (str: string): string[] => {
    // TODO json?
    return str.split(',').map((s) => s.trim());
}

type Node = {
    envFile: string
    extends: Node[]
    chains: Node[]
    origin: Node | null
}

const expandEnvFile = (envFilePath: string): string[] => {
    // the env hierarchy can be represented as a acyclic graph
    // extends links to nodes which get loaded before the env file
    // chains links to nodes which get loaded after the env file
    // origin is the node which refers to this node
    const root: Node = {
        envFile: envFilePath,
        extends: [],
        chains: [],
        origin: null,
    }
    const queue: Node[] = [root];
    while (queue.length > 0) {
        const node = queue.pop();
        if (node === undefined) {
            throw new Error('Unexpected undefined node'); // this should never happen
        }
        // if the node has an origin, we need to check there is no circular reference between any of the nodes
        // this would manifest by this node having the same env file as an origin node
        let origin = node.origin;
        let origins = [];
        while (origin !== null) {
            origins.push(origin);
            if (origin.envFile === node.envFile) {
                throw new Error(`Circular env file reference detected: ${origins.join(` -> `)}`);
            }
            origin = origin.origin;
        }
        // read the env file
        const env: any = {};
        dotenv.config({
            path: node.envFile,
            processEnv: env,
        });
        // check if the file extends another file
        const ext = env['EXTENDS'];
        if (ext !== undefined) {
            const extFiles = parseFileList(ext);
            // resolve the path to the extended file
            const resolvedExtFiles = extFiles.map((f) => path.resolve(node.envFile, f));
            for (const extFile of resolvedExtFiles) {
                const extNode: Node = {
                    envFile: extFile,
                    extends: [],
                    chains: [],
                    origin: node,
                }
                node.extends.push(extNode);
                // add the node to the queue so we visit it in the future
                queue.push(extNode);
            }
        }
        // check if the file chainloads another file
        const chain = env['CHAIN'];
        if (chain !== undefined) {
            const chainFiles = parseFileList(chain);
            // resolve the path to the chainloaded file
            const resolvedChainFiles = chainFiles.map((f) => path.resolve(node.envFile, f));
            for (const chainFile of resolvedChainFiles) {
                const chainNode: Node = {
                    envFile: chainFile,
                    extends: [],
                    chains: [],
                    origin: node,
                }
                node.chains.push(chainNode);
                // add the node to the queue so we visit it in the future
                queue.push(chainNode);
            }
        }
    }
    // now we have a graph of env files
    // we need to load them in order
    const envFiles: string[] = [];
    // find the first node
    let node: Node | null = root;
    while (node.extends.length > 0) {
        node = node.extends[0]!;
    }
    // whether the node is an extension or a chain
    let mode: 'extends' | 'chains' | 'self' = 'extends'
    // what index we are at in the extends or chains array
    let index = 0
    // load the nodes in order
    while (node !== null) {
        envFiles.push(node.envFile);
        index++;
        const origin: Node | null = node.origin;
        if (mode === 'extends') {
            // we're in extends mode
            if(index < origin!.extends.length) {
                node = origin!.extends[index]!;
            } else {
                // we're done with the extends array
                mode = 'self'
                index = 0
            }
        } else if (mode === 'self') {
            // we just added the envFile for this node
            // so now examine the chained files
            mode = 'chains'
            index = 0
            node = node.chains[0]!
        } else if (mode === 'chains') {
            // we're in chains mode
            if (index < origin!.chains.length) {
                node = origin!.chains[index]!;
            } else {
                // we're done with the chains array
                mode = 'extends';
                index = 0;
                // we've processed all extends, the envFile, and the chains for this node. So go back up to the origin node
                node = origin;
            }
        } else {
            throw new Error('Unexpected mode'); // this should never happen
        }
    }

    return envFiles;
}

export default function config(args?: dotenv.DotenvConfigOptions): dotenv.DotenvConfigOutput {
    args = args || {};
    args.path = args.path || '.env';

    const envFiles: string[] = [];
    if (Array.isArray(args.path)) {
        envFiles.push(...args.path.map((p) => p.toString()));
    } else {
        envFiles.push(args.path.toString());
    }

    // expand the env files
    // this looks for EXTENDS and CHAIN directives in the env files
    // and loads the files in the correct order
    const expandedEnvFiles: string[] = [];
    for (const envFile of envFiles) {
        expandedEnvFiles.push(...expandEnvFile(envFile));
    }

    // load the env files in order
    

    
    // TODO delete extends field

}