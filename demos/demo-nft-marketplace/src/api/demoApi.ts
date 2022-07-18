import { WsProvider, Keyring } from '@polkadot/api';
import { SubmittableResultValue } from '@polkadot/api/types';
import { Balance } from '@polkadot/types/interfaces';
import { Signer } from '@polkadot/types/types';
import { formatBalance } from '@polkadot/util';
import config from 'config';
import DemoNFTContract from './DemoNFTContract';
import getConfig from 'next/config';

const keyring = new Keyring({ type: 'sr25519' });

const contractPromise: Promise<DemoNFTContract> = DemoNFTContract.create(
  config.dappAccount,
  new WsProvider(config.dappUrl)
);

const ID_KEY = 'U8'; // key = U8 | U16 | U32 | U64 | U128 | Bytes
const UNIT = 1000000000000n;
export const MAX_BALANCE_FAUCET = 10n * UNIT;
export const MIN_BALANCE_FAUCET = 4n * UNIT;

const { serverRuntimeConfig } = getConfig();

function toId(id: string) {
  return { [ID_KEY]: id };
}

type GetTokensContractResponse = {
  id: {
    [key: string]: string;
  };
  owner: string;
  tokenUri: string;
  onSale: boolean;
  price: string;
}[];

export type TokenMetadata = {
  name: string;
  description: string;
  image: string;
};

export type Token = {
  id: string;
  owner: string;
  meta: TokenMetadata;
  onSale: boolean;
  price: string;
};

function readMetadata(tokenUri: string): TokenMetadata {
  const decodedRequestBodyString = Buffer.from(tokenUri.replace('data:application/json;base64,', ''), 'base64');
  const meta = JSON.parse(decodedRequestBodyString.toString());
  return meta;
}

export function formatPrice(price: string) {
  return formatBalance((price || '0').replaceAll(',', ''), { decimals: 12, withSiFull: true });
}

export const PAGE_SIZE = 24;

const demoApi = {
  async setAccount(account): Promise<void> {
    const contract = await contractPromise;

    return contract.setAccount(account);
  },
  async getAccount(): Promise<{ address: string }> {
    const contract = await contractPromise;

    return contract.getAccount();
  },
  async getBalance(address?: string): Promise<Balance> {
    const contract = await contractPromise;

    const { data } = (await contract
      .getContract()
      .api.query.system.account(contract.getAccount()?.address || address)) as any;

    return data;
  },
  /**
   * BACKEND ONLY!
   */
  async faucet(to: string): Promise<string> {
    const contract = await contractPromise;

    if (!serverRuntimeConfig.MAIN_ACCOUNT_MNEMONIC) {
      throw new Error('Main account not set. Contact the developers.');
    }

    const from = keyring.addFromMnemonic(serverRuntimeConfig.MAIN_ACCOUNT_MNEMONIC);

    const balance: any = await demoApi.getBalance(to);
    const free = BigInt(balance.free.toHuman().replaceAll(',', ''));

    if (free > MIN_BALANCE_FAUCET) {
      throw new Error('Balance high enough. Transfer not allowed.');
    }

    const amount = MAX_BALANCE_FAUCET - free;

    return new Promise((resolve, reject) => {
      contract['api'].tx.balances.transfer(to, amount).signAndSend(from, async (result) => {
        const { dispatchError, internalError, status } = result;
        if (internalError) {
          reject(internalError);

          return;
        }

        if (dispatchError) {
          const error = dispatchError.registry.findMetaError(dispatchError.asModule);
          reject(error);

          return;
        }

        // Instant seal ON.
        if (status.isInBlock) {
          resolve(amount.toString());
        }

        // Instant seal OFF.
        // if (status.isFinalized) {
        //   resolve();
        // }
      });
    });
  },
  async getTokens(pageSize = 20, pageIndex = 0, owner = undefined as string | undefined): Promise<Token[]> {
    const contract = await contractPromise;

    const { data: tokens } = await contract.query<GetTokensContractResponse>('getTokens', [pageSize, pageIndex, owner]);

    return tokens.map(({ id, owner, tokenUri, onSale, price }) => ({
      id: id[ID_KEY],
      owner,
      meta: readMetadata(tokenUri),
      onSale,
      price: price.replaceAll(',', ''),
    }));
  },
  async getToken(id: string): Promise<Token> {
    const contract = await contractPromise;

    const { data: owner } = await contract.query<string>('psp34::ownerOf', [toId(id)]);

    const { data: tokenUri } = await contract.query<string>('tokenUri', [toId(id)]);

    const meta = readMetadata(tokenUri);

    const { data: onSale } = await contract.query<boolean>('onSale', [toId(id)]);

    const { data: price } = await contract.query<string>('price', [toId(id)]);

    return {
      id,
      owner,
      meta,
      onSale,
      price: price.replaceAll(',', ''),
    };
  },
  async estimateBuyGasFees(id: string): Promise<string> {
    const contract = await contractPromise;

    const { gasRequired } = await contract.query<string>('buy', [toId(id)]);

    return gasRequired.replaceAll(',', '');
  },
  async buy(signer: Signer, id: string, gas: string): Promise<SubmittableResultValue & { blockHash?: string }> {
    const contract = await contractPromise;

    const { data } = await contract.query<string>('price', [toId(id)]);

    const price = data.replaceAll(',', '');

    return contract.transaction(signer, 'buy', [toId(id)], price, gas);
  },
  async isHuman(): Promise<boolean> {
    const contract = await contractPromise;

    const { data } = await contract.query<boolean>('isHuman', [contract.getAccount().address, 60, 20000]);

    return data;
  },
};

export default demoApi;
