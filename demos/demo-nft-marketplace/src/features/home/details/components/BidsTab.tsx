import React from 'react';
import BidCard from './BidCard';
import { useGetNftBids } from 'api/raribleApi';

type Props = {};

function BidsTab({}: Props) {
  const { isLoading, data } = useGetNftBids();
  if (isLoading || !data) {
    return null;
  }
  return (
    <>
      {data.map((item, index) => (
        <BidCard key={index} data={item} />
      ))}
    </>
  );
}

export default BidsTab;
