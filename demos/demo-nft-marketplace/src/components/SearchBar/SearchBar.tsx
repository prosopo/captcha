import { SearchIcon } from '@heroicons/react/solid';
import { SearchIcon as SVGSearchIcon } from 'assets';
import { XIcon } from '@heroicons/react/outline';

import Button from 'components/Button';
import { ButtonType } from 'components/Button/Button';
import React, { FC, useCallback, useState } from 'react';

type Props = { hidden?: boolean };
const SearchBar: FC<Props> = ({ hidden = false }) => {
  const [displaySearchOverlay, setDisplaySearchOverlay] = useState(false);
  const [displayResults, setDisplayResults] = useState(false);

  const renderInput = useCallback(() => {
    return (
      <div className="w-full">
        <input
          onBlur={() => setDisplayResults(false)}
          onFocus={() => {
            setDisplayResults(true);
          }}
          id="search"
          name="search"
          className="block w-full py-2 pl-10 pr-3 text-gray-300 placeholder-gray-400 border border-transparent border-gray-600 leading-5 rounded-md focus:outline-none focus:text-white sm:text-sm bg-main borer"
          placeholder="Collection, item or user"
          type="search"
        />
        {!displaySearchOverlay && displayResults && (
          <div className="absolute z-10 flex items-center justify-center w-full h-40 text-white border border-gray-600 absoulte bg-main ">
            Search results will go here
          </div>
        )}
      </div>
    );
  }, [displayResults, displaySearchOverlay, setDisplayResults]);

  const renderMobileSearch = useCallback(
    () => (
      <div className="fixed top-0 left-0 z-10 w-screen h-screen px-4 py-4 bg-main md:hidden">
        <span className="flex items-center gap-x-3">
          {renderInput()}
          <XIcon
            onClick={() => setDisplaySearchOverlay(false)}
            className="block text-white h-7 w-7"
            aria-hidden="true"
          />
        </span>
        <div className="flex items-center justify-center w-full h-full text-white ">Search results will go here</div>
      </div>
    ),
    [renderInput, setDisplaySearchOverlay]
  );

  return hidden ? null : (
    <>
      <div className="justify-center flex-1 hidden px-2 lg:ml-6 lg:justify-end md:block">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </div>
          {renderInput()}
        </div>
      </div>
      <div className="right-0 flex justify-end w-full md:hidden">
        <Button
          icon={SVGSearchIcon}
          equalPadding
          type={ButtonType.Main}
          onClick={() => setDisplaySearchOverlay(true)}
        />
      </div>
      {displaySearchOverlay && renderMobileSearch()}
    </>
  );
};

export default SearchBar;
