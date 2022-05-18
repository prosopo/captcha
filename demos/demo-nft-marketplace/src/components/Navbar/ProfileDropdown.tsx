import { Popover } from '@headlessui/react';
import { XIcon } from '@heroicons/react/solid';
import { useProfile } from 'api/ceramic';
import Avatar from 'components/Avatar/Avatar';
import makeBlockie from 'ethereum-blockies-base64';
import { useToggle } from 'hooks/useToggle';
import { useRouter } from 'next/router';
import { default as React, FC } from 'react';
import { getOnboard } from 'utils/walletUtils';
import { useWallet } from 'wallet/state';
import Web3 from 'web3';
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

const renderContent = (state, menuItems, userProfile, swapColors = false) => (
  <div className="flex ">
    <ul
      className={`${styles.dropdown} p-2 z-10 font-semibold  -bottom-1 flex flex-col text-white  right-0 min-w-max ${
        swapColors ? 'bg-main w-full' : 'bg-gray-800'
      } rounded-md text-sm gap-y-4 px-4 py-4 border border-gray-900`}
    >
      <li className={`flex w-full px-4 py-3 ${swapColors ? 'bg-gray-800' : 'bg-main'} gap-x-4`}>
        <Avatar
          sizeClasses="h-10 w-10 "
          username={state.address}
          imgSrc={
            userProfile?.basicProfileInfo?.image?.original?.src
              ? `https://dweb.link/ipfs/${userProfile?.basicProfileInfo?.image?.original?.src?.split('/')?.pop()}`
              : null
          }
        />
        <div className="flex flex-col justify-center">
          <div>{Web3?.utils?.fromWei(state?.balance ?? '0')} ETH</div>
          <div className="text-sm text-gray-600">Balance</div>
        </div>
      </li>

      {menuItems.map((item) => renderListItem(item))}
    </ul>
  </div>
);
const ProfileDropdown: FC<unknown> = () => {
  const [state, dispatch] = useWallet();
  const [displayWalletData, setDisplayWalletData] = useToggle(false);

  const router = useRouter();
  const menuItems = [
    {
      title: 'My items',
      handler: () => {
        setDisplayWalletData(false);
        router.push(`/profile/${state.address}?tab=Owned`);
      },
    },
    {
      title: 'Edit profile',
      handler: () => {
        setDisplayWalletData(false);
        router.push('/profile/edit');
      },
    },
    {
      title: 'Disconnect',
      handler: () => {
        setDisplayWalletData(false);
        getOnboard(dispatch).walletReset();
        localStorage.removeItem('walletName');
        dispatch({ type: 'RESET' });
      },
    },
  ];

  const userProfile = useProfile(state.address);

  return (
    <div className="relative flex items-center justify-center w-10">
      <Popover className="relative hidden text-white lg:flex">
        <Popover.Button>
          <img
            className="h-10"
            src={
              userProfile?.basicProfileInfo?.image?.original?.src
                ? `https://dweb.link/ipfs/${userProfile?.basicProfileInfo?.image?.original?.src?.split('/')?.pop()}`
                : makeBlockie(state.address)
            }
          />
        </Popover.Button>
        <Popover.Panel className="absolute right-0 z-10 text-white top-11">
          {renderContent(state, menuItems, userProfile)}
        </Popover.Panel>
      </Popover>
      <img
        className="flex h-10 text-white lg:hidden"
        src={
          userProfile?.basicProfileInfo?.image?.original?.src
            ? `https://dweb.link/ipfs/${userProfile?.basicProfileInfo?.image?.original?.src?.split('/')?.pop()}`
            : makeBlockie(state.address)
        }
        onClick={setDisplayWalletData}
      />

      {displayWalletData && (
        <div className="fixed top-0 left-0 z-10 flex flex-col w-screen h-screen lg:hidden bg-main">
          <div className="top-0 right-0 flex justify-end px-5 py-5 ">
            <XIcon className="block w-6 h-6 text-gray-400 " aria-hidden="true" onClick={setDisplayWalletData} />
          </div>

          {renderContent(state, menuItems, userProfile, true)}
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
