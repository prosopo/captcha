import React from 'react';
import { BidItem } from 'types';
import HorizontalCard from 'components/HorizontalCard';
import { formatDate } from 'utils/dateTimeUtils';

type Props = {
  data: BidItem;
};

function BidCard({ data }: Props) {
  const { createdByImageUrl } = data;
  const createdAt = formatDate(data.createdAt);
  return (
    <HorizontalCard
      imageUrl={createdByImageUrl}
      title={
        <span className={'text-gray-700'}>
          <span className={'text-white'}>
            {data.price} {data.currency}
          </span>{' '}
          by <span className={'text-white'}>{data.createdByName}</span> for {data.quantity} edition
        </span>
      }
      subtitle={createdAt}
    />
  );
}

export default BidCard;
