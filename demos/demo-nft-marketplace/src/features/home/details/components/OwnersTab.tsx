import { NtfItem } from 'api/raribleRequestTypes';
import React from 'react';
import OwnerCard from './OwnerCard';

type Props = {
  sellOrders: any[];
  item: NtfItem;
};

function OwnersTab({ sellOrders, item }: Props) {
  return (
    <>
      {(item.owners ?? []).map((d, index) => (
        <OwnerCard key={index} item={item} owner={d} sellOrder={sellOrders.find((order) => order?.maker === d)} />
      ))}
    </>
  );
}

export default OwnersTab;
