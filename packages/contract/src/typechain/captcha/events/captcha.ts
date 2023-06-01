import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'

export default class EventsClass {
    private __nativeContract: ContractPromise
    private __api: ApiPromise

    constructor(nativeContract: ContractPromise, api: ApiPromise) {
        this.__nativeContract = nativeContract
        this.__api = api
    }

    private __subscribeOnEvent(
        callback: (args: any[], event: any) => void,
        filter: (eventName: string) => boolean = () => true
    ) {
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
