import { BidsIcon, PriceIcon } from 'assets';
import Button, { ButtonType } from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import { useToggle } from 'hooks/useToggle';
import Image from 'next/image';
import React from 'react';
import FixedPriceSaleModal from './FixedPriceSaleModal';

type Props = Omit<ModalProps, 'title' | 'description'> & {
  tokenId: string;
};

const PutOnSaleModal: React.FunctionComponent<Props> = ({ tokenId, ...props }) => {
  const [fixedPriceModalVisible, setFixedPriceModalVisible] = useToggle(false);
  const options = [
    {
      title: 'Fixed price',
      icon: PriceIcon,
      onClick: setFixedPriceModalVisible,
    },
    { title: 'Open for bids', icon: BidsIcon },
  ];

  return (
    <>
      {!fixedPriceModalVisible && (
        <Modal {...props} title="Put on sale" description="Choose sale type">
          <div className="flex text-white gap-x-2.5">
            {options.map(({ title, icon, onClick }) => (
              <div
                onClick={onClick}
                className="flex flex-col items-center w-full pt-10 pb-10 bg-gray-800 border border-gray-700 rounded gap-y-7 border-1 hover:bg-gray-900"
                key={title}
              >
                <Image width={24} height={24} src={icon} />
                <div>{title}</div>
              </div>
            ))}
          </div>
          <div className={'flex flex-col mt-11'}>
            <Button title="Cancel" fullWidth type={ButtonType.Secondary} onClick={props.onClose} />
          </div>
        </Modal>
      )}

      <FixedPriceSaleModal tokenId={tokenId} isOpen={fixedPriceModalVisible} onClose={setFixedPriceModalVisible} />
    </>
  );
};

export default PutOnSaleModal;
