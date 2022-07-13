import Link from 'components/Link';
import makeBlockie from 'ethereum-blockies-base64';
import React, { FC } from 'react';

type Props = {
  additionalClasses?: string;
  sizeClasses?: string;
  username: string;
};

const Avatar: FC<Props> = ({ additionalClasses = '', sizeClasses, username }) => {
  return (
    <Link to={`/profile/${username}`}>
      <div className="relative flex cursor-pointer">
        <img
          className={`${additionalClasses} ${
            sizeClasses ?? 'w-10 h-10'
          } flex-shrink-0 border-2 border-gray-700 rounded-full`}
          src={makeBlockie(username || '0x000')}
          alt="avatar"
        />
      </div>
    </Link>
  );
};
export default Avatar;
