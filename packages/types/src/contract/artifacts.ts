// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { Text } from '@polkadot/types-codec/native'
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
export const AbiParamSpec = z.object({
    name: z.string(),
    type: z.union([z.number(), z.string()]),
})

export const AbiFieldSpec = z.object({
    name: z.string().optional(),
    type: z.number(),
    typeName: z.string().optional(),
})

export const AbiVariantSpec = z.object({
    index: z.number(),
    name: z.string(),
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

export const AbiTypeSpec = z.object({
    id: z.number(),
    type: z.object({
        def: z.object({
            composite: z.union([z
                .object({
                    fields: z.array(AbiFieldSpec),
                }), z.object({})])
                .optional(),
            variant: z
                .object({
                    variants: z.union([z.array(AbiVariantSpec).optional(), AbiStorageEnumSpec]),
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
})

export const AbiText = z.union([z.instanceof(Text), z.string()])

export const AbiCellSpec = z.object({
    key: AbiText,
    ty: z.union([z.number(), z.string()]),
})
export const AbiTypesSpec = z.array(AbiTypeSpec)

export const AbiStorageFieldSpec: any = z.lazy(() =>
    z.object({
        name: AbiText.optional(),
        layout: z.object({
            leaf: AbiCellSpec.optional(),
            enum: AbiEnumSpec.optional(),
            root: AbiStorageFieldSpec.optional(),
            struct: AbiStorageStructSpec.optional(),
        }),
        root_key: AbiText.optional(),
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
    }),
})

export type AbiStorage = z.infer<typeof AbiStorageSpec>
export type AbiStorageField = z.infer<typeof AbiStorageFieldSpec>

export const AbiSpecDef = z.object({
    constructors: z.array(z.any()),
    docs: z.array(z.any()),
    events: z.array(z.any()),
    messages: z.array(
        z.object({
            label: z.string(),
            selector: z.string(),
        })
    ),
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
})

export type AbiMetadata = z.infer<typeof AbiMetaDataSpec>

export type ContractAbi = Record<string, unknown> | Abi

export type AbiType = z.infer<typeof AbiTypeSpec>

export type TypegenDefinitions = { types: Record<string, string> }
