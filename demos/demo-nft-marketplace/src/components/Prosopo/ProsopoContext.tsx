import { useState, createContext, FC, useEffect } from 'react';
import { TCaptchaSubmitResult, TExtensionAccount, Extension } from '@prosopo/procaptcha';
import { CaptchaContextManager, useCaptcha } from '@prosopo/procaptcha-react';
import toast, { ToastBar, Toaster } from 'react-hot-toast';

import config from 'config';
import { ProviderProps, ShowCaptchasState, ConsumerProps } from './types';
import { formatPrice } from 'api/demoApi';
import { FaucetModal, WalletModal } from 'components/Modal';

const CustomContext = createContext<ShowCaptchasState>({
  captchasVisible: false,
  showCaptchas: () => {
    console.log('implement showCaptchas');
  },
  showWalletModal: () => {
    console.log('implement showWalletModal');
  },
  showFaucetModal: () => {
    console.log('implement showFaucetModal');
  },
  captchaReloadKey: 0,
});

export const ProsopoProvider: FC<ProviderProps> = ({ children }) => {
  const [showCaptchas, setShowCaptchas] = useState(false);
  const [, setLoading] = useState(true);
  const [onSolvedCallback, setOnSolvedCallback] = useState<(approved: boolean) => Promise<void>>(
    async (approved: boolean) => console.log(approved)
  );
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [faucetModalOpen, setFaucetModalOpen] = useState(false);
  const [captchaReloadKey, setCaptchaReloadKey] = useState<number>(0);

  const onAccountChange = (account: TExtensionAccount) => {
    if (!account) {
      clientInterface.getExtension()?.unsetAccount();
    }
    status.update({ info: 'Selected account: ' + account?.meta.name });
    console.log('CAPTCHA API', clientInterface.getCaptchaApi());
  };

  const onSubmit = (submitResult: TCaptchaSubmitResult | Error) => {
    if (submitResult instanceof Error) {
      status.update({ error: ['onSubmit: CAPTCHA SUBMIT ERROR', submitResult] });
      toast.error(`Error: ${submitResult.message}`);
      return;
    }
    const [result, tx] = submitResult;
    const txHash = tx.txHash.toHuman().toString();

    status.update({ info: ['onSubmit: CAPTCHA SUBMIT STATUS', result.status] });
    toast.loading('Loading ...', { id: txHash });
  };

  const onSolved = ([result, tx, commitment]: TCaptchaSubmitResult, isHuman: boolean | undefined) => {
    console.log({ isHuman });
    setShowCaptchas(!isHuman);
    status.update({ info: ['onSolved:', `Captcha solution status: ${commitment.status}`] });
    const txHash = tx.txHash.toHuman().toString();
    if (commitment.status == 'Approved') {
      toast.success(`Solution Approved! You've gained reputation. ${formatPrice(result.partialFee)} refunded.`, {
        id: txHash,
      });
      onSolvedCallback(true);
    } else {
      toast.error(`Solution Disapproved! You've lost some reputation. ${formatPrice(result.partialFee)} lost.`, {
        id: txHash,
      });
      onSolvedCallback(false);
    }
    if (!isHuman || commitment.status != 'Approved') {
      setCaptchaReloadKey(Date.now());
    }
  };

  const onChange = (solution: number[][]) => {
    console.log('onChange:', solution);
  };

  const onCancel = () => {
    setShowCaptchas(false);
    status.update({ info: '' });
  };

  const clientInterface = useCaptcha({ config }, { onAccountChange, onChange, onSubmit, onSolved, onCancel });

  const manager = clientInterface.manager;
  const status = clientInterface.status;

  useEffect(() => {
    Extension.create()
      .then((extension: Extension) => {
        clientInterface.setExtension(extension);
        const defaultAddress = extension.getDefaultAccount()?.address;
        const currUser = extension.getAccounts().find(({ address }) => address == defaultAddress);

        if (currUser) {
          clientInterface.onAccountChange(currUser);
        }

        setLoading(false);
      })
      .catch((err) => {
        if (err.message != 'No extension found') {
          console.error(err);
        }
        setWalletModalOpen(true);
      });
  }, []);

  return (
    <CustomContext.Provider
      value={{
        captchasVisible: showCaptchas,
        showCaptchas: (callback) => {
          setShowCaptchas(true);
          if (callback) {
            setOnSolvedCallback((approved) => () => {
              return callback(approved);
            });
          }
        },
        clientInterface,
        showWalletModal: () => setWalletModalOpen(true),
        showFaucetModal: () => setFaucetModalOpen(true),
        captchaReloadKey,
      }}
    >
      <CaptchaContextManager.Provider value={manager}>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 6000 }}>
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== 'loading' && <button onClick={() => toast.remove(t.id)}>X</button>}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
        <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
        <FaucetModal isOpen={faucetModalOpen} onClose={() => setFaucetModalOpen(false)} />
      </CaptchaContextManager.Provider>
    </CustomContext.Provider>
  );
};

export const ProsopoConsumer: FC<ConsumerProps> = ({ children }) => {
  return (
    <CaptchaContextManager.Consumer>
      {() => <CustomContext.Consumer>{(options) => children(options)}</CustomContext.Consumer>}
    </CaptchaContextManager.Consumer>
  );
};
