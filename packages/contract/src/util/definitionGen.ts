import { abiJson } from '../abi/index'
import { AbiMetaDataSpec, AbiStorage, AbiType, ContractAbi, TypegenDefinitions } from '../types/index'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoContractError } from '../handlers'

function snakeCaseToCamelCase(str: string) {
    return str.replace(/([-_][a-z])/gi, ($1) => {
        return $1.toUpperCase().replace('-', '').replace('_', '')
    })
}

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export type AbiVersion = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9'

/**
 *     Get the contract ABI version
 */
export function getABIVersion(json: ContractAbi): AbiVersion {
    try {
        return <'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9'>(
            Object.keys(json).filter((key) => key.search(/V\d/) > -1)[0]
        )
    } catch (e) {
        throw new ProsopoContractError('CONTRACT.INVALID_ABI')
    }
}

/**
 * Get the relevant type definition from the ABI
 * @param types
 * @param {string[]} path
 */
function getTypes(types: AbiType[], path: string[]): AbiType[] {
    const typeDefs: AbiType[] = []
    for (const type of types) {
        if (type.type.path) {
            if (type.type.path.slice(0, -1).join('::') === path.join('::')) {
                typeDefs.push(type)
            }
        }
    }

    return typeDefs
}

/**
 * Convert ABI types to definitions for typegen
 * @param {AbiType[]} filteredTypes
 * @param {AbiType[]} types
 */
function typesToDefinition(filteredTypes: AbiType[], types: AbiType[]): Record<string, string> {
    const definitions = {}
    try {
        for (const type of filteredTypes) {
            if (type.type.path) {
                const definitionKey = defNameFromPath(type.type.path)
                if (type.type.def.composite) {
                    definitions[definitionKey] = {}
                    type.type.def.composite.fields.map((field) => {
                        if (!field.name) {
                            throw new ProsopoEnvError('CONTRACT.NOT_HANDLED')
                        } else {
                            definitions[definitionKey][snakeCaseToCamelCase(field.name)] = defStr(types[field.type])
                        }
                    })
                } else if (type.type.def.variant) {
                    definitions[definitionKey] = {
                        _enum: type.type.def.variant.variants.map((variant) => {
                            return variant.name
                        }),
                    }
                }
            }
        }
    } catch (e) {
        throw new ProsopoEnvError(e)
    }
    return definitions
}

type StorageFieldTypes = AbiType[][]
type StorageFieldTypesObject = { [key: string]: StorageFieldTypes }

/**
 * Get an object containing storage types and each of their subtypes as a nested array
 * @param {AbiStorage} storage
 * @param {AbiType[]} types
 * @returns {StorageFieldTypesObject}
 */
function getStorageTypes(storage: AbiStorage, types: AbiType[]): StorageFieldTypesObject {
    const fieldTypesObject: StorageFieldTypesObject = {}
    try {
        for (const field of storage.struct.fields) {
            const outerKey = capitalizeFirstLetter(snakeCaseToCamelCase(field.name))
            fieldTypesObject[outerKey] = []
            if (field.layout.cell && field.layout.cell.ty !== undefined) {
                const outerTypeIndex: number | undefined = field.layout.cell.ty
                let innerTypes: AbiType[] = [types[outerTypeIndex]]
                let innerType: AbiType | undefined
                fieldTypesObject[outerKey].push([...innerTypes])
                if (innerTypes.length > 0) {
                    while (innerTypes.length > 0) {
                        innerType = innerTypes.pop()
                        if (innerType) {
                            if (innerType.type.def.composite) {
                                innerTypes = expandCompositeType(innerType, types)
                                if (innerTypes.length > 0) {
                                    fieldTypesObject[outerKey].push([...innerTypes])
                                }
                            } else if (innerType.type.def.variant) {
                                fieldTypesObject[outerKey].push([innerType])
                            } else if (innerType.type.def.tuple) {
                                fieldTypesObject[outerKey].push([innerType])
                            } else if (innerType.type.def.sequence) {
                                fieldTypesObject[outerKey].push([types[innerType.type.def.sequence.type]])
                            } else if (innerType.type.def.array) {
                                fieldTypesObject[outerKey].push([innerType])
                            } else if (innerType.type.def.primitive) {
                                fieldTypesObject[outerKey].push([innerType])
                            } else {
                                console.debug(innerType)
                                console.debug('Unknown type')
                            }
                        }
                    }
                }
            } else {
                console.debug(`${outerKey} has no type`)
                // console.debug(JSON.stringify(field, null, 4))
            }
        }
    } catch (e) {
        throw new ProsopoEnvError(e)
    }

    return fieldTypesObject
}

/**
 * Convert the storage types object to definitions for typegen
 * @param {StorageFieldTypesObject} storageTypes
 */
function storageTypesToDefinitions(storageTypes: StorageFieldTypesObject, prefix: string): Record<string, string> {
    const definitions = {}
    for (const [outerKey, fieldTypesArr] of Object.entries(storageTypes)) {
        let definition = ''
        if (fieldTypesArr && fieldTypesArr.length > 0 && fieldTypesArr[0][0]) {
            const outerLayer = 0
            let innerLayer = outerLayer + 1
            let outerType = fieldTypesArr[outerLayer][0]
            let outerParams = outerType.type.params
            let outerPath = outerType.type.path
            let innerType = fieldTypesArr[outerLayer][0]

            if (outerParams !== undefined && outerParams.length !== 2) {
                // don't know if this can happen or not
                throw new ProsopoEnvError('CONTRACT.NOT_HANDLED')
            } else if (outerParams !== undefined && outerParams.length == 2 && outerPath && fieldTypesArr[innerLayer]) {
                innerType = fieldTypesArr[innerLayer][1]
                // case where outer type has params and there are 2 inner types
                if (innerType.type.params) {
                    while (innerType !== undefined && innerLayer < fieldTypesArr.length - 1) {
                        if (outerParams !== undefined && outerParams.length !== 2) {
                            throw new ProsopoEnvError('CONTRACT.NOT_HANDLED')
                        } else if (outerParams !== undefined && outerParams.length == 2 && outerPath && innerType) {
                            definition += `${defStr(outerType)}<${defStr(fieldTypesArr[innerLayer][0])}<${defStr(
                                fieldTypesArr[innerLayer][1]
                            )},`
                        }
                        innerLayer++
                        outerType = fieldTypesArr[innerLayer][0]
                        innerType = fieldTypesArr[innerLayer][1]
                        outerPath = outerType.type.path
                        outerParams = outerType.type.params
                        if (!innerType && outerPath) {
                            if (outerPath) {
                                definition += `${outerPath.slice(-1)}`
                            }
                            definition += '>>'
                            break
                        }
                    }
                } else {
                    const inner1 = fieldTypesArr[innerLayer][0]
                    const inner2 = fieldTypesArr[innerLayer][1]
                    definition = `${defStr(outerType)}<${defStr(inner1)},${defStr(inner2)}>`
                }
            } else {
                definition += defStr(outerType, fieldTypesArr[innerLayer] ? fieldTypesArr[innerLayer][0] : undefined)
            }
        }
        if (definition.length) {
            definitions[outerKey] = definition
        }
    }
    return definitions
}

/**
 * Get the definition string for a type
 * @param {AbiType} type
 * @param {AbiType} innerType
 */
function defStr(type: AbiType, innerType?: AbiType): string {
    let definition = ''
    if (type.type.path && type.type.path.slice(0, 2).join('::') === 'ink_env::types') {
        definition = type.type.path.slice(-1)[0]
    } else if (type.type.def.primitive) {
        definition = type.type.def.primitive
    } else if (type.type.def.array) {
        definition = '[]'
    } else if (type.type.def.tuple) {
        definition = '()'
    } else if (type.type.def.sequence) {
        definition = `Vec<${innerType?.type.path?.slice(-1)[0]}>`
    } else if (type.type.def.composite) {
        const typeName = `${type.type.path?.slice(-1)[0]}`
        if (typeName === 'Mapping') {
            definition = 'Map'
        } else if (typeName === `Timestamp`) {
            definition = `Vec<u8`
        } else if (typeName === `BTreeSet`) {
            definition = `BTreeSet`
        } else if (type.type.path) {
            definition = defNameFromPath(type.type.path)
            //console.log('defNameFromPath', definition)
        }
    } else if (type.type.path && type.type.def.variant) {
        definition = defNameFromPath(type.type.path)
    } else {
        console.error(type)
        throw new ProsopoEnvError('CONTRACT.INVALID_TYPE')
    }
    return definition
}

/**
 * Return an array of types from a composite type
 * @param type
 * @param types
 */
function expandCompositeType(type: AbiType, types: AbiType[]): AbiType[] {
    if (type.type.params !== undefined) {
        const params = type.type.params
        if (type.type.params.length == 1) {
            const valueTypeIndex = params && params[0] ? parseParamType(params[0].type) : undefined
            if (valueTypeIndex) {
                return [types[valueTypeIndex]]
            }
        } else if (type.type.params.length == 2) {
            const keyTypeIndex = params && params[0] ? parseParamType(params[0].type) : undefined
            const valueTypeIndex = params && params[1] ? parseParamType(params[1].type) : undefined
            if (keyTypeIndex && valueTypeIndex) {
                return [types[keyTypeIndex], types[valueTypeIndex]]
            }
        } else {
            throw new ProsopoEnvError('CONTRACT.NOT_HANDLED')
        }
    }

    return []
}

export function defNameFromPath(path: string[]): string {
    return `${capitalizeFirstLetter(snakeCaseToCamelCase(path.slice(-2)[0]))}${path.slice(-1)[0]}`
}

export function parseParamType(paramType: string | number): number {
    if (typeof paramType === 'number') {
        return paramType
    } else {
        return parseInt(paramType)
    }
}

/**
 * Generate the definitions object for a contract from the contract ABI
 * @param path
 */
export function generateDefinitions(path: string[]): TypegenDefinitions {
    const abi = AbiMetaDataSpec.parse(abiJson)
    const version = getABIVersion(abi)
    let abiTypes: AbiType[]
    let abiStorage: AbiStorage
    if (version) {
        abiTypes = abi[version].types
        abiStorage = abi[version].storage
    } else {
        throw new ProsopoEnvError('CONTRACT.INVALID_ABI')
    }

    const filteredTypes = getTypes(abiTypes, path)
    const typeDefinitions = typesToDefinition(filteredTypes, abiTypes)
    const storageTypes = getStorageTypes(abiStorage, abiTypes)
    const storageDefinitions = storageTypesToDefinitions(storageTypes, path.slice(-2)[0])
    return { types: { ...storageDefinitions, ...typeDefinitions } }
}

//console.log(JSON.stringify(generateDefinitions(['prosopo', 'prosopo']), null, 4))
