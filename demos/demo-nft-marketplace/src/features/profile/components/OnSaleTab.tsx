import React, { useEffect, useState } from 'react';
import { ProductList } from 'components/ProductCard';
import { useGetNftOrders } from 'api/raribleApi';
import { NtfItem, OrderFilter, OrderRequestTypes } from 'api/raribleRequestTypes';
import { getItemsForSellOrders } from 'utils/raribleApiUtils';

export interface ProfileProps {
  initialData?: { items: any; orders: any };
  address: string;
}

const OnSaleTab: React.FunctionComponent<ProfileProps> = ({ initialData, address }) => {
  const [continuation, setContinuation] = useState(initialData?.orders.continuation);
  const { data, refetch, isIdle } = useGetNftOrders({
    size: 1,
    address,
    filterBy: OrderFilter.BY_MAKER,
    type: OrderRequestTypes.SELL,
    continuation,
  });
  const [orders, setOrders] = useState<any[]>(initialData?.orders?.orders ?? []);

  const [items, setItems] = useState<NtfItem[]>(initialData?.items ?? []);
  useEffect(() => {
    if (isIdle && !initialData && orders.length === 0) {
      refetch();
    }
  }, []);

  useEffect(() => {
    if (data?.orders) {
      if (continuation === undefined || continuation !== data.continuation) {
        setOrders([...orders, ...data.orders]);
        getItemsForSellOrders(data.orders ?? []).then((newItems) => setItems([...items, ...newItems]));
        setContinuation(data.continuation ?? null);
      } else {
        setContinuation(null);
      }
    }
  }, [data]);

  return <ProductList itemsData={items ?? []} onLoadMore={continuation ? refetch : null} ordersData={orders} />;
};
export default OnSaleTab;
