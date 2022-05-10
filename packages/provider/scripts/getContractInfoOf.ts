import {ApiPromise, WsProvider} from "@polkadot/api";

const providers = {
  'local': {'endpoint': 'ws://substrate-node:9944'},
  //'polkadot': {'endpoint': 'wss://rpc.polkadot.io'}
}

async function run() {
  // Construct
  for (let provider in providers) {
    const wsProvider = new WsProvider(providers[provider].endpoint);
    const api = await ApiPromise.create({provider: wsProvider});
    const result = await api.query.contracts.contractInfoOf('5CYKEXWU3L4zWregopd2bTjoZLH9yHBpfXaqkFaTfxacaSA1')
    console.log(result.toHuman())
    process.exit()
  }
}
run()
