import Button from 'components/Button';
import { NumberInput } from 'components/Form';
import Modal, { ModalProps } from 'components/Modal';
import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Currencies } from 'types';
import { createSellOrder } from 'utils/raribleApiUtils';
import { useWallet } from 'wallet/state';

type Props = Omit<ModalProps, 'title' | 'description'> & {
  tokenId: string;
};

function FixedPriceSaleModal({ tokenId, ...props }: Props) {
  const [{ address, web3, raribleSDK }] = useWallet();
  const onSubmit = useCallback(
    async (data) => {
      await createSellOrder(
        raribleSDK,
        tokenId,
        address,
        web3.utils.toWei(data.price.replace(',', '')).toString(),
        'ETH'
      );
      location.reload();
    },
    [address, raribleSDK, web3]
  );
  const form = useForm({
    defaultValues: {
      quantity: 1,
      price: 0,
      'price-currency': 'ETH',
    },
  });
  const info = [
    { key: 'Service Fee', value: '2.5%' },
    { key: 'You will receive', value: '0 ETH' },
  ];
  const quantityChange = form.watch('quantity');
  console.log(quantityChange);
  return (
    <Modal {...props} title="Fixed price" description="Enter new price. Your NFT  will be pushed in top of marketplace">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <NumberInput
          type={'currency'}
          form={form}
          name={'price'}
          currencies={Currencies?.all() ?? ['ETH']}
          placeholder="Enter price for one piece"
        />

        <NumberInput
          disabled
          type={'quantity'}
          title="Number of copies"
          name={'quantity'}
          form={form}
          placeholder="Enter price for one piece"
        />

        <div className="flex flex-col pb-2 text-gray-700 gap-y-1">
          {info.map(({ key, value }) => (
            <div key={key} className="flex justify-between">
              {key} <div>{value}</div>
            </div>
          ))}
        </div>

        <div className={'flex flex-col'}>
          <Button title="Next step" fullWidth onClick={form.handleSubmit(onSubmit)} />
        </div>
      </form>
    </Modal>
  );
}

export default FixedPriceSaleModal;
