import { AccountID, ChainID as CaipChainID } from 'caip';

export type Blockchain =
  | 'Tezos'
  | 'Bitcoin'
  | 'Ethereum'
  | 'Litecoin'
  | 'Dogecoin'
  | 'Ethereum Classic'
  | 'Bitcoin Cash'
  | 'Binance Coin'
  | 'Dash'
  | 'Cosmos'
  | 'Stellar'
  | 'RSK'
  | 'EOSIO';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UnsupportedBlockcahin = 'Ripple' | 'NEM' | 'TRON';

export type ChainID =
  | 'tezos:NetXdQprcVkpaWU'
  | 'bip122:000000000019d6689c085ae165831e93'
  | 'eip155:1'
  | 'bip122:12a765e31ffd4059bada1e25190f6e98'
  | 'bip122:1a91e3dace36e2be3bf030a65679fe82'
  | 'eip155:61'
  | 'eip155:56'
  | 'cosmos:cosmoshub-3'
  | 'bip122:00000ffd590b1485b3caadc19b22e637'
  | 'stellar:pubnet'
  | 'eip155:30'
  | 'eosio:aca376f206b8fc25a6ed44dbdc66547c';

type NameMap = {
  [blockchain in Blockchain]: ChainID;
};

export const nameMap: NameMap = {
  Tezos: 'tezos:NetXdQprcVkpaWU',
  Bitcoin: 'bip122:000000000019d6689c085ae165831e93',
  Ethereum: 'eip155:1',
  Litecoin: 'bip122:12a765e31ffd4059bada1e25190f6e98',
  Dogecoin: 'bip122:1a91e3dace36e2be3bf030a65679fe82',
  'Ethereum Classic': 'eip155:61',
  'Bitcoin Cash': 'bip122:000000000019d6689c085ae165831e93',
  'Binance Coin': 'eip155:56',
  Dash: 'bip122:00000ffd590b1485b3caadc19b22e637',
  // FIXME
  // Cosmos dumps the current blockchain state and creates a new
  // genesis from the old state every once in a while.
  // All cosmoshub-n chains should be considered equivalent.
  Cosmos: 'cosmos:cosmoshub-3',
  Stellar: 'stellar:pubnet',
  RSK: 'eip155:30',
  EOSIO: 'eosio:aca376f206b8fc25a6ed44dbdc66547c',
};

type IdMap = {
  [chainId in ChainID]: Blockchain;
};

export const idMap = {
  ...Object.entries(nameMap).reduce((acc, [blockchain, chainId]) => ({ ...acc, [chainId]: blockchain }), {}),
} as IdMap;

export function getAccountId(name: Blockchain, address: string) {
  let accountId: string;
  switch (name) {
    case 'Binance Coin':
      accountId = addrToCaip.bnb(address);
      break;
    case 'Bitcoin':
      accountId = addrToCaip.btc(address);
      break;
    case 'Bitcoin Cash':
      accountId = addrToCaip.bch(address);
      break;
    case 'Cosmos':
      accountId = addrToCaip.atom(address);
      break;
    case 'Dash':
      accountId = addrToCaip.dash(address);
      break;
    case 'Dogecoin':
      accountId = addrToCaip.doge(address);
      break;
    case 'EOSIO':
      accountId = addrToCaip.eos(address);
      break;
    case 'Ethereum':
      accountId = addrToCaip.eth(address);
      break;
    case 'Ethereum Classic':
      accountId = addrToCaip.etc(address);
      break;
    case 'Litecoin':
      accountId = addrToCaip.ltc(address);
      break;
    case 'RSK':
      accountId = addrToCaip.rsk(address);
      break;
    case 'Stellar':
      accountId = addrToCaip.xlm(address);
      break;
    case 'Tezos':
      accountId = addrToCaip.tez(address);
      break;
  }
  return accountId;
}

export const addrToCaip: {
  [shortname: string]: (address: string) => string;
} = {
  eth: (address: string) => {
    return AccountID.format({
      address,
      chainId: { namespace: 'eip155', reference: '1' },
    });
  },
  etc: (address: string) => {
    return AccountID.format({
      address,
      chainId: { namespace: 'eip155', reference: '61' },
    });
  },
  bnb: (address: string) => {
    return AccountID.format({
      address,
      chainId: { namespace: 'eip155', reference: '56' },
    });
  },
  rsk: (address: string) => {
    return AccountID.format({
      address,
      chainId: { namespace: 'eip155', reference: '30' },
    });
  },
  atom: (address: string) => {
    return AccountID.format({
      address,
      chainId: { namespace: 'cosmos', reference: 'cosmoshub-3' },
    });
  },
  xlm: (address: string) => {
    return AccountID.format({
      address,
      chainId: { namespace: 'stellar', reference: 'pubnet' },
    });
  },
  eos: (address: string) => {
    return AccountID.format({
      address,
      chainId: {
        namespace: 'eosio',
        reference: 'aca376f206b8fc25a6ed44dbdc66547c',
      },
    });
  },
  xtz: (address: string) =>
    AccountID.format({
      address,
      chainId: { namespace: 'tezos', reference: 'NetXdQprcVkpaWU' },
    }),
  btc: (address: string) =>
    AccountID.format({
      address,
      chainId: {
        namespace: 'bip122',
        reference: '000000000019d6689c085ae165831e93',
      },
    }),
  ltc: (address: string) =>
    AccountID.format({
      address,
      chainId: {
        namespace: 'bip122',
        reference: '12a765e31ffd4059bada1e25190f6e98',
      },
    }),
  doge: (address: string) =>
    AccountID.format({
      address,
      chainId: {
        namespace: 'bip122',
        reference: '1a91e3dace36e2be3bf030a65679fe82',
      },
    }),
  bch: (address: string) =>
    AccountID.format({
      address,
      chainId: {
        namespace: 'bip122',
        reference: '000000000019d6689c085ae165831e93',
      },
    }),
  dash: (address: string) =>
    AccountID.format({
      address,
      chainId: {
        namespace: 'bip122',
        reference: '00000ffd590b1485b3caadc19b22e637',
      },
    }),
};

export interface UICryptoAddress {
  id: string;
  address: string;
  name: Blockchain;
  verified?: boolean;
}

export function caipToUIAddrFormat(caip: string): UICryptoAddress | null {
  const accountId: AccountID = new AccountID(caip);
  const name = idMap[accountId.chainId.toString() as ChainID];
  if (!name) {
    return null;
  }
  return {
    id: accountId.toString(),
    address: accountId.address,
    name,
  };
}
