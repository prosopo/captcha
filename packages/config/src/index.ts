import { getLogger } from '@prosopo/common';
import fs from 'fs';
import z from 'zod';
import dotenv from 'dotenv'
import ts from 'typescript'

const logger = getLogger('warn', import.meta.url);

/**
 * The arguments for loading environment variables.
 * @param populateProcessEnv - Whether to populate `process.env` with the loaded environment variables. Defaults to `false`.
 * @param path - The path to the source file containing the environment variables. If unspecified, falls back to `config.ts` then `.env`.
 */
export type Args<T extends object> = {
    populateProcessEnv?: boolean,
    path?: string,
    schema: z.ZodType<T>
}

const loadConfigFromEnv = async (path: string): Promise<{
    [key: string]: string
}> => {
    logger.debug(`Loading env-based config from: ${path}`)

    if (!fs.existsSync(path)) {
        throw new Error(`Config file not found at '${path}'`)
    }

    const result = {}
    dotenv.config({
        path,
        processEnv: result // make dotenv load into the result object
    })

    return result
}

const loadConfigFromTs = async (path: string): Promise<{
    [key: string]: string
}> => {
    logger.debug(`Loading ts-based config from: ${path}`);
    
    if (!fs.existsSync(path)) {
        throw new Error(`Config file not found at '${path}'`)
    }

    // read the ts file
    const tsCode = fs.readFileSync(path, 'utf-8')
    // compile the ts file
    const jsCode = ts.transpileModule(tsCode, {}).outputText
    // write the js code to a temporary file
    const jsPath = path.slice(0, -3) + '.js.tmp'
    fs.writeFileSync(jsPath, jsCode)

    // load the config from the js file
    const config = await loadConfigFromJs(jsPath)

    // delete the temporary js file
    fs.unlinkSync(jsPath)

    return config
}


const loadConfigFromJs = async (path: string): Promise<{
    [key: string]: string
}> => {
    logger.debug(`Loading js-based config from: ${path}`);
    
    if (!fs.existsSync(path)) {
        throw new Error(`Config file not found at '${path}'. Have you compiled your typescript config file? e.g. \`npx tsc config.ts\``)
    }

    // dynamic import the js file
    // this will have no typing!
    const buildConfig = (await import(`${path}`)).default
    console.log('buildConfig', buildConfig)

    // ensure the config is a function
    if (typeof buildConfig !== 'function') {
        throw new Error(`Config at '${path}' must export a function to build the config object.`)
    }

    const config = buildConfig()

    return config
}

/**
 * Loads the config from env or a config file.
 * @param args - The arguments for loading environment variables.
 */
export async function loadConfig<T extends object>(args: Args<T>): Promise<T> {
    if (args.path === undefined) {
        // check whether it has been set in the process.env
        if (process.env.CONFIG_PATH) {
            args.path = process.env.CONFIG_PATH;
        } else {
            const defaultConfigTsPath = './config.ts';
            const defaultEnvPath = './.env';
            if (fs.existsSync(defaultConfigTsPath)) {
                // try to load ${cwd}/config.ts
                args.path = defaultConfigTsPath;
            } else if (fs.existsSync(defaultEnvPath)) {
                // try to load ${cwd}/.env
                args.path = defaultEnvPath;
            } else {
                throw new Error(`No config file found at default locations of '${defaultConfigTsPath}' or '${defaultEnvPath}'`);
            }
        }
    }
    // load the config from the specified path
    let config: {
        [key: string]: string
    };
    const tsExtension = '.ts'
    if (args.path?.endsWith(tsExtension)) {
        config = await loadConfigFromTs(args.path);
    } else if (args.path?.endsWith('.js')) {
        config = await loadConfigFromJs(args.path);
    } else {
        config = await loadConfigFromEnv(args.path);
    }
    logger.info(`Loaded config from '${args.path}': ${JSON.stringify(config)}`)

    // parse the config to ensure it meets the expected format
    let parsedConfig: T;
    try {
        parsedConfig = args.schema.parse(config);
    } catch (err) {
        throw new Error(`Failed to parse config at '${args.path}': ${err}`);
    }

    // populate process.env if requested
    if (args.populateProcessEnv) {
        for (const key in parsedConfig) {
            // convert all values into strings via json encoding. this is to ensure that all values are strings. Any non-string objects will need to be JSON parsed before use. E.g. { a: { b: 1 } } will be stored as "{ "a": { "b": "1" } }", i.e. you'd need to JSON.parse(process.env.a).b to get the number 1 - but that would be a string, also.
            process.env[key] = JSON.stringify(parsedConfig[key]);
        }
    }

    return parsedConfig;
}