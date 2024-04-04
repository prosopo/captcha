import { getLogger } from '@prosopo/common';
import fs from 'fs';

const logger = getLogger('info', import.meta.url);

/**
 * The arguments for loading environment variables.
 * @param populateProcessEnv - Whether to populate `process.env` with the loaded environment variables. Defaults to `false`.
 * @param path - The path to the source file containing the environment variables. If unspecified, falls back to `config.ts` then `.env`.
 */
export type Args = {
    populateProcessEnv?: boolean,
    path?: string,
}

const loadConfigFromEnv = (path: string): {
    [key: string]: string
} => {
    logger.debug(`Loading env-based config from: ${path}`)
    return {}
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
export function loadConfig(args?: Args) {
    args = args ?? {};
    let config;
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
    if (args.path?.endsWith('.ts')) {
        config = loadConfigFromTs(args.path);
    } else {
        config = loadConfigFromEnv(args.path);
    }
    logger.info(`Loaded config from '${args.path}': ${JSON.stringify(config)}`)
}