import Link from 'components/Link';
import makeBlockie from 'ethereum-blockies-base64';
import React, { FC, Fragment } from 'react';

type Props = {
  additionalClasses?: string;
  sizeClasses?: string;
  username: string;
  disableHoverEffects?: boolean;
};

const Avatar: FC<Props> = ({ additionalClasses = '', sizeClasses, username, disableHoverEffects }) => {
  return (
    <div className={`relative flex ${disableHoverEffects ? '' : 'cursor-pointer group'}`}>
      <img
        className={`${additionalClasses} ${
          sizeClasses ?? 'w-10 h-10'
        } flex-shrink-0 border-2 border-gray-700 rounded-full ${disableHoverEffects ? '' : 'group-hover:border-white'}`}
        src={makeBlockie(username || '0x000')}
        alt="avatar"
      />
    </div>
  );
};
export default Avatar;
