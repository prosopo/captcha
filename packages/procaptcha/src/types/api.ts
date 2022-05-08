// declare module "*.json" {
//   const value: any;
//   export default value;
// }

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

export interface CaptchaSet {
  captchaId: string;
  datasetId: string;
  // TODO items: {path, type}[];
}

export interface ProsopoCaptcha {
  captcha: CaptchaSet;
  proof: string[][];
}

export interface ProsopoCaptchaResponse {
  captchas: ProsopoCaptcha[];
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

export interface IProCaptchaConfig {
  "providerApi.baseURL": string;
  "providerApi.prefix": string;
  "dappAccount": string;
}
