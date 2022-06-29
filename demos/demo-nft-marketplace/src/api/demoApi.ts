import { WsProvider } from '@polkadot/api';
import { SubmittableResultValue } from '@polkadot/api/types';
import { Balance } from '@polkadot/types/interfaces';
import { Signer } from '@polkadot/types/types';
import { formatBalance } from '@polkadot/util';
import config from 'config';
import DemoNFTContract from './DemoNFTContract';

const contractPromise: Promise<DemoNFTContract> = DemoNFTContract.create(
  config.dappAccount,
  new WsProvider('ws://127.0.0.1:9944')
);

const idKey = 'U8'; // key = U8 | U16 | U32 | U64 | U128 | Bytes

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
  async getBalance(account): Promise<Balance> {
    const contract = await contractPromise;

    const { data } = await contract.getContract().api.query.system.account(account.address);

    return data;
  },
  async getTokens(pageSize = 20, pageIndex = 0, owner = undefined as string | undefined): Promise<Token[]> {
    const contract = await contractPromise;

    const { data: tokens } = await contract.query<GetTokensContractResponse>('getTokens', [pageSize, pageIndex, owner]);

    return tokens.map(({ id, owner, tokenUri, onSale, price }) => ({
      id: id[idKey],
      owner,
      meta: readMetadata(tokenUri),
      onSale,
      price: price.replaceAll(',', ''),
    }));
  },
  async getToken(id: string): Promise<Token> {
    const contract = await contractPromise;

    const { data: owner } = await contract.query<string>('psp34::ownerOf', [{ [idKey]: id }]);

    const { data: tokenUri } = await contract.query<string>('tokenUri', [{ [idKey]: id }]);

    const meta = readMetadata(tokenUri);

    const { data: onSale } = await contract.query<boolean>('onSale', [{ [idKey]: id }]);

    const { data: price } = await contract.query<string>('price', [{ [idKey]: id }]);

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

    const { gasRequired } = await contract.query<string>('buy', [{ [idKey]: id }]);

    return gasRequired.replaceAll(',', '');
  },
  async buy(signer: Signer, id: string, gas: string): Promise<SubmittableResultValue & { blockHash?: string }> {
    const contract = await contractPromise;

    const { data } = await contract.query<string>('price', [{ [idKey]: id }]);

    const price = data.replaceAll(',', '');

    return contract.transaction(signer, 'buy', [{ [idKey]: id }], price, gas);
  },
  async isHuman(): Promise<boolean> {
    const contract = await contractPromise;

    const { data } = await contract.query<boolean>('isHuman', [contract.getAccount().address, 60, 20000]);

    return data;
  },
};

export default demoApi;
