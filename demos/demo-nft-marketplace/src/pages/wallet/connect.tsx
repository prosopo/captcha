import { WalletImage, WalletPageCover } from 'assets';
import Avatar from 'components/Avatar/Avatar';
import Breadcrumb from 'components/Breadcrumb';
import React, { FC, useCallback, useEffect } from 'react';
import { routes } from 'utils/routes';
import { getOnboard } from 'utils/walletUtils';
import { useWallet } from 'wallet/state';

const renderProfileImage = () => (
  <div className="flex-shrink-0">
    <Avatar username="USERNAME" />
  </div>
);
const ConnectWalletPage: FC<unknown> = () => {
  const [state, dispatch] = useWallet();
  const handleWallet = useCallback(async () => {
    const onboard = getOnboard(dispatch);

    const selected = await onboard.walletSelect(localStorage.getItem('walletName'));
    if (selected) {
      await onboard.walletCheck();
    }
  }, []);
  useEffect(() => {
    handleWallet();
  }, []);
  return (
    <div className="flex items-center h-full px-8 py-6 mx-auto text-white gap-x-8 max-w-screen-2xl">
      <div className="relative hidden w-full h-full lg:block">
        <img className="z-10 p-20 xl:p-40" src={WalletPageCover} />
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-gradient-to-b from-primary-start to-primary-stop" />
      </div>
      <div className="flex flex-col content-center w-full h-full gap-y-4 lg:gap-y-6">
        <Breadcrumb path={[routes.Home, routes.ConnectWallet]} />
        <h1 className="text-xl">Connect your wallet</h1>
        <p>
          When an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived
          not only five centuries.
          <a className="block text-blue-500 max-w-max" href="#">
            What is Wallet?
          </a>
        </p>
        <hr className="border-gray-600" />
        <div className="p-px bg-gradient-to-b from-primary-start to-primary-stop">
          <div className="relative px-8 py-8 bg-secondary">
            <div className="flex flex-col gap-y-3 ">
              <div className="flex flex-wrap gap-x-3">
                {renderProfileImage()}
                {renderProfileImage()}
                {renderProfileImage()}
              </div>
              <div>Connect Your Wallet</div>
              <div className="text-sm text-gray-500">Connect with Rainbow, Tsrust, Argent and more</div>
            </div>
            <img className="absolute transform -translate-y-1/2 right-4 top-1/2 opacity-20 " src={WalletImage} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectWalletPage;
