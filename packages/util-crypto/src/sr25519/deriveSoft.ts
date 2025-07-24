// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { HDKD } from "@scure/sr25519";

import { createDeriveFn } from "./derive.js";

export const sr25519DeriveSoft = /*#__PURE__*/ createDeriveFn(HDKD.secretSoft);
