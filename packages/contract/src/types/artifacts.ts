// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import { Abi } from '@polkadot/api-contract'
import { Text } from '@polkadot/types'
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

export const AbiTypeSpec = z.object({
    id: z.number(),
    type: z.object({
        def: z.object({
            composite: z
                .object({
                    fields: z.array(AbiFieldSpec),
                })
                .optional(),
            variant: z
                .object({
                    variants: z.array(AbiVariantSpec),
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
    ty: z.number(),
})
export const AbiTypesSpec = z.array(AbiTypeSpec)

export const AbiStorageEntrySpec = z.lazy(() =>
    z.object({
        name: AbiText.optional(),
        layout: z.object({
            leaf: AbiCellSpec.optional(),
            enum: AbiEnumSpec.optional(),
            root: AbiStorageEntrySpec.optional(),
        }),
    })
)

export const AbiStorageSpec = z.object({
    root: z.object({
        layout: z.object({
            struct: z.object({
                fields: z.array(AbiStorageEntrySpec),
            }),
        }),
    }),
})

export type AbiStorage = z.infer<typeof AbiStorageSpec>
export type AbiStorageEntry = z.infer<typeof AbiStorageEntrySpec>

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
