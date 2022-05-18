/* This example requires Tailwind CSS v2.0+ */
import { FC, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/solid';

type Props = {
  displayText?: string;
  dropDownContent: React.ReactNode;
  displayDropOnly?: boolean;
};

const Dropdown: FC<Props> = ({ displayText, dropDownContent, displayDropOnly }) => {
  return (
    <Menu as="div" className="relative inline-block py-px text-left" aria-expanded>
      {!displayDropOnly && (
        <div>
          <Menu.Button className="inline-flex items-center justify-center w-full px-4 py-4 font-medium text-white border border-gray-600 rounded-md shadow-sm bg-main sm:text-md">
            {displayText}
            <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
          </Menu.Button>
        </div>
      )}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div className="absolute right-0 z-10 w-56 mt-2 bg-white shadow-lg origin-top-right rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none">
          {dropDownContent}
        </div>
      </Transition>
    </Menu>
  );
};

export default Dropdown;
