# Vite Plugin Watch Workspace

Vite Plugin Watch Workspace is a Vite plugin that watches for changes in local dependencies in a monorepo and rebuilds
them when they change.

## Installation

```bash
npm install @prosopo/vite-plugin-watch-workspace
```

## Usage

Add the plugin to your Vite config:

```typescript
import { defineConfig } from 'vite'
import { VitePluginWatchWorkspace } from '@prosopo/vite-plugin-watch-workspace'

export default defineConfig(async function ({ command, mode }) {
    return {
        plugins: [
            VitePluginWatchWorkspace({
                workspaceRoot: '/path/to/your/workspace',
                currentPackage: '/path/to/your/current/package',
                format: 'esm', // or 'cjs'
                fileTypes: ['ts', 'tsx', 'js', 'jsx'], // optional - file types to watch. default is ['ts', 'tsx']
                ignorePaths: ['node_modules', 'dist'], // optional - globs to ignore
            }),
        ],
    }
})
```

#### Options

-   `workspaceRoot` - The root of your monorepo.
-   `currentPackage` - The path to the package that is currently being built. Can be a path or a glob.
-   `format` - The module format to use. Can be `'esm'` or `'cjs'`.
-   `fileTypes` - An array of file types to watch. Optional. Default is `['ts', 'tsx']`.
-   `ignorePaths` - An array of globs to ignore. Optional.

## How it works

The plugin takes your `workspaceRoot` and searches for packages by reading the `workspaces` field in your workspace
root `package.json`. It then searches for files in the packages that match the `fileTypes` you provided and adds the
files to Vite's watch list. When one of the discovered files changes, the plugin loads the tsconfig associated with it
and builds the file using esbuild.

See [this article](https://prosopo.io/articles/using-vite-to-rebuild-local-dependencies-in-an-npm-workspace) for more
details.
