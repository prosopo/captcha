import { formatPrice, Token } from 'api/demoApi';
import Avatar from 'components/Avatar/Avatar';
import Link from 'components/Link';
import { CheckoutModal } from 'components/Modal';
import { useToggle } from 'hooks/useToggle';
import React, { FC, useCallback } from 'react';
import { shortAddress } from 'utils/itemUtils';

type Props = {
  item: Token;
};

const ProductCard: FC<Props> = ({ item }) => {
  const address = shortAddress(item.owner, 5, 4);

  const image = item.meta.image;
  const [isCheckoutVisible, setCheckoutVisible] = useToggle(false);

  const onBuyNow = useCallback(
    async (e) => {
      e.stopPropagation();
      if (address) {
        setCheckoutVisible(true);
      }
    },
    [address]
  );

  const price = formatPrice(item.price);

  return (
    <Link to={`/item/${item.id}`}>
      <li className="text-white bold h-96 hover:bg-gray-900">
        <div className="flex flex-col justify-between h-full px-4 py-3 space-y-4 border border-gray-600 rounded-md">
          <Link to={`/profile/${item.owner}`}>
            <div className="flex items-center space-x-4">
              <Avatar username={item.owner} />
              <div className="space-y-1 font-medium leading-6 text-small">
                <h3 className="text-gray-700 cursor-pointer hover:text-white">{`${address}`}</h3>
              </div>
            </div>
          </Link>

          <div className="relative flex justify-center w-full h-full overflow-hidden rounded-lg aspect-w-3 aspect-h-2">
            {/* <img
              className="absolute self-center object-cover w-full h-full justify-self-center blur"
              src={image}
              alt=""
            /> */}
            <img className="absolute self-center object-contain w-full h-full justify-self-center" src={image} alt="" />
          </div>

          <div>
            <div className="overflow-hidden font-bold leading-6">
              <div className="text-lg truncate">{item?.meta?.name}</div>
            </div>
            <div className="flex items-end justify-between font-bold leading-6">
              {item.onSale ? (
                <>
                  <span className="text-sm">{price}</span>
                  <div className="cursor-pointer">
                    <Link title="Buy Now" onClick={onBuyNow} />
                  </div>
                </>
              ) : (
                <>
                  <span />
                  <span className="text-base text-yellow-500">SOLD</span>
                </>
              )}
              {isCheckoutVisible && (
                <CheckoutModal
                  id={item.id}
                  title={item.meta.name}
                  isOpen={isCheckoutVisible}
                  onClose={setCheckoutVisible}
                  price={item.price}
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
