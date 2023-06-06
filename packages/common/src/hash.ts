// Copyright (C) 2021-2023 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { arrayJoin } from './array'
import { blake2AsHex } from '@polkadot/util-crypto'
export const HEX_HASH_BIT_LENGTH = 256

export function hexHash(data: string | Uint8Array, bitLength?: 256 | 512 | 64 | 128 | 384 | undefined): string {
    // default bit length is 256
    return blake2AsHex(data, bitLength)
}

export function hexHashArray<T>(arr: T[]): string {
    return hexHash(arrayJoin(arr))
}
