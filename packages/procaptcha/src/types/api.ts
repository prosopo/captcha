// declare module "*.json" {
//   const value: any;
//   export default value;
// }

// import { SubmittableResult } from "@polkadot/api";
import {Captcha} from "@prosopo/provider";

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

// export interface CaptchaResponseCaptchaItem {
//   captchaId: string;
//   datasetId: string;
//   items: CaptchaImageSchema[];
//   target: string;
//   salt?: string;
//   solution?: number[];
// }

export interface CaptchaImageSchema {
  path: string,
  type: string
}

export interface CaptchaResponseCaptcha {
  captcha: Captcha;
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
