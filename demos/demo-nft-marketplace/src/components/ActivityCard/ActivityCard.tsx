import { getNftItemById } from 'api/raribleApi';
import HorizontalCard from 'components/HorizontalCard';
import makeBlockie from 'ethereum-blockies-base64';
import React, { FC, useEffect, useState } from 'react';
import { formatDate } from 'utils/dateTimeUtils';

export const getActivityString = (actionType, seller, userId) => {
  if (actionType === 'mint') {
    return 'Minted';
  }
  if (actionType === 'list') {
    return 'Listed';
  }
  if (seller === userId) {
    return 'Sold';
  }
  return 'Purchased';
};

type Props = {
  item: any;
  address: string;
};

const ActivityCard: FC<Props> = ({ item, address }) => {
  const activity = getActivityString(item.type, item.seller, address);
  const [title, setTitle] = useState('');
  useEffect(() => {
    getNftItemById(item.itemId).then((nft) => setTitle(nft?.meta?.name));
  }, []);
  return (
    <HorizontalCard
      mainBackground
      imageUrl={makeBlockie(address ?? '0x000')}
      title={<span className={'text-white text-xl'}>{title ?? ''}</span>}
      subtitle={
        <div>
          {activity} by <span className="text-lg text-white">{address}</span>
          <div>{formatDate(new Date(Date.parse(item.date)))}</div>
        </div>
      }
    />
  );
};
export default ActivityCard;
