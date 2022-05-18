import { NtfItem } from 'api/raribleRequestTypes';
import Button from 'components/Button';
import HorizontalCard from 'components/HorizontalCard';
import makeBlockie from 'ethereum-blockies-base64';
import { useToggle } from 'hooks/useToggle';
import React from 'react';
import { shortAddress } from 'utils/itemUtils';
import { useWallet } from 'wallet/state';
import CheckoutModal from './CheckoutModal';

type Props = {
  owner: string;
  sellOrder?: any;
  item: NtfItem;
};

function OwnerCard({ owner, sellOrder, item }: Props) {
  const [{ address, balance }] = useWallet();
  const [isCheckoutVisible, setCheckoutVisible] = useToggle(false);
  const isOwner = owner === address;

  return (
    <>
      <HorizontalCard
        imageUrl={makeBlockie(owner ?? '0x000')}
        title={shortAddress(owner, 6, 8)}
        subtitle={
          sellOrder ? (
            <span>
              On sale for{' '}
              <span className={'font-bold text-white'}>
                {sellOrder.take.valueDecimal} {sellOrder.take.assetType.assetClass}
              </span>
            </span>
          ) : (
            'Not for sale'
          )
        }
        actions={
          <div className="z-10">
            {!isOwner && (
              <Button fullWidth title={'Buy'} onClick={setCheckoutVisible} customClasses="sticky bottom-4 lg:static" />
            )}
          </div>
        }
      />
      {isCheckoutVisible && balance !== '-1' && (
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
    </>
  );
}

export default OwnerCard;
