import {ApiPromise, WsProvider} from '@polkadot/api';

const providers = {
  'kusama': {'endpoint': 'wss://kusama-rpc.polkadot.io/'},
  'polkadot': {'endpoint': 'wss://rpc.polkadot.io'}
}

async function run() {
  // Construct
  for (let provider in providers) {
    const wsProvider = new WsProvider(providers[provider].endpoint);
    const api = await ApiPromise.create({provider: wsProvider});

    // Do something
    const validators = await api.query.staking.validators.keys();
    console.log(`${validators.length} validators on ${provider}`);
  }
  process.exit()

}

run()
