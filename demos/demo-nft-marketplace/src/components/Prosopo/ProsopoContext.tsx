import { useState, createContext, FC, useEffect } from 'react';
import { TCaptchaSubmitResult, TExtensionAccount, Extension } from '@prosopo/procaptcha';
import { CaptchaContextManager, useCaptcha } from '@prosopo/procaptcha-react';
import toast, { Toaster } from 'react-hot-toast';

import config from 'config';
import { ProviderProps, ShowCaptchasState, ConsumerProps } from './types';

const CustomContext = createContext<ShowCaptchasState>({
  captchasVisible: false,
  showCaptchas: () => {
    console.log('implement showCaptchas');
  },
});

export const ProsopoProvider: FC<ProviderProps> = ({ children }) => {
  const [showCaptchas, setShowCaptchas] = useState(false);
  const [, setLoading] = useState(true);
  const [onSolvedCallback, setOnSolvedCallback] = useState<() => Promise<void>>(async () => {});

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
    const txHash = tx.txHash.toHuman();

    status.update({ info: ['onSubmit: CAPTCHA SUBMIT STATUS', result.status] });
    toast.loading('Loading ...', { id: txHash });
  };

  const onSolved = ([result, tx, commitment]: TCaptchaSubmitResult) => {
    setShowCaptchas(false);
    status.update({ info: ['onSolved:', `Captcha solution status: ${commitment.status}`] });

    const txHash = tx.txHash.toHuman();
    if (commitment.status == 'Approved') {
      toast.success("Solution Approved! You've gained reputation.", { id: txHash });
    } else {
      toast.error("Solution Dissaproved! You've lost some reputation.", { id: txHash });
    }

    onSolvedCallback();
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
    Extension.create().then((extension: Extension) => {
      clientInterface.setExtension(extension);
      const defaultAddress = extension.getDefaultAccount()?.address;
      const currUser = extension.getAccounts().find(({ address }) => address == defaultAddress);

      if (currUser) {
        clientInterface.onAccountChange(currUser);
      }

      setLoading(false);
    });
  }, []);

  return (
    <CustomContext.Provider
      value={{
        captchasVisible: showCaptchas,
        showCaptchas: (callback) => {
          setShowCaptchas(true);
          if (callback) {
            setOnSolvedCallback(() => () => callback());
          }
        },
        clientInterface,
      }}
    >
      <CaptchaContextManager.Provider value={manager}>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 6000 }} />
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
