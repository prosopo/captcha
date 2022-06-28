// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo-io/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
// declare module "*.json" {
//   const value: any;
//   export default value;
// }

import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";

// import { SubmittableResult } from "@polkadot/api";
import {Captcha, CaptchaStatus} from "@prosopo/contract";

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
  "dappUrl": string;
}
