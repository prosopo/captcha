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
import openpgp, { type WebStream } from 'openpgp'

/**
 * To encrypt a message with an array of encryption public keys
 * @param {string} message Message to encrypt
 * @param {array} encryptionKeys Armored version of array of public key
 * @returns {string} Return armored version of encrypted message
 */
export const encryptMessage = async (message: string, encryptionKeys: string[]): Promise<WebStream<string> | null> => {
    try {
        const publicKeys = await Promise.all(encryptionKeys.map((armoredKey) => openpgp.readKey({ armoredKey })))
        const pgpMessage = await openpgp.createMessage({ text: message.replace('\\“', '\\"') })
        // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
        return await openpgp.encrypt({
            message: pgpMessage, // input as Message object
            encryptionKeys: publicKeys,
        })
    } catch (error) {
        console.error('danger', 'Data encryption failed')
        return null
    }
}
