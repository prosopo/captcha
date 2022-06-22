import demoApi, { formatPrice } from 'api/demoApi';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import { CaptchaComponent, ProsopoConsumer } from 'components/Prosopo';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { BN } from '@polkadot/util';
import { Dialog, Transition } from '@headlessui/react';
import { ShowCaptchasState } from 'components/Prosopo/types';

type Props = Omit<ModalProps, 'title' | 'description'> & {
  id: string;
  price: string;
  title: string;
};

function CheckoutModal(props: Props) {
  return (
    <ProsopoConsumer>
      {({ clientInterface, showCaptchas, captchasVisible }) => (
        <CheckoutModalInternal
          {...props}
          clientInterface={clientInterface}
          captchasVisible={captchasVisible}
          showCaptchas={showCaptchas}
        />
      )}
    </ProsopoConsumer>
  );
}

function CheckoutModalInternal({
  id,
  price,
  title,
  clientInterface,
  captchasVisible,
  showCaptchas,
  ...props
}: Props & ShowCaptchasState): JSX.Element {
  const [balance, setBalance] = useState<BN>(new BN(0));
  const [gas, setGas] = useState<string>('0');

  const onSubmit = useCallback(async () => {
    console.log('onSubmit');
    const signer = clientInterface.getExtension().getExtension().signer;
    await demoApi.buy(signer, id, gas);
    location.reload();
  }, [id, clientInterface, gas]);

  const info = [
    { key: 'Balance', value: formatPrice(balance.toString()) },
    { key: 'Item Price', value: formatPrice(price) },
    { key: 'Estimated Gas', value: formatPrice(gas) },
  ];

  const onBuy = async () => {
    const account = clientInterface.getExtension().getAccount();
    await demoApi.setAccount(account);

    const isHuman = await demoApi.isHuman();

    if (isHuman) {
      onSubmit();
    } else {
      showCaptchas(onSubmit);
    }
  };

  useEffect(() => {
    demoApi
      .getBalance(clientInterface.getExtension().getAccount())
      .then((x) => setBalance(new BN(x.toHuman().free.replaceAll(',', ''))))
      .catch(console.log);
    demoApi.estimateBuyGasFees(id).then(setGas).catch(console.log);
  }, []);

  const insufficient = new BN(price).cmp(balance) > 0;

  return (
    <Modal {...props} title={'Checkout'} description={`You are about to purchase [${title}]`}>
      <div className="flex flex-col pb-2 text-gray-700 gap-y-1">
        {insufficient && <div>Insufficiently Funds</div>}
        {info.map(({ key, value }) => (
          <div key={key} className="flex justify-between">
            {key} <div>{value}</div>
          </div>
        ))}
      </div>
      <div className={'flex flex-col'}>
        {insufficient ? (
          <div className="pt-2 text-lg font-bold text-center text-white">Balance too low</div>
        ) : (
          <Button title={'Buy Now'} fullWidth onClick={onBuy} />
        )}
      </div>

      <Transition appear show={captchasVisible} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-30 overflow-y-auto" onClose={clientInterface.callbacks.onCancel}>
          <Dialog.Panel className="h-screen">
            <CaptchaComponent clientInterface={clientInterface} />
          </Dialog.Panel>
        </Dialog>
      </Transition>
    </Modal>
  );
}

export default CheckoutModal;
