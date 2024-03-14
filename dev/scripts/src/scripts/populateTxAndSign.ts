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


// #!/usr/bin/env node
// import { hexToString, hexToU8a, u8aToHex } from '@polkadot/util'
// import { Environment } from '../src/env'
// import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
// import { Option, GenericAccountId } from '@polkadot/types'
//
// require('dotenv').config()

// async function main () {
//     const env = new Environment(undefined)
//     await env.isReady()
//     const contractApi = new ProsopoContractApi(env)
//     const serviceOrigin = 'http://localhost:9229'
//     const dappContract = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
//     const mnemonic = '//Alice'
//
//     if (mnemonic) {
//         const signerPair = env.network.keyring.addFromMnemonic(mnemonic)
//         const senderAddress = signerPair.address
//         const davePair = env.network.keyring.addFromMnemonic('//Dave')
//         console.log(davePair.address)
//         // let emptyOption: <T extends Codec> (typeName: keyof InterfaceTypes) => Option<T>;
//         const args = [serviceOrigin, dappContract, new Option(env.network.registry, GenericAccountId)]
//         const method = 'dappRegister'
//         const encodedArgs = contractApi.encodeArgs(method, args)
//         console.log(new Option(env.network.registry, GenericAccountId).toU8a())
//         // console.log(u8aToHex(encodedArgs));
//         console.log(encodedArgs)
//         const populatedTx = await env.contract?.populateTransaction.dappRegister(...encodedArgs, { gasLimit: 8705000000 })
//         console.log(encodeAddress(populatedTx!.callParams!.dest))
//         console.log(populatedTx!.callParams!.gasLimit.toString())
//         console.log(u8aToHex(populatedTx!.callParams!.inputData))
//         const payload = u8aToHex(populatedTx!.callParams!.inputData)
//         console.log('Payload generated with no signer present in environment\n')
//         console.log(`Payload: ${payload}`)
//         await env.changeSigner(mnemonic)
//         const signature = signerPair.sign(hexToU8a(payload), { withType: true })
//         console.log(`Signature: ${u8aToHex(signature)}`)
//         console.log(`Decoding 0x42b45efa: ${hexToString('0x42b45efa')}`)
//         console.log(`Decoding 0x1501: ${hexToString('0x1501')}`)
//         // decodeU8a
//         console.log(new Option(env.network.registry, GenericAccountId, null).toU8a())
//         process.exit(0)
//     }
// }
//
// main()
//     .catch((error) => {
//         console.error(error)
//         process.exit()
//     })
