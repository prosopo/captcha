import { useProfile } from 'api/ceramic';
import { NtfItem, SellOrderTake } from 'api/raribleRequestTypes';
import Avatar from 'components/Avatar/Avatar';
import Link from 'components/Link';
import CheckoutModal from 'features/home/details/components/CheckoutModal';
import { useToggle } from 'hooks/useToggle';
import React, { FC, useCallback } from 'react';
import { getImageOrAnimation, shortAddress } from 'utils/itemUtils';
import { getOnboard } from 'utils/walletUtils';
import { useWallet } from 'wallet/state';

type Props = {
  item: NtfItem;
  sellOrder: { take?: SellOrderTake; hash: string };
};

const ProductCard: FC<Props> = ({ item, sellOrder }) => {
  const address = shortAddress(item?.creators?.[0]?.account ?? '0x000', 5, 4);

  const image = getImageOrAnimation(item.meta);
  const [isCheckoutVisible, setCheckoutVisible] = useToggle(false);
  const [state, dispatch] = useWallet();

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
        <div className="flex flex-col justify-between h-full px-4 py-3 space-y-4 border border-gray-600 rounded-md">
          <Link to={`/profile/${item?.creators?.[0].account}`}>
            <div className="flex items-center space-x-4">
              <Avatar username={item?.creators?.[0].account} />
              <div className="space-y-1 font-medium leading-6 text-small">
                <h3 className="text-gray-700 cursor-pointer hover:text-white">{`${
                  creatorProfile?.basicProfileInfo?.name || address
                }`}</h3>
              </div>
            </div>
          </Link>

          <div className="flex justify-center overflow-auto aspect-w-3 aspect-h-2">
            <img className="object-cover rounded-lg shadow-lg" src={image} alt="" />
          </div>

          <div>
            <div className="overflow-hidden font-bold leading-6">
              <div className="text-lg truncate">{item?.meta?.name}</div>
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
                />
              )}
            </div>
          </div>
        </div>
      </li>
    </Link>
  );
};
export default ProductCard;
