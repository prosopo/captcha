import { toAddress } from '@rarible/types';
import { pinFileToIPFS, pinJSONToIpfs } from 'api/pinataApi';
import { generateNftToken } from 'api/raribleApi';
import Modal, { ModalProps } from 'components/Modal';
import Step from 'components/Step';
import { Props as MintProps, StepState } from 'components/Step/Step';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import { CONTRACT_ID } from 'utils/constants';
import { createSellOrder } from 'utils/raribleApiUtils';
import { useWallet } from 'wallet/state';

type Props = Omit<ModalProps, 'title' | 'description'> & {
  mintData: any;
};

function MintModal({ mintData, ...props }: Props) {
  const [{ address, web3, raribleSDK }] = useWallet();
  const [stepOne, setStepOne] = useState<MintProps>({
    title: 'Mint',
    description: 'TODO',
    stepState: StepState.ONGOING,
  });
  const [stepTwo, setStepTwo] = useState<MintProps>({
    title: 'Create sell order',
    description: 'TODO',
    stepState: StepState.UNDEFINED,
  });
  const [token, setToken] = useState(undefined);
  const router = useRouter();

  const submitSellOrder = useCallback(async () => {
    setStepTwo({ ...stepTwo, stepState: StepState.ONGOING, retryAction: submitSellOrder });
    try {
      await createSellOrder(
        raribleSDK,
        token.tokenId,
        address,
        web3.utils.toWei(mintData.price.replace(',', '')).toString(),
        mintData['price-currency']
      );

      router.push(`item/${CONTRACT_ID}:${token.tokenId}`);
    } catch (e) {
      setStepTwo({ ...stepTwo, stepState: StepState.FAILED, retryAction: submitSellOrder });
    }
  }, [address, web3, raribleSDK, router, stepTwo, token]);

  const submitMintRequest = useCallback(async () => {
    setStepOne({ ...stepOne, stepState: StepState.ONGOING, retryAction: submitMintRequest });

    try {
      const { IpfsHash: item } = await pinFileToIPFS(mintData['file-upload'][0]);
      let preview;
      if (mintData['preview-upload']) {
        preview = (await pinFileToIPFS(mintData['preview-upload'][0])).IpfsHash;
      }
      const { IpfsHash: metadata } = await pinJSONToIpfs(
        JSON.stringify({
          description: mintData.description,
          name: mintData.title,
          image: `ipfs://ipfs/${preview ?? item}`,
          creator: address,
          creationDate: new Date(),
          external_url: `localhost:3000/${CONTRACT_ID}:${token.tokenId}`,
          animation_url: preview ? `ipfs://ipfs/${item}` : undefined,
        })
      );

      const nftCollection = await raribleSDK.apis.nftCollection.getNftCollectionById({ collection: CONTRACT_ID });

      await raribleSDK.nft.mint({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        collection: nftCollection,
        uri: `ipfs://ipfs/${metadata}`,
        nftTokenId: token,
        creators: [{ account: toAddress(address), value: 10000 }],
        royalties: mintData.royalties
          ? [
              {
                account: toAddress(address),
                value: mintData.royalties * 100,
              },
            ]
          : [],
        lazy: true,
      });
    } catch (e) {
      setStepOne({ ...stepOne, stepState: StepState.FAILED, retryAction: submitMintRequest });
      return;
    }
    setStepOne({ ...stepOne, stepState: StepState.FINISHED });
    submitSellOrder();
  }, [address, web3, raribleSDK, router, stepOne, token, submitSellOrder]);

  useEffect(() => {
    generateNftToken({ collection: CONTRACT_ID, minter: address }).then((token) => setToken(token));
  }, []);
  useEffect(() => {
    if (token) {
      submitMintRequest();
    }
  }, [token]);
  return (
    <Modal {...props} title={'Mint'} description="">
      <Step {...stepOne} />
      <Step {...stepTwo} />
    </Modal>
  );
}

export default MintModal;
