import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'
import { TsConfigSourceFile } from 'typescript'

interface FoundReference {
    typeOnly: boolean
    relativePathReference: boolean
    referencingPath: string
    referencedSpecifier: string
}

const specifierRelativeFile = /^\..*(?<!\.(less|svg|png|woff))$/
const specifierNodeModule = /^[^.]/
const specifierWorkspacePackage = /@prosopo\/[\w-]+/
const diveDeeper = (path: string, node: ts.Node, found: FoundReference[], specifierMatcher?: RegExp) =>
    Promise.all(node.getChildren().map((n) => findAllReferencesNode(path, n, found, specifierMatcher)))

function removeFileNameFromEndOfPath(filePath: string) {
    const pathArray = filePath.split('/')
    pathArray.pop()
    return pathArray.join('/')
}

function filePathHasExtension(filePath): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}

function readSource(filePath: string) {
    return fs.readFileSync(filePath, 'utf8')
}

function fileExists(filePath): boolean {
    return fs.existsSync(filePath)
}

function isDir(filePath): boolean {
    try {
        return fs.lstatSync(filePath).isDirectory()
    } catch (e) {
        return false
    }
}

function stripJsonComments(data) {
    return data.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? '' : m))
}

function resolveExtendedTsConfig(tsconfigPath): TsConfigSourceFile {
    const tsconfigData = ts.readConfigFile(tsconfigPath, ts.sys.readFile).config
    const { extends: extendedTsConfigPath } = tsconfigData
    console.log(tsconfigData)
    return tsconfigData
    // if (extendedTsConfigPath) {
    //     const absExtendedTsConfigPath = path.resolve(path.dirname(tsconfigPath), extendedTsConfigPath)
    //     const extendedTsConfig = resolveExtendedTsConfig(absExtendedTsConfigPath)
    //     return {
    //         ...extendedTsConfig,
    //         ...JSON.parse(tsconfigData),
    //         compilerOptions: {
    //             ...extendedTsConfig.compilerOptions,
    //             ...JSON.parse(tsconfigData).compilerOptions,
    //         },
    //     }
    // }
    // return JSON.parse(tsconfigData)
}

async function getSpecifierFilePath(originalFilePath: string, specifier: string): Promise<string> {
    let newFilePath = path.resolve(removeFileNameFromEndOfPath(originalFilePath), specifier)
    const isDirectory = isDir(newFilePath)
    let exists = fileExists(newFilePath)

    if (exists && !isDirectory && filePathHasExtension(newFilePath)) {
        return newFilePath
    } else if (exists && isDirectory) {
        // is a folder, so look for index.d.ts or index.d.tsx
        const possibleFileNames = ['index.ts', 'index.tsx', 'index.d.ts', 'index.d.tsx']
        for (const fileName of possibleFileNames) {
            newFilePath = path.resolve(removeFileNameFromEndOfPath(originalFilePath), specifier, fileName)
            exists = fileExists(newFilePath)
            if (exists) {
                return newFilePath
            }
        }
    } else {
        // is a file reference without an extension, so look for ts, tsx, js, jsx
        console.log(`does not have extension ${specifier}`)
        const possibleExtensions = ['ts', 'tsx', 'js', 'jsx']
        for (const extension of possibleExtensions) {
            newFilePath = path.resolve(removeFileNameFromEndOfPath(originalFilePath), `${specifier}.${extension}`)
            exists = fileExists(newFilePath)
            if (exists) {
                return newFilePath
            }
        }
    }
    if (!exists) {
        throw new Error(`Could not find file ${specifier} referenced in ${originalFilePath}`)
    }
    return newFilePath
}

const findAllReferencesNode = async (
    filePath: string,
    node: ts.Node,
    found: FoundReference[],
    specifierWorkspaceMatcher?: RegExp
) => {
    switch (node.kind) {
        case ts.SyntaxKind.ExportDeclaration:
            const exportDeclaration = node as ts.ExportDeclaration

            if (exportDeclaration.moduleSpecifier) {
                const specifier = (exportDeclaration.moduleSpecifier as ts.StringLiteral).text

                if (specifier) {
                    if (specifierRelativeFile.test(specifier)) {
                        found.push({
                            typeOnly: exportDeclaration.isTypeOnly,
                            relativePathReference: true,
                            referencingPath: filePath,
                            referencedSpecifier: specifier,
                        })
                    } else if (specifierNodeModule.test(specifier)) {
                        found.push({
                            typeOnly: exportDeclaration.isTypeOnly,
                            relativePathReference: false,
                            referencingPath: filePath,
                            referencedSpecifier: specifier,
                        })
                    }
                }
            }

            break
        case ts.SyntaxKind.ImportDeclaration:
            const importDeclaration = node as ts.ImportDeclaration
            const importClause = importDeclaration.importClause

            const specifier = (importDeclaration.moduleSpecifier as ts.StringLiteral).text

            if (specifier) {
                if (specifierRelativeFile.test(specifier)) {
                    found.push({
                        typeOnly: !!importClause && !importClause.isTypeOnly,
                        relativePathReference: true,
                        referencingPath: filePath,
                        referencedSpecifier: specifier,
                    })
                    const newFilePath = await getSpecifierFilePath(filePath, specifier)
                    const newSource = readSource(newFilePath)
                    const newNode = ts.createSourceFile(newFilePath, newSource, ts.ScriptTarget.ES2015, true)
                    await diveDeeper(newFilePath, newNode, found, specifierWorkspaceMatcher)
                } else if (specifierNodeModule.test(specifier)) {
                    console.log(specifier, specifierWorkspaceMatcher, specifierWorkspaceMatcher?.test(specifier))
                    if (specifierWorkspaceMatcher && specifierWorkspaceMatcher.test(specifier)) {
                        found.push({
                            typeOnly: !!importClause && !importClause.isTypeOnly,
                            relativePathReference: false,
                            referencingPath: filePath,
                            referencedSpecifier: specifier,
                        })

                        console.log('adding', specifier)
                        const newFilePath = await getSpecifierFilePath(filePath, specifier)
                        const newSource = readSource(newFilePath)
                        const newNode = ts.createSourceFile(newFilePath, newSource, ts.ScriptTarget.ES2015, true)
                        await diveDeeper(newFilePath, newNode, found, specifierWorkspaceMatcher)
                    }
                }
            }

            break
        case ts.SyntaxKind.CallExpression:
            const callExpression = node as ts.CallExpression

            if (
                (callExpression.expression.kind === ts.SyntaxKind.ImportKeyword ||
                    (callExpression.expression.kind === ts.SyntaxKind.Identifier &&
                        callExpression.expression.getText() === 'require')) &&
                callExpression.arguments[0]?.kind === ts.SyntaxKind.StringLiteral
            ) {
                const specifier = (callExpression.arguments[0] as ts.StringLiteral).text

                if (specifierRelativeFile.test(specifier)) {
                    found.push({
                        typeOnly: false,
                        relativePathReference: true,
                        referencingPath: filePath,
                        referencedSpecifier: specifier,
                    })
                } else if (specifierNodeModule.test(specifier)) {
                    found.push({
                        typeOnly: false,
                        relativePathReference: false,
                        referencingPath: filePath,
                        referencedSpecifier: specifier,
                    })
                } else {
                    await diveDeeper(filePath, node, found, specifierWorkspaceMatcher)
                }
            } else {
                await diveDeeper(filePath, node, found, specifierWorkspaceMatcher)
            }

            break
        default:
            await diveDeeper(filePath, node, found, specifierWorkspaceMatcher)

            break
    }
}
const config = resolveExtendedTsConfig('/home/chris/dev/prosopo/captcha/packages/procaptcha-react/tsconfig.json')
console.log(config)
process.exit()
const filePath = '/home/chris/dev/prosopo/captcha/packages/procaptcha-react/src/index.tsx'

const source = fs.readFileSync(filePath, 'utf8')

const rootNode = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, /*setParentNodes */ true)

const found: FoundReference[] = []
console.log(specifierWorkspacePackage.test('@prosopo/captcha-react'))
findAllReferencesNode(filePath, rootNode, found, specifierWorkspacePackage).then(() => {
    console.log(found)
})
