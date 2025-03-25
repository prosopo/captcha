import path from "node:path";
import type {UserConfig} from "vite";
import dts from "vite-plugin-dts";
import deepmerge from "deepmerge";

interface IntegrationConfigSettings {
    directory: string,
    name: string,
    viteSettings?: UserConfig,
}

function createIntegrationViteConfig(configSettings: IntegrationConfigSettings): UserConfig {
    const defaultConfig: UserConfig = {
        plugins: [
            dts(),
        ],
        build: {
            outDir: path.resolve(configSettings.directory, "./dist"),
            emptyOutDir: true,
            lib: {
                name: configSettings.name,
                entry: path.resolve(configSettings.directory, './src/index.ts'),
                fileName: (format) => `index.js`,
                formats: ["es"],
            }
        },
    };

    return deepmerge(defaultConfig, configSettings.viteSettings || {});
}

export {createIntegrationViteConfig};