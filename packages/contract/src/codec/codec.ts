// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { Registry } from '@polkadot/types-codec/types/registry'
import { Vec } from '@polkadot/types-codec'
import type { Codec } from '@polkadot/types-codec/types'
import { createTypeUnsafe } from '@polkadot/types'

export type DecodeFunction = (registry: Registry, data: Uint8Array) => Vec<Codec>

export const buildDecodeVector =
    (typeName: string): DecodeFunction =>
    (registry: Registry, data: Uint8Array) => {
        return createTypeUnsafe<Vec<Codec>>(registry, typeName, [data])
    }
