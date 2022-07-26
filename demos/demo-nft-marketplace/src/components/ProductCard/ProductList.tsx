import { Token } from 'api/demoApi';
import { ReloadIcon } from 'assets';
import Button from 'components/Button';
import { ButtonType } from 'components/Button/Button';
import React, { FC } from 'react';
import ProductCard from './ProductCard';

type Props = {
  onLoadMore?: () => void;
  tokens: Token[];
};

const ProductList: FC<Props> = ({ onLoadMore, tokens }) => {
  return (
    <>
      <div className="px-6 mx-auto b-6 max-w-screen-2xl ">
        <ul
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 gap-y-6 sm:space-y-0 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4"
        >
          {tokens?.map((token) => (
            <ProductCard key={token.id} item={token} />
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
