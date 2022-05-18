import { useProfile } from 'api/ceramic';
import { NtfItem, SellOrderTake } from 'api/raribleRequestTypes';
import { FavouriteIcon } from 'assets';
import Avatar from 'components/Avatar/Avatar';
import Link from 'components/Link';
import CheckoutModal from 'features/home/details/components/CheckoutModal';
import { useToggle } from 'hooks/useToggle';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { getImageOrAnimation, shortAddress } from 'utils/itemUtils';
import { getOnboard } from 'utils/walletUtils';
import { useWallet } from 'wallet/state';
import Button, { ButtonType } from '../Button';

type Props = {
  item: NtfItem;
  sellOrder: { take?: SellOrderTake; hash: string };
};

const ProductCard: FC<Props> = ({ item, sellOrder }) => {
  const address = shortAddress(item?.creators?.[0]?.account ?? '0x000', 5, 4);

  const image = getImageOrAnimation(item.meta);
  const [renderFavButton, setRenderFavButton] = useState(false);
  const [isCheckoutVisible, setCheckoutVisible] = useToggle(false);
  const [state, dispatch] = useWallet();
  useEffect(() => {
    setRenderFavButton(true);
  }, []);

  const onBuyNow = useCallback(
    async (e) => {
      e.stopPropagation();
      const onboard = getOnboard(dispatch);
      if (state.address || ((await onboard.walletSelect()) && (await onboard.walletCheck()))) {
        setCheckoutVisible(true);
      }
    },
    [state]
  );

  const creatorProfile = useProfile(item?.creators?.[0].account || null);

  return (
    <Link to={`/item/${item.id}`}>
      <li className="text-white bold h-96 hover:bg-gray-900">
        <div className="flex flex-col justify-between h-full px-4 py-3 border border-gray-600 space-y-4 rounded-md">
          <div className="flex items-center space-x-4">
            <Link to={`/profile/${item?.creators?.[0].account}`}>
              <Avatar
                username={item?.creators?.[0].account}
                imgSrc={
                  creatorProfile?.basicProfileInfo?.image?.original?.src
                    ? `https://dweb.link/ipfs/${creatorProfile?.basicProfileInfo?.image?.original?.src
                        ?.split('/')
                        ?.pop()}`
                    : null
                }
                // verified={item.userVerified}
              />
            </Link>
            <div className="font-medium space-y-1 leading-6 text-small">
              <Link to={`/profile/${item?.creators?.[0].account}`}>
                <h3 className="text-gray-700 cursor-pointer hover:text-white">{`${
                  creatorProfile?.basicProfileInfo?.name || address
                }`}</h3>
              </Link>
            </div>
          </div>

          <div className="flex justify-center overflow-auto aspect-w-3 aspect-h-2">
            <img className="object-cover rounded-lg shadow-lg" src={image} alt="" />
          </div>

          <div>
            <div className="font-bold leading-6">
              <h3 className={'text-lg'}>{item?.meta?.name}</h3>
              {sellOrder?.hash && (
                <span className={'text-sm'}>
                  {sellOrder?.take?.valueDecimal} {sellOrder?.take?.assetType?.assetClass}
                </span>
              )}
              <span className="px-1 text-gray-600 normal">{sellOrder?.hash ? '1' : '0'}/1</span>
            </div>
            <div className="flex items-end justify-between font-bold leading-6">
              <div className={`${!sellOrder?.take?.valueDecimal ? 'invisible' : ''}`}>
                <div className="cursor-pointer">
                  <Link title="Buy Now" onClick={onBuyNow} />
                </div>
              </div>
              {isCheckoutVisible && state.balance !== '-1' && (
                <CheckoutModal
                  title={item?.meta?.name}
                  isOpen={isCheckoutVisible}
                  onClose={setCheckoutVisible}
                  currency={sellOrder?.take?.assetType?.assetClass}
                  orderHash={sellOrder?.hash}
                  price={sellOrder?.take.value}
                  //TODO should we hide avail. quan. since we use erc721
                  // availableQuantity={item.availableQuantity}
                />
              )}
              {/* {renderFavButton && (
                <Button
                  customClasses="text-gray-600 py-0"
                  icon={FavouriteIcon}
                  equalPadding
                  type={ButtonType.Main}
                  // title={item.likes.toString()}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('liked');
                  }}
                />
              )} */}
            </div>
          </div>
        </div>
      </li>
    </Link>
  );
};
export default ProductCard;
