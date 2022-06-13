import { WsProvider } from '@polkadot/api';
import { Balance } from '@polkadot/types/interfaces';
import { Signer } from '@polkadot/types/types';
import DemoNFTContract from './DemoNFTContract';

const contractPromise: Promise<DemoNFTContract> = DemoNFTContract.create(
  '5DubMGNN1JpYgsfKjhgzHaKPEHnDEMaiGKSS7bjcstcnktVd',
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
};

function readMetadata(tokenUri: string): TokenMetadata {
  const decodedRequestBodyString = Buffer.from(tokenUri.replace('data:application/json;base64,', ''), 'base64');
  const meta = JSON.parse(decodedRequestBodyString.toString());
  return meta;
}

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
  // getTokens (pageSize: u128, pageIndex: u128, owner: Option<AccountId>):
  async getTokens(pageSize = 20, pageIndex = 0, owner = undefined as string | undefined): Promise<Token[]> {
    const contract = await contractPromise;

    const tokens = (await contract.query<GetTokensContractResponse>('getTokens', [
      pageSize,
      pageIndex,
      owner,
    ])) as unknown as GetTokensContractResponse;

    return tokens.map(({ id, owner, tokenUri, onSale }) => ({
      id: id[idKey],
      owner,
      meta: readMetadata(tokenUri),
      onSale,
    }));
  },
  async getToken(id: string): Promise<Token> {
    const contract = await contractPromise;

    const owner = (await contract.query<string>('psp34::ownerOf', [{ [idKey]: id }])) as unknown as string;

    const tokenUri = (await contract.query<string>('tokenUri', [{ [idKey]: id }])) as unknown as string;

    const meta = readMetadata(tokenUri);

    const onSale = (await contract.query<boolean>('onSale', [{ [idKey]: id }])) as unknown as boolean;

    return {
      id,
      owner,
      meta,
      onSale,
    };
  },
  async buy(signer: Signer, id: string): Promise<void> {
    const contract = await contractPromise;

    contract.transaction(signer, 'buy', [{ [idKey]: id }]) as unknown as string;

    return;
  },
};

export default demoApi;
