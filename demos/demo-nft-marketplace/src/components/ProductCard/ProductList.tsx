import { NtfItem, SellOrderTake } from 'api/raribleRequestTypes';
import { ReloadIcon } from 'assets';
import Button from 'components/Button';
import { ButtonType } from 'components/Button/Button';
import React, { FC } from 'react';
import ProductCard from './ProductCard';

type Props = {
  itemsData: NtfItem[];
  ordersData: { take?: SellOrderTake; hash: string }[];
  onLoadMore?: () => void;
};

const ProductList: FC<Props> = ({ itemsData, onLoadMore, ordersData }) => {
  return (
    <>
      <div className="px-6 mx-auto b-6 max-w-screen-2xl ">
        <ul
          role="list"
          className="grid sm:grid-cols-2 sm:gap-x-6 gap-y-6 sm:space-y-0 lg:grid-cols-4 lg:gap-x-6 xl:grid-cols-5 "
        >
          {itemsData?.map((item, idx) => (
            <ProductCard key={item.id} item={item} sellOrder={ordersData?.[idx] ?? null} />
          ))}
        </ul>
      </div>
      <div className="flex justify-center w-full mx-auto my-12">
        {onLoadMore && (
          <Button
            type={ButtonType.Main}
            title="Load more items"
            customClasses="px-7 py-3"
            icon={ReloadIcon}
            onClick={onLoadMore}
          />
        )}
      </div>
    </>
  );
};
export default ProductList;
