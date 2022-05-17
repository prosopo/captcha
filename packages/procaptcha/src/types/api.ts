// declare module "*.json" {
//   const value: any;
//   export default value;
// }

import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";

// import { SubmittableResult } from "@polkadot/api";
export interface ProsopoRandomProviderResponse {
  providerId: string,
  blockNumber: string;
  provider: ProposoProvider;
}

export interface ProposoProvider {
  balance: string;
  captchaDatasetId: string;
  fee: string;
  payee: string; // TODO: enum?
  serviceOrigin: string;
  status: string; // TODO: enum
}

export interface CaptchaResponseCaptchaItem {
  captchaId: string;
  datasetId: string;
  // TODO items: {path, type}[];
}

export interface CaptchaResponseCaptcha {
  captcha: CaptchaResponseCaptchaItem;
  proof: string[][];
}

export interface GetCaptchaResponse {
  captchas: CaptchaResponseCaptcha[];
  requestHash: string;
}

export interface CaptchaSolution {
  captchaId: string;
  solution: number[];
  salt: string;
}

export interface CaptchaSolutionResponse {
  status: string;
}

export interface ProsopoCaptchaConfig {
  "providerApi.baseURL": string;
  "providerApi.prefix": string;
  "dappAccount": string;
}
