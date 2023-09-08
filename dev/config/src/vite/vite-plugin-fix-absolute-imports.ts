import { builtinModules } from 'module'
import type { Plugin } from 'vite'

export default function VitePluginFixAbsoluteImports(): Plugin {
    return {
        name: 'fix-absolute-imports',
        transform(code: string, id: string) {
            for (const module of builtinModules) {
                const moduleImportRegex = new RegExp(`from "(${module}(/.*)*/.*.js)";`, 'g')
                // if matches, replace match with _module
                const matches = code.match(moduleImportRegex)
                if (matches) {
                    for (const match of matches) {
                        code = code.replace(match, `from "${module}";`)
                    }
                }
            }
            return {
                code,
            }
        },
        enforce: 'post',
    }
}
