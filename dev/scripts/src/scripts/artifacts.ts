// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Abi } from '@polkadot/api-contract/Abi'
import z from 'zod'

// {
//     "id": 0,
//   "type": {
//     "def": {
//         "composite": {
//             "fields": [
//                 {
//                     "name": "offset_key",
//                     "type": 10,
//                     "typeName": "Key"
//                 }
//             ]
//         }
//     },
//     "params": [
//         {
//             "name": "K",
//             "type": 1
//         },
//         {
//             "name": "V",
//             "type": 4
//         }
//     ],
//       "path": [
//         "ink_storage",
//         "lazy",
//         "mapping",
//         "Mapping"
//     ]
// }
// },
// {
//     "id": 1,
//   "type": {
//     "def": {
//         "composite": {
//             "fields": [
//                 {
//                     "type": 2,
//                     "typeName": "[u8; 32]"
//                 }
//             ]
//         }
//     },
//     "path": [
//         "ink_env",
//         "types",
//         "AccountId"
//     ]
// }
// },
export const AbiTypeIdSpec = z.object({
    type: z.number(),
})

export const AbiParamSpec = z.object({
    name: z.string(),
    type: z.union([z.number(), z.string(), z.null()]),
})

export const AbiFieldSpec = z.object({
    name: z.union([z.string(), z.null()]).optional(),
    type: z.number(),
    typeName: z.union([z.string(), z.null()]).optional(),
})

export const AbiVariantSpec = z.object({
    index: z.number(),
    name: z.string(),
    fields: z.array(AbiTypeIdSpec).optional(),
})

//An enum in the storage section of the abi
// {
//                                 "0": {
//                                   "fields": [],
//                                   "name": "Pending"
//                                 },
//                                 "1": {
//                                   "fields": [],
//                                   "name": "Approved"
//                                 },
//                                 "2": {
//                                   "fields": [],
//                                   "name": "Disapproved"
//                                 }

const AbiStorageEnumFieldSpec = z.object({
    name: z.string(),
    fields: z.array(z.any()),
})

export const AbiStorageEnumSpec = z.record(z.number().min(0), AbiStorageEnumFieldSpec)
export const AbiCompactSpec = z.object({
    type: z.number(),
})

export const AbiTypeSpec = z.object({
    id: z.number(),
    type: z.object({
        def: z.object({
            compact: AbiCompactSpec.optional(),
            composite: z
                .object({
                    fields: z.array(AbiFieldSpec),
                })
                .optional(),
            variant: z
                .object({
                    variants: z.array(AbiVariantSpec).optional(),
                })
                .optional(),
            sequence: z
                .object({
                    type: z.number(),
                })
                .optional(),
            array: z
                .object({
                    len: z.number(),
                    type: z.number(),
                })
                .optional(),
            primitive: z.string().optional(),
            tuple: z.any().optional(),
        }),
        params: z.array(AbiParamSpec).optional(),
        path: z.array(z.string()).optional(),
    }),
})

export const AbiEnumSpec = z.object({
    dispatchKey: z.string(),
    variants: z.any(),
    name: z.string(),
})

export const AbiCellSpec = z.object({
    key: z.string().optional(),
    ty: z.union([z.number(), z.string()]).optional(),
})
export const AbiTypesSpec = z.array(AbiTypeSpec)

export const AbiStorageFieldSpec: any = z.lazy(() =>
    z.object({
        name: z.string().optional(),
        layout: z.object({
            leaf: AbiCellSpec.optional(),
            enum: AbiEnumSpec.optional(),
            root: AbiStorageFieldSpec.optional(),
            struct: AbiStorageStructSpec.optional(),
            array: z
                .object({
                    layout: z.object({ leaf: AbiCellSpec }),
                    len: z.number(),
                    offset: z.string(),
                })
                .optional(),
        }),
        root_key: z.string().optional(),
    })
)

export const AbiStorageStructSpec = z.object({
    fields: z.array(AbiStorageFieldSpec),
    name: z.string(),
})

export const AbiStorageSpec = z.object({
    root: z.object({
        layout: z.object({
            struct: AbiStorageStructSpec.optional(),
        }),
        root_key: z.string(),
    }),
})

export type AbiStorage = z.infer<typeof AbiStorageSpec>
export type AbiStorageField = z.infer<typeof AbiStorageFieldSpec>
export const AbiArgTypeSpec = z.object({
    displayName: z.array(z.string()),
    type: z.number(),
})
export const AbiArgSpec = z.object({
    label: z.string(),
    type: AbiArgTypeSpec,
})

//        "environment": {
//             "accountId": {
//                 "displayName": [
//                     "AccountId"
//                 ],
//                 "type": 7
//             },
//             "balance": {
//                 "displayName": [
//                     "Balance"
//                 ],
//                 "type": 0
//             },
//             "blockNumber": {
//                 "displayName": [
//                     "BlockNumber"
//                 ],
//                 "type": 1
//             },
//             "chainExtension": {
//                 "displayName": [
//                     "ChainExtension"
//                 ],
//                 "type": 65
//             },
//             "hash": {
//                 "displayName": [
//                     "Hash"
//                 ],
//                 "type": 4
//             },
//             "maxEventTopics": 4,
//             "timestamp": {
//                 "displayName": [
//                     "Timestamp"
//                 ],
//                 "type": 64
//             }
//         },
export const AbiEnvironmentSpec = z.object({
    accountId: AbiArgTypeSpec,
    balance: AbiArgTypeSpec,
    blockNumber: AbiArgTypeSpec,
    chainExtension: AbiArgTypeSpec,
    hash: AbiArgTypeSpec,
    maxEventTopics: z.number(),
    timestamp: AbiArgTypeSpec,
})

export const AbiMessageSpec = z.object({
    args: z.array(AbiArgSpec),
    default: z.boolean(),
    docs: z.array(z.string()),
    label: z.string(),
    mutates: z.boolean(),
    payable: z.boolean(),
    returnType: AbiArgTypeSpec,
    selector: z.string(),
})
export type AbiMessageType = z.infer<typeof AbiMessageSpec>

export const AbiSpecDef = z.object({
    constructors: z.array(z.any()),
    docs: z.array(z.any()),
    events: z.array(z.any()),
    lang_error: AbiArgTypeSpec,
    messages: z.array(AbiMessageSpec),
    environment: AbiEnvironmentSpec,
})

enum metadataVersion {
    V1 = 'V1',
    V2 = 'V2',
    V3 = 'V3',
}

export const AbiDetailsSpec = z.object({
    spec: AbiSpecDef,
    types: AbiTypesSpec,
    storage: AbiStorageSpec,
})

export const AbiMetaDataSpec = z.object({
    metadataVersion: z.string().optional(),
    source: z.object({
        hash: z.string(),
        language: z.string(),
        compiler: z.string(),
        build_info: z.object({
            build_mode: z.string(),
            cargo_contract_version: z.string(),
            rust_toolchain: z.string(),
            wasm_opt_settings: z.object({
                keep_debug_symbols: z.boolean(),
                optimization_passes: z.string(),
            }),
        }),
        wasm: z.string().optional(),
    }),
    contract: z.object({
        name: z.string(),
        version: z.string(),
        authors: z.array(z.string()),
    }),
    [metadataVersion.V1]: AbiDetailsSpec.optional(),
    [metadataVersion.V2]: AbiDetailsSpec.optional(),
    [metadataVersion.V3]: AbiDetailsSpec.optional(),
    spec: AbiSpecDef,
    types: AbiTypesSpec,
    storage: AbiStorageSpec,
    version: z.string(),
})

export type AbiMetadata = z.infer<typeof AbiMetaDataSpec>

export type ContractAbi = Record<string, unknown> | Abi

export type AbiType = z.infer<typeof AbiTypeSpec>

export type TypegenDefinitions = { types: Record<string, string> }
