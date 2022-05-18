import { getNftItems, useGetNftItems } from 'api/raribleApi';
import { GetNftItemsResponse, NftItemsRequestType, NtfItem } from 'api/raribleRequestTypes';
import { ProductList } from 'components/ProductCard';
import React, { useCallback, useEffect, useState } from 'react';
import { CONTRACT_ID } from 'utils/constants';
import { getSellOrdersForItems } from 'utils/raribleApiUtils';

const searchParams = {
  size: 25,
  showDeleted: false,
  includeMeta: true,
  type: CONTRACT_ID ? NftItemsRequestType.BY_COLLECTION : undefined,
  address: CONTRACT_ID,
};
enum OrderBy {
  RecentlyAdded = 'Recently added',
  PriceLowToHigh = 'Price: Low to High',
  PriceHighToLow = 'Price: High to Low',
  AuctionEndingSoon = 'Auction ending soon',
}
export interface HomeProps {
  itemsData: GetNftItemsResponse;
  //TODO fix type
  ordersData: any;
}

const Home: React.FunctionComponent<HomeProps> = ({ itemsData, ordersData }) => {
  const renderDropDownContent = useCallback(
    () =>
      Object.keys(OrderBy).map((key) => (
        <div className="px-2 py-2 text-white hover:bg-gray-600 bg-secondary" key={key}>
          {OrderBy[key]}
        </div>
      )),
    []
  );
  const [continuation, setContinuation] = useState(itemsData.continuation);
  const { data, refetch } = useGetNftItems({ continuation, ...searchParams });
  const [items, setItems] = useState<NtfItem[]>(itemsData.items);

  useEffect(() => {
    if (data?.items) {
      if (continuation === undefined || continuation !== data.continuation) {
        setItems([...items, ...data.items]);
        setContinuation(data.continuation ?? null);
      } else {
        setContinuation(null);
      }
    }
  }, [data]);
  const loadMore = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="py-8">
      {/* <div className="flex items-center justify-between px-6 py-2 mx-auto max-w-screen-2xl">
        <h1 className="py-0.5 text-2xl font-bold text-white">Explore</h1>
        <Dropdown
          displayText="Recently added"
          dropDownContent={<div className="divide-y divide-gray-600">{renderDropDownContent()}</div>}
        />
      </div> */}
      <ProductList itemsData={items || []} onLoadMore={continuation ? loadMore : null} ordersData={ordersData} />
    </div>
  );
};
export async function getServerSideProps(context) {
  const itemsData = await getNftItems({
    ...searchParams,
  });
  const ordersData = await getSellOrdersForItems(itemsData.items);
  return {
    props: { itemsData, ordersData }, // will be passed to the page component as props
  };
}

export default Home;
