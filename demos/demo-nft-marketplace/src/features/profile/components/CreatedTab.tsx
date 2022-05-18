import React, { useEffect, useState } from 'react';
import { ProductList } from 'components/ProductCard';
import { useGetNftItems } from 'api/raribleApi';
import { GetNftItemsResponse, NftItemsRequestType, NtfItem, SellOrderTake } from 'api/raribleRequestTypes';
import { getSellOrdersForItems } from 'utils/raribleApiUtils';

export interface ProfileProps {
  initialData?: { items: GetNftItemsResponse; orders: { take: SellOrderTake }[] };
  address: string;
}

const CreatedTab: React.FunctionComponent<ProfileProps> = ({ initialData, address }) => {
  const [continuation, setContinuation] = useState(initialData?.items.continuation);
  const { data, refetch, isIdle } = useGetNftItems({
    type: NftItemsRequestType.BY_CREATOR,
    continuation,
    size: 1,
    includeMeta: true,
    address,
  });
  const [items, setItems] = useState<NtfItem[]>(initialData?.items.items ?? []);
  const [orders, setOrders] = useState(initialData?.orders ?? []);

  useEffect(() => {
    if (isIdle && !initialData && items.length === 0) {
      refetch();
    }
  }, []);

  useEffect(() => {
    if (data?.items) {
      if (continuation === undefined || continuation !== data.continuation) {
        setItems([...items, ...data.items]);
        setContinuation(data.continuation ?? null);
        getSellOrdersForItems(data.items).then((data) => {
          setOrders([...orders, ...data]);
        });
      } else {
        setContinuation(null);
      }
    }
  }, [data]);
  return <ProductList itemsData={items ?? []} onLoadMore={continuation ? refetch : null} ordersData={orders} />;
};
export default CreatedTab;
