import { yupResolver } from '@hookform/resolvers/yup/dist/yup';
import Modal from 'components/Modal';
import AssetDisplay from 'features/home/details/components/AssetDisplay';
import MintModal from 'features/mint/MintModal';
import { useToggle } from 'hooks/useToggle';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { routes } from 'utils/routes';
import * as yup from 'yup';
import Breadcrumb from '../components/Breadcrumb';
import Button, { ButtonType } from '../components/Button';
import { FormStep, NumberInput, TextArea, TextInput } from '../components/Form';
import UploadArea from '../components/Upload';

const schema = yup.object().shape({
  title: yup.string().required('Name is missing'),
  'file-upload': yup.mixed().required('File is required'),
  price: yup
    .string()
    .required('Price is missing')
    .test('format', 'Inccorect format', (value) => {
      try {
        Number.parseFloat(value);
        return true;
      } catch (e) {
        return false;
      }
    }),
});

const MintPage = () => {
  const form = useForm({ resolver: yupResolver(schema) });
  const [showPreviewPicker, setShowPreviewPicker] = useToggle(false);
  const [showMintModal, setShowMintModal] = useToggle(false);
  const [mintData, setMintData] = useState({});
  const submit = useCallback(
    async (data) => {
      setMintData(data);
      setShowMintModal(true);
    },
    [setMintData, setShowMintModal]
  );
  const submitForm = form.handleSubmit(submit);
  const [dataToDisplay, setDataToDisplay] = useState(null);

  const file = form.watch('file-upload');

  useEffect(() => {
    if (file && file?.[0]) {
      setDataToDisplay(file[0]);
    }
  }, [file]);

  return (
    <>
      <div className="flex flex-col justify-between px-6 py-6 pt-10 mx-auto max-w-screen-lg">
        <Breadcrumb path={[routes.Home, routes.Mint]} />
        <div className={'flex flex-start my-8 font-bold text-white text-xl'}>Create multiple collectible</div>
        <form onSubmit={submitForm}>
          <div className={'pb-8'}>
            <FormStep title={'Upload File'}>
              <UploadArea form={form} name={'file-upload'} />
              {dataToDisplay && (
                <div className="relative flex justify-center h-52">
                  <AssetDisplay omitStyles dataToDisplay={dataToDisplay} />
                </div>
              )}
            </FormStep>
          </div>
          <div className={'pb-8'}>
            <FormStep title={'Price'}>
              <div className={'w-1/2'}>
                <NumberInput
                  form={form}
                  name={'price'}
                  title={'Enter price for one piece'}
                  placeholder={'5.0 ETH'}
                  type={'currency'}
                  helperText={'Services Fee : 2.5%'}
                  currencies={['ETH', 'RARI', 'wETH']}
                />
              </div>
            </FormStep>
          </div>
          <div className={'pb-8'}>
            <FormStep
              title={'Other Information'}
              footer={
                <div className={'flex justify-end'}>
                  <Button
                    title={'Preview'}
                    type={ButtonType.Secondary}
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  />
                  <Button
                    customClasses={'ml-4'}
                    title={'Create Item'}
                    onClick={async (e) => {
                      const item = form.getValues('file-upload');
                      const valid = await form.trigger();
                      if (!valid) {
                        return;
                      }
                      if (item?.[0].type?.startsWith('image')) {
                        return;
                      }
                      setShowPreviewPicker();
                      e.preventDefault();
                    }}
                  />
                </div>
              }
            >
              <TextInput
                label={'Title'}
                placeholder={'e.g. "Redeemable T-Shirt with logo"'}
                form={form}
                name={'title'}
              />
              <TextArea
                title={'Description'}
                placeholder='e.g. "After purchasing you’ll be able to get the real T-Shirt"'
                form={form}
                name={'description'}
              />
              <div className={'grid grid-cols-1 gap-x-4 sm:grid-cols-6'}>
                <div className={'sm:col-span-3'}>
                  <NumberInput
                    title={'Royalties'}
                    type={'percent'}
                    form={form}
                    name={'royalties'}
                    placeholder={'e.g. 10%'}
                    helperText={'Suggested: 0%, 10%, 20%, 30%, Maximum is 50%'}
                  />
                </div>
                <div className={'sm:col-span-3'}>
                  <NumberInput
                    title={'Number of copies'}
                    type={'quantity'}
                    placeholder={'e.g. 20'}
                    form={form}
                    name={'copies'}
                    helperText={'Amount of Tokens'}
                  />
                </div>
              </div>
            </FormStep>
          </div>
          <Modal
            large
            isOpen={showPreviewPicker}
            onClose={setShowPreviewPicker}
            title="Pick preview image"
            description="Preview image"
          >
            <UploadArea
              form={form}
              accept="image/*"
              name={'preview-upload'}
              onFinish={() => {
                setShowPreviewPicker();
                submitForm();
              }}
            />
          </Modal>
        </form>
      </div>
      {showMintModal && <MintModal mintData={mintData} isOpen={showMintModal} onClose={setShowMintModal} />}
    </>
  );
};

export default MintPage;
