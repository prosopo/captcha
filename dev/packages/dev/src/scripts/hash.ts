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
import { blake2AsHex } from '@polkadot/util-crypto'
import { hexToString, isHex, stringToHex } from '@polkadot/util'

function main() {
    const arg = process.argv.slice(2)[0]
    console.log('arg                :', arg)
    console.log('blake2AsHex        :', blake2AsHex(arg))
    console.log('isHex              :', isHex(arg))
    console.log('hexToString        :', hexToString(arg))
    console.log('stringToHex        :', stringToHex(arg))
}

main()
