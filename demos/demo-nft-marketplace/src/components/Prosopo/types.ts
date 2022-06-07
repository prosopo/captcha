import { ProsopoCaptchaClient } from '@prosopo/procaptcha';
import { PropsWithChildren, ReactNode } from 'react';

export type ShowCaptchasState = {
  showCaptchas: boolean;
  setShowCaptchas: (value: boolean) => void;
  clientInterface?: ProsopoCaptchaClient;
};

export type ConsumerProps = {
  children(options: ShowCaptchasState): ReactNode;
};

export type ProviderProps = PropsWithChildren<{}>;
