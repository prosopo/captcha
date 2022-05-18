import { CopyIcon, CoverPhoto, DiscordIcon, InstagramIcon, TelegramIcon, TwitterIcon } from 'assets';
import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import Button, { ButtonType } from 'components/Button';
import Link from 'components/Link';
import Tabs from 'components/Tabs/Tabs';
import Avatar from 'components/Avatar/Avatar';
import { getNftItemById, getNftItems, getNftOrders, useGetNftItems } from 'api/raribleApi';
import {
  GetNftItemsResponse,
  NftItemsRequestType,
  NtfItem,
  OrderFilter,
  OrderRequestTypes,
  SellOrderTake,
} from 'api/raribleRequestTypes';
import { shortAddress } from 'utils/itemUtils';
import CreatedTab from 'features/profile/components/CreatedTab';
import OwnedTab from 'features/profile/components/OwnedTab';
import ActivityHistoryTab from 'features/profile/components/ActivityHistoryTab';
import { getItemsForSellOrders, getSellOrdersForItems } from 'utils/raribleApiUtils';
import OnSaleTab from 'features/profile/components/OnSaleTab';
import { useProfile, useSocials } from 'api/ceramic';
import { useWallet } from 'wallet/state';

//MOCKED DATA
const dummyData = {
  twitterUsername: 'twuser',
  about:
    'When an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset too good.',
  links: { twitter: 'asds', instagram: 'hgk' },
  site: 'www.google.com',
};

const tabs = ['On sale', 'Owned', 'Created', 'Activity'];

const tabItemsTypeMapping = {
  [tabs[0]]: OrderRequestTypes.SELL,
  [tabs[1]]: NftItemsRequestType.BY_OWNER,
  [tabs[2]]: NftItemsRequestType.BY_CREATOR,
};

export interface ProfileProps {
  //TODO fix type
  onSaleData?: { items: any; orders: any };
  createdData?: { items: GetNftItemsResponse; orders: { take: SellOrderTake }[] };
  ownedData?: { items: GetNftItemsResponse; orders: { take: SellOrderTake }[] };
  // activityHistory is always fetched on front
  tab: number;
}

const Profile: React.FunctionComponent<ProfileProps> = ({ onSaleData, ownedData, createdData, tab }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tab);
  const [userId, setUserId] = useState<string | null>(null);
  const user = dummyData;
  const userProfile = useProfile(userId);
  const userSocials = useSocials(userId);
  const shortAddr = shortAddress(userId, 10, 4);
  const [state] = useWallet();
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

  console.log('userProfile', userProfile);
  console.log('userSocials', userSocials);
  console.log('state.address', state.address);
  console.log('userId', userId);

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
              imgSrc={
                userProfile?.basicProfileInfo?.image?.original?.src
                  ? `https://dweb.link/ipfs/${userProfile?.basicProfileInfo?.image?.original?.src?.split('/')?.pop()}`
                  : null
              }
            />
          </div>
          <h1 className="relative text-lg font-bold lg:text-2xl md:text-4xl -top-4 ">
            {userProfile?.basicProfileInfo?.name || userId}
          </h1>
          <div className="flex flex-col items-center text-lg font-medium gap-y-4 gap-x-10 sm:flex-row md:gap-x-20 md:py-4">
            {/* <Link title={`@${user.twitterUsername}`} to="#" /> */}
            <div className="flex items-center px-3 py-2 gap-x-4 bg-main">
              <div>{shortAddr}</div>
              <Button
                type={ButtonType.Secondary}
                onClick={() => {
                  navigator.clipboard.writeText(userId).then(
                    () => console.log('copied'),
                    () => console.log('failed')
                  );
                }}
                icon={CopyIcon}
                equalPadding
              />
            </div>
          </div>
          {!userProfile.basicProfileInfo && userId?.toLowerCase() === state.address?.toLowerCase() ? (
            <>
              <p className="text-center pt-3 pb-5">
                Edit your profile information at <b>DNS.xyz</b>
              </p>
              <div className="flex items-center space-x-4 lg:space-12 py-11">
                <Button
                  customClasses="px-9"
                  title="Edit your DNS profile"
                  type={ButtonType.Primary}
                  onClick={() => window.open('https://dns.xyz/login')}
                />
              </div>
            </>
          ) : (
            <>
              <p className="px-5 py-10 text-base font-semibold text-center md:w-9/12 sm:px-4">
                {userProfile.basicProfileInfo?.description || ''}
              </p>
              <div className="flex items-center justify-center w-full px-4 pb-9 sm:justify-between md:w-9/12 md:px-0">
                <div className="hidden sm:flex gap-x-1 lg:gap-x-2 xl:gap-x:4 ">
                  <Button type={ButtonType.Main} equalPadding icon={TwitterIcon} />
                  <Button type={ButtonType.Main} equalPadding icon={InstagramIcon} />
                  <Button type={ButtonType.Main} equalPadding icon={TelegramIcon} />
                  <Button type={ButtonType.Main} equalPadding icon={DiscordIcon} />
                </div>
                <Link to={userProfile.basicProfileInfo?.url || '#'} title={userProfile.basicProfileInfo?.url} />
              </div>
            </>
          )}
        </div>
      </div>
      <Tabs titles={tabs} active={activeTab} onChange={onTabChange} />
      <div className="py-4 bg-secondary">
        {activeTab === 0 && <OnSaleTab initialData={onSaleData} address={userId} />}
        {activeTab === 1 && <OwnedTab initialData={ownedData} address={userId} />}
        {activeTab === 2 && <CreatedTab initialData={createdData} address={userId} />}
        {activeTab === 3 && <ActivityHistoryTab address={userId} />}
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
      const orderData = await getNftOrders({
        size: 1,
        address,
        filterBy: OrderFilter.BY_MAKER,
        type: OrderRequestTypes.SELL,
      });

      const items = await getItemsForSellOrders(orderData.orders ?? []);
      props.onSaleData = { orders: orderData, items };
      break;
    }
    case tabs[1]: {
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
