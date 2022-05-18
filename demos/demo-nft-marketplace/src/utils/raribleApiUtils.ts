import { Order } from '@rarible/protocol-api-client';
import { createRaribleSdk } from '@rarible/protocol-ethereum-sdk';
import { SellRequest } from '@rarible/protocol-ethereum-sdk/build/order/sell';
import { toAddress, toBigNumber } from '@rarible/types';
import { getNftItemById, getNftOrders, prepareTransaction } from 'api/raribleApi';
import { NtfItem, OrderFilter, OrderRequestTypes } from 'api/raribleRequestTypes';
import { CONTRACT_ID } from './constants';

export const getSellOrdersForItems = async (items: NtfItem[]) => {
  const orders = await Promise.all(
    items.map(({ id }) =>
      getNftOrders({ size: 1, address: id, filterBy: OrderFilter.BY_ITEM, type: OrderRequestTypes.SELL })
    )
  );

  return orders.map(({ orders }) => {
    const order = orders?.[0];
    if (!order) {
      return { take: {} };
    }

    const { take, hash } = order;
    return { take, hash };
  });
};

//TODO fix type to match sell orders response
export const getItemsForSellOrders = async (orders: any[]) => {
  return await Promise.all(
    orders.map(
      ({
        make: {
          assetType: { contract, tokenId },
        },
      }) => getNftItemById(`${contract}:${tokenId}`)
    )
  );
};

export const mapActivityHistory = (items) => {
  return !items
    ? []
    : items.map((item) => {
        if (item['@type'] === 'mint') {
          return { type: 'mint', date: item.date, itemId: `${item.contract}:${item.tokenId}` };
        }
        if (item['@type'] === 'list') {
          const { contract, tokenId } = item.make.assetType;

          return {
            type: 'list',
            date: item.date,
            itemId: `${contract}:${tokenId}`,
            price: item.take.valueDecimal,
            currency: item.take.assetType.assetClass,
          };
        }
        if (item['@type'] === 'match') {
          const { contract, tokenId } = item.left.asset.assetType;
          return {
            type: 'match',
            date: item.date,
            itemId: `${contract}:${tokenId}`,
            price: item.price,
            seller: item.left.maker,
            buyer: item.right.maker,
            currency: item.right.asset.assetType.assetClass,
          };
        }
      });
};

export async function matchOrder(maker: string, hash: string, amount: number): Promise<any> {
  const preparedTx = await prepareTransaction(hash, {
    maker,
    amount,
    payouts: [],
    originFees: [],
  });

  const {
    transaction: { data, to },
    asset: { value },
  } = preparedTx;
  const tx = {
    from: maker,
    data,
    to,
    value,
  };
  return tx;
}

export async function createSellOrder(
  raribleSDK: ReturnType<typeof createRaribleSdk>,
  tokenId: string,
  address: string,
  price: string,
  currency: 'ETH' | 'ERC20'
): Promise<Order> {
  const takeAssetType =
    currency === 'ERC20' ? { assetClass: currency, contract: toAddress(CONTRACT_ID) } : { assetClass: currency };

  const request: SellRequest = {
    makeAssetType: {
      assetClass: 'ERC721',
      contract: toAddress(CONTRACT_ID),
      tokenId: toBigNumber(tokenId),
    },
    amount: 1,
    maker: toAddress(address),
    originFees: [],
    payouts: [],
    price,
    takeAssetType: takeAssetType,
  };
  return await raribleSDK.order.sell(request);
}
