import { getLogger } from '@prosopo/common';
import fs from 'fs';
import z from 'zod';
import dotenv from 'dotenv'

const logger = getLogger('info', import.meta.url);

/**
 * The arguments for loading environment variables.
 * @param populateProcessEnv - Whether to populate `process.env` with the loaded environment variables. Defaults to `false`.
 * @param path - The path to the source file containing the environment variables. If unspecified, falls back to `config.ts` then `.env`.
 */
export type Args = {
    populateProcessEnv?: boolean,
    path?: string,
    schema: z.ZodAny
}

const loadConfigFromEnv = (path: string): {
    [key: string]: string
} => {
    logger.debug(`Loading env-based config from: ${path}`)

    const result = {}
    dotenv.config({
        path,
        processEnv: result // make dotenv load into the result object
    })

    return result
}

const loadConfigFromTs = (path: string): {
    [key: string]: string
} => {
    logger.debug(`Loading ts-based config from: ${path}`)
    return {}
}

/**
 * Loads the config from env or a config file.
 * @param args - The arguments for loading environment variables.
 */
export function loadConfig(args: Args) {
    if (args.path === undefined) {
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
    // load the config from the specified path
    let config: {
        [key: string]: string
    };
    if (args.path?.endsWith('.ts')) {
        config = loadConfigFromTs(args.path);
    } else {
        config = loadConfigFromEnv(args.path);
    }
    logger.info(`Loaded config from '${args.path}': ${JSON.stringify(config)}`)

    // parse the config to ensure it meets the expected format
    let parsedConfig: z.infer<typeof args.schema>;
    try {
        parsedConfig = args.schema.parse(config);
    } catch (err) {
        throw new Error(`Failed to parse config at '${args.path}': ${err}`);
    }

    // populate process.env if requested
    if (args.populateProcessEnv) {
        for (const key in parsedConfig) {
            process.env[key] = parsedConfig[key];
        }
    }

    return parsedConfig;
}