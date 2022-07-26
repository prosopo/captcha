import demoApi, { formatPrice } from 'api/demoApi';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import { CaptchaComponent, ProsopoConsumer } from 'components/Prosopo';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { BN } from '@polkadot/util';
import { Dialog, Transition } from '@headlessui/react';
import { ShowCaptchasState } from 'components/Prosopo/types';
import ReactCurrencyInput from 'react-currency-input-field';
import toast from 'react-hot-toast';

type Props = Omit<ModalProps, 'title' | 'description'> & {
  id: string;
  price: string;
  title: string;
  successCallback?: () => {};
};

function formatGas(value: string) {
  if (!value) {
    return '0';
  }

  const decimals = value.split('.')[1]?.length || 0;
  return value.replaceAll(/[.|,]/g, '') + '0'.repeat(9 - decimals);
}

function CheckoutModal(props: Props) {
  return <ProsopoConsumer>{(contextProps) => <CheckoutModalInternal {...props} {...contextProps} />}</ProsopoConsumer>;
}

function CheckoutModalInternal({
  id,
  price,
  title,
  clientInterface,
  captchasVisible,
  successCallback,
  showCaptchas,
  showFaucetModal,
  captchaReloadKey,
  ...props
}: Props & Partial<ShowCaptchasState>): JSX.Element {
  const [balance, setBalance] = useState<BN>(new BN(0));
  const [gas, setGas] = useState<string>('');
  const [estimatedGas, setEstimatedGas] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (approved = true) => {
      const isHuman = await demoApi.isHuman();

      if (!isHuman) {
        toast.error('Captcha threshold not met. Please solve more captchas.');
      }

      if (!isHuman || !approved) {
        setLoading(false);
        return;
      }
      const signer = clientInterface.getExtension()?.getExtension?.()?.signer;
      await demoApi
        .buy(signer, id, formatGas(gas))
        .then((x) => {
          if (x == null) {
            toast.error('Something went wrong! Please try again.');
            return;
          }
          console.log({ success: x });
          toast.success('Purchase successful!');
          successCallback?.();
        })
        .catch((error) => {
          if (error.method && error.method == 'ContractReverted') {
            toast.error('Something went wrong! Please try again.');
          } else if (error.docs) {
            toast.error(error.docs.join(' '));
          } else {
            toast.error(error.message);
          }
          console.log({ error });
        });
      setLoading(false);
      props.onClose();
    },
    [id, clientInterface, gas]
  );

  const info = [
    { key: 'Balance', value: formatPrice(balance.toString()) },
    { key: 'Item Price', value: formatPrice(price) },
    { key: 'Estimated Gas', value: estimatedGas },
  ];

  const onBuy = async () => {
    setLoading(true);
    const isHuman = await demoApi.isHuman();

    if (isHuman) {
      onSubmit();
    } else {
      showCaptchas(onSubmit);
    }
  };

  useEffect(() => {
    if (props.isOpen) {
      const account = clientInterface.getExtension()?.getAccount?.();
      demoApi.setAccount(account).then(() => {
        demoApi
          .getBalance()
          .then((x) => setBalance(new BN((x?.toHuman().free || '0').replaceAll(',', ''))))
          .catch(console.log);
        demoApi
          .estimateBuyGasFees(id)
          .then((gas) => {
            if (gas == null) {
              toast.error('Something went wrong! Please try again.');
              return;
            }
            const formatted = formatPrice(gas);
            const doubledFormatted = formatPrice(new BN(gas).muln(2).toString());
            setEstimatedGas(formatted);
            setGas(doubledFormatted.split(' ')[0]);
          })
          .catch(console.log);
      });
    }
  }, [props.isOpen]);

  const insufficient = new BN(price).cmp(balance) > 0;

  return (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Modal {...props} title={'Checkout'} description={`You are about to purchase [${title}]`}>
        <div className="flex flex-col pb-2 text-gray-700 gap-y-1">
          {insufficient && <div>Insufficiently Funds</div>}
          {info.map(({ key, value }) => (
            <div key={key} className="flex justify-between">
              {key} <div>{value}</div>
            </div>
          ))}
          <div className="flex flex-row space-x-2">
            <div className="flex items-center min-w-max">Gas Limit</div>
            <ReactCurrencyInput
              title="Gas Limit"
              decimalsLimit={4}
              allowDecimals={true}
              allowNegativeValue={false}
              className="block w-full text-right text-white border-gray-600 rounded-md shadow-sm bg-secondary focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              onValueChange={(value) => setGas(value)}
              value={gas}
            />
            <div className="flex items-center min-w-max">milli Unit</div>
          </div>
          <p className="my-2 text-sm font-semibold text-white">
            If required to complete a captcha, you will need to pay a small fee which will be refunded upon successfully
            completing it.
          </p>
        </div>
        <div className={'flex flex-col'}>
          {insufficient ? (
            <>
              <div className="py-2 text-lg font-bold text-center text-white">Balance too low</div>
              <Button
                title={'Use faucet'}
                fullWidth
                onClick={() => {
                  props.onClose();
                  showFaucetModal();
                }}
              />
            </>
          ) : (
            <Button title={'Buy Now'} fullWidth onClick={onBuy} loading={loading} />
          )}
        </div>
        <Transition appear show={captchasVisible} as={Fragment}>
          <Dialog as="div" className="fixed inset-0 z-30 overflow-y-auto" onClose={clientInterface.callbacks.onCancel}>
            <Dialog.Panel className="h-screen">
              <CaptchaComponent key={captchaReloadKey} clientInterface={clientInterface} />
            </Dialog.Panel>
          </Dialog>
        </Transition>
      </Modal>
    </span>
  );
}

export default CheckoutModal;
