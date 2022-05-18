import Button, { ButtonType } from 'components/Button';
import React from 'react';

type Props = {};

function ChooseProfilePicture({}: Props) {
  return (
    <div className="flex flex-col py-4 mt-1">
      <div className={'flex flex-start my-8 text-white text-md'}>
        You can set preferred display name, create your branded profile URL and manage other personal settings
      </div>
      <div className="flex flex-col items-center sm:flex-row">
        <span className={'flex items-center'}>
          <span className="overflow-hidden bg-gray-100 rounded-full w-14 h-14 md:h-28 md:w-28">
            <svg className="w-full h-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
          <span className={'pl-4 md:pr-4 text-gray-700 w-60 text-sm font-semibold md:mr-4'}>
            We recommend an image of at least 400x400. Gifs work too.
          </span>
        </span>
        <span className={'flex mt-8 md:mt-0'}>
          <Button title="Choose file" type={ButtonType.Secondary} />
        </span>
      </div>
    </div>
  );
}

export default ChooseProfilePicture;
