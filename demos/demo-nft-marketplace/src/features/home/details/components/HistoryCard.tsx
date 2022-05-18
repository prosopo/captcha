import HorizontalCard from 'components/HorizontalCard';
import makeBlockie from 'ethereum-blockies-base64';
import React from 'react';
import { formatDate } from 'utils/dateTimeUtils';
import { shortAddress } from 'utils/itemUtils';

function generateBody(actionName, content = '') {
  return (
    <span className={'text-gray-700'}>
      {actionName} <span className={'text-white font-bold'}>{content ?? ''}</span>
    </span>
  );
}

function getCardBody(data) {
  switch (data['@type']) {
    case 'list':
      return generateBody('Listed for', `${data.price} ${data.take.assetType.assetClass}`);
    case 'mint':
      return generateBody('Minted');
    case 'match':
      return generateBody('Purchased for', `${data.price} ${data?.right?.asset.assetType?.assetClass}`);
    case 'cancel_list':
      return generateBody('Removed from sale');
  }
}

type Props = {
  //TODO types fix
  data: any;
};

// todo handle all cases
// todo handle 5 minutes ago for recent transactions..
function HistoryCard({ data }: Props) {
  const address = data['@type'] === 'match' ? data.right.maker : data['@type'] === 'mint' ? data.owner : data.maker;
  return (
    <HorizontalCard
      imageUrl={makeBlockie(address ?? '0x000')}
      title={getCardBody(data)}
      subtitle={`By ${shortAddress(address, 6, 5)} ${formatDate(new Date(Date.parse(data.date)))}`}
    />
  );
}

export default HistoryCard;
