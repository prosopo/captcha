import { createRaribleSdk } from '@rarible/protocol-ethereum-sdk';
import React, { createContext, Dispatch, useContext, useReducer } from 'react';
import { NETWORK_ID, NETWORK_NAME } from 'utils/constants';
import Web3 from 'web3';
import type { WalletAction } from './actions';
import reducer from './reducers';

export const initialState: WalletState = {
  balance: '-1',
  address: undefined,
  wallet: { name: '' },
  network: Number.parseInt(NETWORK_ID),
  web3: undefined,
  ens: undefined,
  raribleSDK: createRaribleSdk(null, NETWORK_NAME as 'e2e' | 'ropsten' | 'rinkeby' | 'mainnet'),
};

type WalletState = {
  balance: string;
  address: string;
  wallet: { name: string };
  network: number;
  web3?: Web3;
  ens: string;
  raribleSDK: ReturnType<typeof createRaribleSdk>;
};

const WalletContext = createContext<[WalletState, Dispatch<WalletAction>]>(null);
const useWallet = () => useContext(WalletContext);
const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <WalletContext.Provider value={[state, dispatch]}>{children}</WalletContext.Provider>;
};

export type { WalletState };
export { WalletProvider, useWallet };
