import demoApi, { formatPrice, Token } from 'api/demoApi';
import Button from 'components/Button';
import HorizontalCard from 'components/HorizontalCard';
import { ProsopoConsumer } from 'components/Prosopo';
import { ShowCaptchasState } from 'components/Prosopo/types';
import makeBlockie from 'ethereum-blockies-base64';
import { NextPageContext } from 'next';
import React, { useEffect, useState } from 'react';
import { shortAddress } from 'utils/itemUtils';
import { CheckoutModal } from 'components/Modal';
import { useToggle } from 'hooks/useToggle';
import toast from 'react-hot-toast';

type Props = { token: Token };

function ItemDetailsPage(props: Props): JSX.Element {
  return <ProsopoConsumer>{(options) => <ItemDetails {...props} {...options} />}</ProsopoConsumer>;
}

type ItemDetailsProps = Props & ShowCaptchasState;

function ItemDetails({ token: _token }: ItemDetailsProps) {
  const [isCheckoutVisible, setCheckoutVisible] = useToggle(false);
  const [creatorAvatar, setCreatorAvatar] = useState(null);
  const [token, setToken] = useState(_token);

  useEffect(() => {
    setCreatorAvatar(makeBlockie(token.owner));
  }, []);

  const getToken = () => {
    return demoApi
      .getToken(_token.id)
      .then((t) => {
        setToken(t);
        setCreatorAvatar(makeBlockie(t.owner));
      })
      .catch((error) => {
        if (error.docs) {
          toast.error(error.docs.join(' '));
        } else {
          toast.error(error.message);
        }
        console.log({ error });
      });
  };

  const price = formatPrice(token.price);

  const renderButton = () => {
    const onClick = () => {
      // TODO: show captcha and add aditional checks if needed
      setCheckoutVisible(true);
    };

    return !token.onSale ? null : (
      <Button fullWidth title={`Buy for ${price}`} onClick={onClick} customClasses="sticky bottom-4 lg:static" />
    );
  };

  return (
    <div>
      <main className="max-w-2xl px-4 pb-16 mx-auto mt-8 sm:pb-24 sm:px-6 lg:max-w-full lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:auto-rows-min lg:gap-x-8">
          <div className="lg:col-start-8 lg:col-span-5">
            <h1 className="text-2xl font-bold text-white">{token.meta.name}</h1>
          </div>

          {/*// LEFT SIDE CONTENT*/}
          <div className="h-full mt-8 lg:mt-0 lg:col-start-1 lg:col-span-7 lg:row-start-1 lg:row-span-3">
            <div className={'flex h-full max-h-full justify-center bg-secondary'}>
              <img src={token.meta.image} className="object-contain w-full p-5 lg:p-16" />
            </div>
          </div>

          {/*RIGHT SIDE CONTENT*/}
          <div className="mt-4 font-bold text-white lg:col-span-5">
            <p className="pb-5">{token.onSale ? `On sale for ${price}` : 'Not for sale'}</p>

            <p className="pb-10 font-semibold text-white">{token.meta.description}</p>

            <div className={'flex flex-col xl:flex-row'}>
              <div className={'flex-1'}>
                <div className={'pb-5'}>Owner</div>
                <HorizontalCard title={shortAddress(token.owner, 8, 6)} imageUrl={creatorAvatar} />
              </div>
            </div>
            {renderButton()}
            <CheckoutModal
              id={token.id}
              title={token.meta.name}
              isOpen={isCheckoutVisible}
              onClose={setCheckoutVisible}
              price={token.price}
              successCallback={getToken}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext): Promise<{ props: Props }> {
  const id = context.query['nft-item-details'] as string;

  const token = await demoApi.getToken(id);

  return {
    props: {
      token,
    },
  };
}

export default ItemDetailsPage;
