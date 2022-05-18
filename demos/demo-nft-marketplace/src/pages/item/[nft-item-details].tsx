import { Popover } from '@headlessui/react';
import { getActivityHistory, getNftItemById, getNftOrders } from 'api/raribleApi';
import { ActivityHistoryFilter, OrderFilter, OrderRequestTypes } from 'api/raribleRequestTypes';
import { DotsIcon } from 'assets';
import Button from 'components/Button';
import HorizontalCard from 'components/HorizontalCard';
import Tabs from 'components/Tabs';
import makeBlockie from 'ethereum-blockies-base64';
import AssetDisplay from 'features/home/details/components/AssetDisplay';
// import BidsTab from 'features/home/details/components/BidsTab';
import DetailsTab from 'features/home/details/components/DetailsTab';
import HistoryTab from 'features/home/details/components/HistoryTab';
import OwnersTab from 'features/home/details/components/OwnersTab';
import PurchaseDropdown from 'features/home/details/components/PurchaseDropdown';
import PutOnSaleModal from 'features/home/details/sales/PutOnSaleModal';
import { useItemDetailsData } from 'features/home/details/useItemDetailsData';
import React, { useEffect, useState } from 'react';
import { getImageOrAnimation, shortAddress } from 'utils/itemUtils';
import { getOnboard } from 'utils/walletUtils';
import { useWallet } from 'wallet/state';
import CheckoutModal from '../../features/home/details/components/CheckoutModal';
import { useToggle } from '../../hooks/useToggle';

//TODO fix types.. here and in queries :)
type Props = { item: any; sellOrder: any; initialHistory?: any; id: string };

function ItemDetailsPage({ item, sellOrder, initialHistory, id }: Props) {
  const collection = {
    imageUrl:
      'https://lh3.googleusercontent.com/1rLhxHFIebBPBtCFeXCxiwdbIE2f2idunmGyU1RvgU7qk1TGiFHCORMepdQLt6b7uRYyn5FtlnLkTkO8kdTMsnvbHbTwpHEytcbz',
    name: 'Rarible',
  };
  // const { isOwnersTab, isBidsTab, isDetailsTab, isHistoryTab, activeTab, tabs, setActiveTab } = useItemDetailsData();
  const { isOwnersTab, isDetailsTab, isHistoryTab, activeTab, tabs, setActiveTab } = useItemDetailsData();
  const [isCheckoutVisible, setCheckoutVisible] = useToggle(false);
  const [isPutOnSaleVisible, setPutOnSaleVisible] = useToggle(false);
  const [creatorAvatar, setCreatorAvatar] = useState(null);
  const [dataToDisplay, setDataToDisplay] = useState(null);

  const hadnleItemData = async () => {
    const url = getImageOrAnimation(item.meta, true, !!item.meta.animation);
    const response = await fetch(url);
    const blob = await response.blob();
    setDataToDisplay(blob);
  };
  useEffect(() => {
    hadnleItemData();
  }, [item.meta]);

  useEffect(() => {
    setCreatorAvatar(makeBlockie(item?.creators?.[0].account ?? '0x000'));
  }, []);
  const [{ address, balance, raribleSDK }, dispatch] = useWallet();
  const isOwner = item.owners[0] === address;

  const renderButton = () => {
    const options = {
      order: {
        owner: {
          title: 'Remove from Sale',
          onClick: async () => {
            await (await raribleSDK.order.cancel(sellOrder)).wait();
            location.reload();
          },
        },
        notOwner: {
          title: `Buy for ${sellOrder?.take.valueDecimal} ${sellOrder?.take.assetType.assetClass}`,
          onClick: async () => {
            const onboard = getOnboard(dispatch);
            if (address || ((await onboard.walletSelect()) && (await onboard.walletCheck()))) {
              setCheckoutVisible(true);
            }
          },
        },
      },
      noOrder: {
        owner: { title: 'Put on Sale', onClick: setPutOnSaleVisible },
        notOwner: { title: 'Not for sale', onClick: null },
      },
    };

    const { title, onClick } = options[sellOrder ? 'order' : 'noOrder'][isOwner ? 'owner' : 'notOwner'];
    return <Button fullWidth title={title} onClick={onClick} customClasses="sticky bottom-4 lg:static" />;
  };

  return (
    <div>
      <main className="max-w-2xl px-4 pb-16 mx-auto mt-8 sm:pb-24 sm:px-6 lg:max-w-full lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:auto-rows-min lg:gap-x-8">
          <div className="lg:col-start-8 lg:col-span-5">
            <div className="flex flex-row justify-between">
              <h1 className="text-2xl font-bold text-white">{item?.meta?.name}</h1>
              <Popover className="relative text-white">
                <Popover.Button>
                  <div className="rounded px-4 py-2.5 border-gray-600 bg-secondary">
                    <img className="px-0.5" src={DotsIcon} />
                  </div>
                </Popover.Button>
                <Popover.Panel className="absolute right-0 z-10 text-white">
                  <div className="absolute right-0 flex">
                    <PurchaseDropdown />
                  </div>
                </Popover.Panel>
              </Popover>
            </div>
          </div>

          {/*// LEFT SIDE CONTENT*/}
          <div className="h-full mt-8 lg:mt-0 lg:col-start-1 lg:col-span-7 lg:row-start-1 lg:row-span-3">
            <div className={'flex h-full max-h-full justify-center bg-secondary'}>
              {dataToDisplay && <AssetDisplay dataToDisplay={dataToDisplay} />}
            </div>
          </div>

          {/*RIGHT SIDE CONTENT*/}
          <div className="mt-4 font-bold text-white lg:col-span-5">
            <p className="pb-5">
              {sellOrder
                ? `On sale for ${sellOrder.take.valueDecimal} ${sellOrder.take.assetType.assetClass} `
                : 'Not for sale'}
              {/*
              TODO: check if it is ok to delete this since we'll be using erc721
              <span className={'pl-5 text-gray-700'}>
                {item.availableQuantity} of {item.totalQuantity} Available
              </span> */}
            </p>

            <p className="pb-10 font-semibold text-white">{item?.meta?.description}</p>

            <div className={'flex flex-col xl:flex-row'}>
              <div className={'flex-1 xl:pr-8'}>
                <div className={'pb-5'}>
                  Creator <span className={'text-gray-700'}>{item?.royalties?.[0]?.value / 100 || 0}% Royalties </span>
                </div>
                <HorizontalCard
                  title={shortAddress(item?.creators?.[0].account ?? '0x000', 6, 4)}
                  imageUrl={creatorAvatar}
                />
              </div>
              <div className={'flex-1 mt-4 xl:mt-0 xl:pl-8'}>
                <div className={'pb-5'}>Collection</div>
                <HorizontalCard title={collection.name} imageUrl={collection.imageUrl} />
              </div>
            </div>
            <div className={'flex flex-1 justify-start pt-5'}>
              <Tabs titles={tabs} active={activeTab} onChange={setActiveTab} />
            </div>
            <div className={'pt-5'}>
              {isOwnersTab && <OwnersTab item={item} sellOrders={[sellOrder]} />}
              {/* {isBidsTab && <BidsTab />} */}
              {isDetailsTab && <DetailsTab owner={item.owners[0]} categories={[collection]} />}
              {isHistoryTab && <HistoryTab initialHistory={initialHistory} address={id} />}
            </div>
            {renderButton()}
            {isCheckoutVisible && balance !== '-1' && (
              <CheckoutModal
                title={item?.meta?.name}
                isOpen={isCheckoutVisible}
                onClose={setCheckoutVisible}
                currency={sellOrder?.take?.assetType?.assetClass}
                orderHash={sellOrder.hash}
                price={sellOrder?.take.value}
                //TODO should we hide avail. quan. since we use erc721
                // availableQuantity={item.availableQuantity}
              />
            )}
            {isPutOnSaleVisible && (
              <PutOnSaleModal
                isOpen={isPutOnSaleVisible}
                onClose={setPutOnSaleVisible}
                tokenId={item.tokenId}
                //TODO should we hide avail. quan. since we use erc721
                // availableQuantity={item.availableQuantity}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const id = context.query['nft-item-details'];
  const tab = context.query.tab ?? 'Owners';
  const [item, orders] = await Promise.all([
    await getNftItemById(id),
    await getNftOrders({ address: id, filterBy: OrderFilter.BY_ITEM, type: OrderRequestTypes.SELL }),
  ]);
  //TODO check if it is possible to have multiple sell orders, what happens after buy order is executed
  const props: Props = { item, sellOrder: orders?.orders?.[0] ?? null, id };
  if (tab === 'History') {
    props.initialHistory = await getActivityHistory({
      address: id,
      filterBy: ActivityHistoryFilter.BY_ITEM,
      size: 5,
      sort: 'LATEST_FIRST',
    });
  }

  return {
    props, // will be passed to the page component as props
  };
}

export default ItemDetailsPage;
