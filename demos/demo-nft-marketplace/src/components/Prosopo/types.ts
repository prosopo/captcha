import { ProsopoCaptchaClient } from '@prosopo/procaptcha';
import { PropsWithChildren, ReactNode } from 'react';

export type ShowCaptchasState = {
  captchasVisible: boolean;
  showCaptchas: (callback?: (approved: boolean) => Promise<void>) => void;
  clientInterface?: ProsopoCaptchaClient;
};

export type ConsumerProps = {
  children(options: ShowCaptchasState): ReactNode;
};

export type ProviderProps = PropsWithChildren<{}>;
