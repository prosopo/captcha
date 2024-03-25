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
import { handleEventReturn } from '@prosopo/typechain-types'
import type { ContractPromise } from '@polkadot/api-contract'

export function getTypeDescription(id: number | string, types: any): any {
    return types[id]
}

export function getEventTypeDescription(name: string, types: any): any {
    return types[name]
}

export function decodeEvents(events: any[], contract: ContractPromise, types: any): any[] {
    return events
        .filter((record: any) => {
            const { event } = record

            const [address, data] = record.event.data

            return event.method == 'ContractEmitted' && address.toString() === contract.address.toString()
        })
        .map((record: any) => {
            const [address, data] = record.event.data

            const { args, event } = contract.abi.decodeEvent(data)

            const _event: Record<string, any> = {}

            for (let i = 0; i < args.length; i++) {
                _event[event.args[i]!.name] = args[i]!.toJSON()
            }

            handleEventReturn(_event, getEventTypeDescription(event.identifier.toString(), types))

            return {
                name: event.identifier.toString(),
                args: _event,
            }
        })
}
