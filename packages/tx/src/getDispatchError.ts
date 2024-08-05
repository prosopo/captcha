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
import type { DispatchError } from '@polkadot/types/interfaces'

/** Convert a dispatch error to a readable message
 * @param dispatchError
 */
export function getDispatchError(dispatchError: DispatchError): string {
    let message: string = dispatchError.type

    if (dispatchError.isModule) {
        try {
            const mod = dispatchError.asModule
            const error = dispatchError.registry.findMetaError(mod)

            message = `${error.section}.${error.name}`
        } catch (error) {
            console.log('ERROR GETTING ERROR!', error)
            // swallow
        }
    } else if (dispatchError.isToken) {
        message = `${dispatchError.type}.${dispatchError.asToken.type}`
    }

    return message
}
