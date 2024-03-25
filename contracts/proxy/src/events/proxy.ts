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
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'

export default class EventsClass {
    readonly __nativeContract: ContractPromise
    readonly __api: ApiPromise

    constructor(nativeContract: ContractPromise, api: ApiPromise) {
        this.__nativeContract = nativeContract
        this.__api = api
    }

    private __subscribeOnEvent(
        callback: (args: any[], event: any) => void,
        filter: (eventName: string) => boolean = () => true
    ) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.__api.query.system.events((events) => {
            events.forEach((record: any) => {
                const { event } = record

                if (event.method == 'ContractEmitted') {
                    const [address, data] = record.event.data

                    if (address.toString() === this.__nativeContract.address.toString()) {
                        const { args, event } = this.__nativeContract.abi.decodeEvent(data)

                        if (filter(event.identifier.toString())) callback(args, event)
                    }
                }
            })
        })
    }
}
