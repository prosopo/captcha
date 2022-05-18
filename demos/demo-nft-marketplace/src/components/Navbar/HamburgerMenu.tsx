import Button from 'components/Button';
import { ButtonType } from 'components/Button/Button';
import Link from 'components/Link/Link';
import { useRouter } from 'next/router';
import React, { FC, ReactNode } from 'react';
import { useWallet } from '../../wallet/state';

const renderLinks = (navigationLinks, hideMenu) => (
  <>
    {navigationLinks.map(({ title, to }) => (
      <Link key={title} to={to}>
        <div onClick={hideMenu} className="pt-4 pb-1 font-bold">
          {title}
        </div>
      </Link>
    ))}
  </>
);
type Props = {
  renderSocialButtons: () => ReactNode;
  hideMenu?: () => void;
};

const HamburgerMenu: FC<Props> = ({ renderSocialButtons, hideMenu }) => {
  const router = useRouter();
  const [{ address }] = useWallet();
  const navigationLinks = [
    { title: 'Explore', to: '/' },
    { title: 'My item', to: `${address}?tab=Owned` },
    { title: 'How it works', to: '#' },
  ];
  return (
    <div className="fixed z-10 flex flex-col w-screen h-screen lg:hidden bg-main">
      <div>
        <div className="flex flex-col px-8 pt-2 pb-3 text-xl text-white space-y-1 divide-y divide-gray-300 ">
          {renderLinks(navigationLinks, hideMenu)}
          <div className="flex justify-center pt-10"> {renderSocialButtons()}</div>
        </div>
      </div>
      <div className="fixed flex justify-around w-full bottom-4">
        {/* <Button
          type={ButtonType.Primary}
          title="Create"
          onClick={() => {
            hideMenu?.();
            router.push('/mint');
          }}
        /> */}
        <div className={`${address ? 'hidden' : ''}`}>
          <Button
            type={ButtonType.Secondary}
            title="Connect"
            onClick={() => {
              hideMenu?.();
              router.push('/wallet/connect');
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;
