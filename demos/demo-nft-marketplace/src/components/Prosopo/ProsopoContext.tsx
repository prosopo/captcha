import { useState, createContext, ReactNode, FC, useEffect } from 'react';
import { TCaptchaSubmitResult, TExtensionAccount, Extension } from '@prosopo/procaptcha';
import { CaptchaContextManager, useCaptcha } from '@prosopo/procaptcha-react';

import config from 'config';
import { ProviderProps, ShowCaptchasState, ConsumerProps } from './types';
import { WsProvider } from '@polkadot/api';

const CustomContext = createContext<ShowCaptchasState>({
  showCaptchas: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setShowCaptchas: (value: boolean) => {},
});

export const ProsopoProvider: FC<ProviderProps> = ({ children }) => {
  const [showCaptchas, setShowCaptchas] = useState(false);
  const [, setLoading] = useState(true);

  const onAccountChange = (account: TExtensionAccount) => {
    if (!account) {
      clientInterface.getExtension()?.unsetAccount();
    }
    setShowCaptchas(true);
    status.update({ info: 'Selected account: ' + account?.meta.name });
    console.log('CAPTCHA API', clientInterface.getCaptchaApi());
  };

  const onSubmit = (submitResult: TCaptchaSubmitResult | Error) => {
    if (submitResult instanceof Error) {
      status.update({ error: ['onSubmit: CAPTCHA SUBMIT ERROR', submitResult] });
      return;
    }
    const [result, tx] = submitResult;
    status.update({ info: ['onSubmit: CAPTCHA SUBMIT STATUS', result.status] });
  };

  const onSolved = ([result, tx, commitment]: TCaptchaSubmitResult) => {
    setShowCaptchas(false);

    status.update({ info: ['onSolved:', `Captcha solution status: ${commitment.status}`] });
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
    <CustomContext.Provider value={{ showCaptchas, setShowCaptchas, clientInterface }}>
      <CaptchaContextManager.Provider value={manager}>{children}</CaptchaContextManager.Provider>
    </CustomContext.Provider>
  );
};

export const ProsopoConsumer: FC<ConsumerProps> = ({ children }) => {
  return (
    <CustomContext.Consumer>
      {(options) => <CaptchaContextManager.Consumer>{() => children(options)}</CaptchaContextManager.Consumer>}
    </CustomContext.Consumer>
  );
};
