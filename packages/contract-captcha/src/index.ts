import { createClient, Enum, FixedSizeBinary } from 'polkadot-api'
import { getSmProvider } from 'polkadot-api/sm-provider'
import { rococoContracts, MultiAddress } from '@polkadot-api/descriptors'
import { smoldot } from './smoldot.js'
import { decodeAddress } from '@polkadot/util-crypto'

// dynamically importing the chainSpec improves the performance of your dApp
const smoldotRelayChain = import('polkadot-api/chains/polkadot').then(({ chainSpec }) =>
    smoldot.addChain({ chainSpec })
)

// getting a `JsonRpcProvider` from a `smoldot` chain.
const jsonRpcProvider = getSmProvider(smoldotRelayChain)

// we could also create a `JsonRpcProvider` from a WS connection, eg:
// const jsonRpcProvider = WsProvider("wss://some-rpc-endpoint.io")

const polkadotClient = createClient(jsonRpcProvider)

// logging blocks as they get finalized
polkadotClient.finalizedBlock$.subscribe((block) => {
    console.log(`#${block.number} - ${block.hash} - parentHash: ${block.parent}`)
})

// pulling the latest finalized block
const block = await polkadotClient.getFinalizedBlock()

// obtaining a delightfully typed interface from the descriptors
// previously generated from the metadata
const polkadotApi = polkadotClient.getTypedApi(rococoContracts)

// making a call to the chain
polkadotApi.tx.Contracts.call({
    //
    dest: Enum('Address32', new FixedSizeBinary<32>(decodeAddress('5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'))),
    value: 0,
    gas_limit: 1000000,
    storage_deposit_limit: 1000000,
    caller: '',
    data: '',
}).signAndSubmit('alice', (result) => {
    console.log(`Transaction status: ${result.status}`)
})
