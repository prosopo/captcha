import { createRaribleSdk } from '@rarible/protocol-ethereum-sdk';
import { Web3Ethereum } from '@rarible/web3-ethereum';
import Onboard from 'bnc-onboard';
import { WalletAction } from 'wallet/actions';
import Web3 from 'web3';
import { NETWORK_ID, NETWORK_NAME } from './constants';

let onboard: ReturnType<typeof Onboard>;

// the network id that your dapp runs on
const wallets = [
  { walletName: 'coinbase', preferred: true },
  { walletName: 'metamask', preferred: true },
  {
    walletName: 'walletConnect',
    infuraKey: 'a0da77ed4a744c6b8eb8850f22e49553',
  },
];

// initialize onboard
const initOnboard = (subscriptions) =>
  Onboard({
    hideBranding: true,
    darkMode: true,
    networkId: Number.parseInt(NETWORK_ID),
    subscriptions,
    walletSelect: { wallets },
    walletCheck: [{ checkName: 'connect' }, { checkName: 'network' }, { checkName: 'balance' }],
  });

export function getOnboard(dispatch: React.Dispatch<WalletAction>): ReturnType<typeof Onboard> {
  if (!onboard) {
    onboard = initOnboard({
      address: async (address) => {
        dispatch({
          type: 'SET_ADDRESS',
          payload: address,
        });
      },
      network: (network) => {
        dispatch({
          type: 'SET_NETWORK',
          payload: network,
        });
      },
      balance: (balance) => {
        dispatch({
          type: 'SET_BALANCE',
          payload: balance,
        });
      },
      wallet: (wallet) => {
        const web3 = new Web3(wallet.provider);
        if (wallet && wallet.name) {
          localStorage.setItem('walletName', wallet.name);
        }
        dispatch({
          type: 'SET_WALLET',
          payload: wallet,
        });
        dispatch({
          type: 'SET_WEB3',
          payload: web3,
        });
        console.log(NETWORK_NAME);
        dispatch({
          type: 'SET_SDK',
          payload: createRaribleSdk(
            new Web3Ethereum({ web3 }),
            NETWORK_NAME as 'e2e' | 'ropsten' | 'rinkeby' | 'mainnet'
          ),
        });
      },
    } as Pick<Parameters<typeof Onboard>[0], 'subscriptions'>);
  }
  return onboard;
}
