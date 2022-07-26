import Button, { ButtonType } from 'components/Button';
import React, { useEffect, useState } from 'react';
import Modal, { ModalProps } from './Modal';
import demoApi, { formatPrice, MAX_BALANCE_FAUCET, MIN_BALANCE_FAUCET } from 'api/demoApi';
import { BN } from '@polkadot/util';
import axios from 'axios';
import { ShowCaptchasState } from 'components/Prosopo/types';
import { ProsopoConsumer } from 'components/Prosopo';
import toast from 'react-hot-toast';

type Props = Omit<ModalProps, 'children' | 'description' | 'title'>;

async function requestFunds(account: string): Promise<string> {
  const res = await axios.post('/api/faucet', { account });

  const amount = res.data.amount;

  return formatPrice(amount);
}

function FaucetModal(props: Props) {
  return (
    <ProsopoConsumer>
      {({ clientInterface }) => <FaucetModalInternal {...props} clientInterface={clientInterface} />}
    </ProsopoConsumer>
  );
}

function FaucetModalInternal({ clientInterface, ...modalProps }: Props & Partial<ShowCaptchasState>) {
  const [balance, setBalance] = useState<BN>(new BN(0));
  const [amountAllowed, setAmountAllowed] = useState<BN>(new BN(0));
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!modalProps.isOpen) {
      return;
    }

    const account = clientInterface.getExtension()?.getAccount?.();
    demoApi.setAccount(account).then(() => {
      demoApi
        .getBalance()
        .then((x) => {
          const _balance = new BN((x?.toHuman().free || '0').replaceAll(',', ''));
          setBalance(_balance);
          setAmountAllowed(new BN(0));
          if (_balance.gt(new BN(MIN_BALANCE_FAUCET.toString()))) {
            setMessage('You have enough funds for transactions.');
            return;
          }
          const _amountAllowed = new BN(MAX_BALANCE_FAUCET.toString()).sub(_balance);
          if (_amountAllowed.gtn(0)) {
            setAmountAllowed(_amountAllowed);
          } else {
            console.log('gt');
            setMessage('You have enough funds for transactions.');
            return;
          }
          setMessage('');
        })
        .catch(console.log);
    });
  }, [modalProps.isOpen]);

  const info = [
    { key: 'Balance', value: formatPrice(balance.toString()) },
    { key: 'Allowed amount', value: formatPrice(amountAllowed.toString()) },
  ];

  const onSend = async () => {
    setLoading(true);
    try {
      const { address } = await demoApi.getAccount();
      const res = await requestFunds(address);

      modalProps.onClose();
      toast.success(`${res} added.`);
    } catch (err) {
      toast.error('Something went wrong!');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <Modal
      {...modalProps}
      title="Faucet"
      description={`You may own a maximum of ${formatPrice(
        MAX_BALANCE_FAUCET.toString()
      )} to prevent faucet spamming. You may use faucet if you have less than ${formatPrice(
        MIN_BALANCE_FAUCET.toString()
      )}`}
    >
      <div className="mb-3 text-gray-700">
        {info.map(({ key, value }) => (
          <div key={key} className="flex justify-between">
            {key} <div>{value}</div>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm font-semibold text-white">{message}</p>
      {message ? (
        <Button fullWidth title="Close" type={ButtonType.Main} onClick={() => modalProps.onClose()} />
      ) : (
        <Button fullWidth title="Send" type={ButtonType.Main} onClick={onSend} loading={loading} />
      )}
    </Modal>
  );
}

export default FaucetModal;
