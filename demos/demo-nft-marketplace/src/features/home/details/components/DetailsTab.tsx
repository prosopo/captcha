import React, { useEffect, useState } from 'react';
import HorizontalCard from 'components/HorizontalCard';
import makeBlockie from 'ethereum-blockies-base64';
import { shortAddress } from 'utils/itemUtils';

type Props = {
  owner: string;
  // todo -
  categories: { name: string; imageUrl: string }[];
};

function DetailsTab({ owner, categories }: Props) {
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    if (owner) {
      setImgSrc(makeBlockie(owner));
    }
  }, [owner]);

  return (
    <div>
      <div className={'w-1/2 pb-5'}>
        <div className={'font-semibold pb-2'}>Owner</div>
        <HorizontalCard imageUrl={imgSrc} title={shortAddress(owner, 8, 5)} />
      </div>
      <div>
        <div className={'font-semibold pb-2'}>Categories</div>
        <div className={'flex flex-wrap'}>
          {categories.map((c, index) => (
            <div key={index} className={'w-1/3'}>
              <HorizontalCard title={c.name} imageUrl={c.imageUrl} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DetailsTab;
