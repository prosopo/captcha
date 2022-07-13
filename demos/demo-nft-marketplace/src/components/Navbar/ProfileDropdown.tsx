import { Popover } from '@headlessui/react';
import { XIcon } from '@heroicons/react/solid';
import { ProsopoConsumer } from 'components/Prosopo';
import { ShowCaptchasState } from 'components/Prosopo/types';
import makeBlockie from 'ethereum-blockies-base64';
import { useToggle } from 'hooks/useToggle';
import { useRouter } from 'next/router';
import { default as React, FC } from 'react';
import styles from './ProfileDropdown.module.css';

const itemClasses =
  'px-2 py-2 relative hover:text-transparent bg-clip-text bg-gradient-to-b from-primary-start to-primary-stop';

const overlayClasses =
  'w-full bg-red-300 py-3 h-full absolute left-0 top-0 bg-gradient-to-b from-secondary to-secondary hover:from-primary-start hover:to-primary-stop opacity-10 rounded-md';

const renderListItem = ({ title, handler }: { title: string; handler?: () => void }) => (
  <li className={itemClasses} onClick={handler} key={title}>
    {title}
    <div className={overlayClasses} />
  </li>
);

const renderContent = (menuItems, swapColors = false) => (
  <div className="flex ">
    <ul
      className={`${styles.dropdown} p-2 z-10 font-semibold  -bottom-1 flex flex-col text-white  right-0 min-w-max ${
        swapColors ? 'bg-main w-full' : 'bg-gray-800'
      } rounded-md text-sm gap-y-4 px-4 py-4 border border-gray-900`}
    >
      {menuItems.map((item) => renderListItem(item))}
    </ul>
  </div>
);

type Props = {
  address: string;
  disconnect: () => void;
};

const ProfileDropdown: FC<Props> = (props: Props) => {
  return (
    <ProsopoConsumer>
      {({ showFaucetModal }) => <ProfileDropdownInternal {...props} showFaucetModal={showFaucetModal} />}
    </ProsopoConsumer>
  );
};

const ProfileDropdownInternal: FC<Props & Partial<ShowCaptchasState>> = ({ address, disconnect, showFaucetModal }) => {
  const [displayFull, setDisplayFull] = useToggle(false);

  const router = useRouter();
  const menuItems = [
    {
      title: 'My items',
      handler: () => {
        setDisplayFull(false);
        router.push(`/profile/${address}?tab=Owned`);
      },
    },
    {
      title: 'Faucet',
      handler: () => {
        showFaucetModal();
      },
    },
    {
      title: 'Disconnect',
      handler: () => {
        setDisplayFull(false);
        disconnect();
      },
    },
  ];

  return (
    <div className="relative flex items-center justify-center w-10">
      <Popover className="relative hidden text-white lg:flex">
        <Popover.Button>
          <img className="w-10 h-10" src={makeBlockie(address || '0x000')} />
        </Popover.Button>
        <Popover.Panel className="absolute right-0 z-10 text-white top-11">{renderContent(menuItems)}</Popover.Panel>
      </Popover>
      <img className="flex h-10 text-white lg:hidden" src={makeBlockie(address || '0x000')} onClick={setDisplayFull} />
      {displayFull && (
        <div className="fixed top-0 left-0 z-10 flex flex-col w-screen h-screen lg:hidden bg-main">
          <div className="top-0 right-0 flex justify-end px-5 py-5 ">
            <XIcon className="block w-6 h-6 text-gray-400 " aria-hidden="true" onClick={setDisplayFull} />
          </div>

          {renderContent(menuItems, true)}
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
