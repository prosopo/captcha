import { TExtensionAccount, ProsopoCaptchaClient } from '@prosopo/procaptcha';
import dynamic from 'next/dynamic';
import { ProviderProps, ConsumerProps } from './types';

const ProsopoProvider = dynamic<ProviderProps>(
  () => import('components/Prosopo/ProsopoContext').then((mod) => mod.ProsopoProvider),
  {
    ssr: false,
  }
);

const ProsopoConsumer = dynamic<ConsumerProps>(
  () => import('components/Prosopo/ProsopoContext').then((mod) => mod.ProsopoConsumer),
  {
    ssr: false,
  }
);

const CaptchaComponent = dynamic<{ clientInterface: ProsopoCaptchaClient }>(
  () => import('@prosopo/procaptcha-react').then((mod) => mod.CaptchaComponent),
  {
    ssr: false,
  }
);

const ExtensionAccountSelect = dynamic<{
  value?: TExtensionAccount;
  options: TExtensionAccount[];
  onChange: (value: TExtensionAccount | null) => void;
}>(() => import('@prosopo/procaptcha-react').then((mod) => mod.ExtensionAccountSelect), {
  ssr: false,
});

export { ProsopoProvider, ProsopoConsumer, CaptchaComponent, ExtensionAccountSelect };
