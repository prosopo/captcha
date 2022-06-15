import demoApi, { formatPrice } from 'api/demoApi';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import { ProsopoConsumer } from 'components/Prosopo';
import React, { useCallback, useEffect, useState } from 'react';
import { ProsopoCaptchaClient } from '@prosopo/procaptcha';
import { BN } from '@polkadot/util';

type Props = Omit<ModalProps, 'title' | 'description'> & {
  id: string;
  price: string;
  title: string;
};

function CheckoutModal(props: Props) {
  return (
    <ProsopoConsumer>
      {({ clientInterface }) => <CheckoutModalInternal {...props} clientInterface={clientInterface} />}
    </ProsopoConsumer>
  );
}

function CheckoutModalInternal({
  id,
  price,
  title,
  clientInterface,
  ...props
}: Props & { clientInterface: ProsopoCaptchaClient }): JSX.Element {
  const [balance, setBalance] = useState<BN>(new BN(0));
  const [gas, setGas] = useState<string>('0');

  const onSubmit = useCallback(async () => {
    const signer = clientInterface.getExtension().getExtension().signer;
    await demoApi.setAccount(clientInterface.getExtension().getAccount());
    await demoApi.buy(signer, id, gas);
    location.reload();
  }, [id, clientInterface, gas]);

  const info = [
    { key: 'Balance', value: formatPrice(balance.toString()) },
    { key: 'Item Price', value: price },
    { key: 'Estimated Gas', value: formatPrice(gas) },
  ];

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
          <Button title={'Buy Now'} fullWidth onClick={onSubmit} />
        )}
      </div>
    </Modal>
  );
}

export default CheckoutModal;
