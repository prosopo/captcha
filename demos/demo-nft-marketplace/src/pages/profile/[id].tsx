import { CoverPhoto } from 'assets';
import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import Tabs from 'components/Tabs/Tabs';
import Avatar from 'components/Avatar/Avatar';
import { getNftItems } from 'api/raribleApi';
import { GetNftItemsResponse, NftItemsRequestType, SellOrderTake } from 'api/raribleRequestTypes';
import CreatedTab from 'features/profile/components/CreatedTab';
import OwnedTab from 'features/profile/components/OwnedTab';
import { getSellOrdersForItems } from 'utils/raribleApiUtils';

const tabs = ['Owned', 'Created'];

const tabItemsTypeMapping = {
  [tabs[0]]: NftItemsRequestType.BY_OWNER,
  [tabs[1]]: NftItemsRequestType.BY_CREATOR,
};

export interface ProfileProps {
  createdData?: { items: GetNftItemsResponse; orders: { take: SellOrderTake }[] };
  ownedData?: { items: GetNftItemsResponse; orders: { take: SellOrderTake }[] };
  // activityHistory is always fetched on front
  tab: number;
}

const Profile: React.FunctionComponent<ProfileProps> = ({ ownedData, createdData, tab }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (router && router.query) {
      setActiveTab(
        Math.max(
          tabs.findIndex((tab) => tab === router.query.tab),
          0
        )
      );
      setUserId(router.query.id as string);
    }
  }, [router]);

  const onTabChange = useCallback(
    (index) => {
      router.push(
        {
          pathname: window.location.pathname,
          query: {
            id: router.query.id,
            tab: tabs[index],
          },
        },
        `/profile/${userId}?tab=${tabs[index]}`,
        { scroll: false, shallow: true }
      );
      setActiveTab(index);
    },
    [userId]
  );

  return (
    <>
      <div className="flex flex-col items-center m-auto text-lg text-white max-w-screen-2xl">
        <img className="overflow-hidden " src={CoverPhoto} />
        <div className="relative flex flex-col items-center w-11/12 bg-secondary lg:w-2/3 sm:w-10/12 md:-top-16 -top-4">
          <div className="transform -translate-y-1/2">
            <Avatar
              sizeClasses="w-20 h-20 lg:w-48 lg:h-48"
              verificationSymbolSizes={'w-6 h-6 lg:w-14 lg:h-14'}
              username={userId}
            />
          </div>
          <h1 className="relative text-sm font-bold sm:text-lg md:text-xl xl:text-2xl -top-4 ">{userId}</h1>
        </div>
      </div>
      <Tabs titles={tabs} active={activeTab} onChange={onTabChange} />
      <div className="py-4 bg-secondary">
        {activeTab === 0 && <OwnedTab initialData={ownedData} address={userId} />}
        {activeTab === 1 && <CreatedTab initialData={createdData} address={userId} />}
      </div>
    </>
  );
};

export async function getServerSideProps(context): Promise<{ props: ProfileProps }> {
  const address = context.query.id;
  const tabName = context.query.tab ?? tabs[0];
  const props: ProfileProps = { tab: tabs.indexOf(tabName) };
  const commonQueryData = { size: 1, showDeleted: false, includeMeta: true, address };
  switch (tabName) {
    case tabs[0]: {
      const items = await getNftItems({
        ...commonQueryData,
        type: tabItemsTypeMapping[tabName] as NftItemsRequestType,
      });
      const orders = await getSellOrdersForItems(items.items);
      props.ownedData = { orders, items };
      break;
    }
    case tabs[2]: {
      const items = await getNftItems({
        ...commonQueryData,
        type: tabItemsTypeMapping[tabName] as NftItemsRequestType,
      });
      const orders = await getSellOrdersForItems(items.items);
      props.createdData = { orders, items };
      break;
    }
  }
  return {
    props, // will be passed to the page component as props
  };
}

export default Profile;
