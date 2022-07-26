import { Logo } from 'assets';
import Button from 'components/Button';
import Link from 'components/Link';
import { ExtensionAccountSelect, ProsopoConsumer } from 'components/Prosopo';
import React, { FC } from 'react';
import ProfileDropdown from './ProfileDropdown';

const Navbar: FC<unknown> = () => {
  return (
    <nav className="sticky top-0 z-20 bg-secondary">
      <div className="flex px-2 py-3.5 mx-auto md:py-0 md:h-24 max-w-screen-2xl sm:px-4 lg:px-8">
        <div className="flex items-center justify-between w-full px-2 lg:px-0 ">
          <div className="flex flex-row flex-1">
            <Link to="/">
              <div className="flex items-center flex-none">
                <div className="block -mt-1 text-2xl cursor-pointer w-7">
                  <img className="w-7" src={Logo} />
                </div>
                <span className="hidden h-auto pl-3 text-xl font-bold text-white cursor-pointer lg:block align-cente">
                  ProsopoStore
                </span>
              </div>
            </Link>
            <div className="flex-auto" />
          </div>
          <div className="flex lg:ml-6">
            <ProsopoConsumer>
              {({ clientInterface, showWalletModal, loading }) =>
                !loading && (
                  <>
                    {clientInterface.getExtension() ? (
                      !clientInterface.manager.state.account ? (
                        <div className="prosopo-extension">
                          <ExtensionAccountSelect
                            value={clientInterface.manager.state.account}
                            options={clientInterface.getExtension().getAccounts()}
                            onChange={clientInterface.onAccountChange.bind(clientInterface)}
                          />
                        </div>
                      ) : (
                        <ProfileDropdown
                          address={clientInterface.manager.state.account.address}
                          disconnect={() => clientInterface.onAccountUnset()}
                        />
                      )
                    ) : (
                      <Button title="Connect Wallet" onClick={showWalletModal} />
                    )}
                  </>
                )
              }
            </ProsopoConsumer>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
