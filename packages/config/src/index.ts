/**
 * The arguments for loading environment variables.
 * @param populateProcessEnv - Whether to populate `process.env` with the loaded environment variables. Defaults to `false`.
 * @param src - The path to the source file containing the environment variables. If unspecified, falls back to `config.ts` then `.env`.
 */
export type Args = {
    populateProcessEnv?: boolean,
    src?: string,
}

const loadConfigEnv = (args?: Args) => {
    args = args ?? {};
}

const loadConfigTs = (args?: Args) => {
    args = args ?? {};

}

/**
 * Loads the config from env or a config file.
 * @param args - The arguments for loading environment variables.
 */
export function loadConfig(args?: Args) {
    args = args ?? {};
    if (args.src?.endsWith('.ts')) {
        return loadConfigTs(args);
    } else {
        return loadConfigEnv(args);
    }
}