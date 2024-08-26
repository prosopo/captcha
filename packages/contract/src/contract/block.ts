// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { ApiPromise } from "@polkadot/api/promise/Api";
import { BN } from "@polkadot/util/bn";

/**
 * Get the current block time in milliseconds
 */
export const getBlockTimeMs = (api: ApiPromise): number => {
  const babe = api.consts.babe;
  const blockTime = babe ? babe.expectedBlockTime : new BN(6000);
  return blockTime.toNumber();
};

/**
 * Get the current block number
 */
export const getCurrentBlockNumber = async (
  api: ApiPromise,
): Promise<number> => {
  return (await api.rpc.chain.getBlock()).block.header.number.toNumber();
};

/**
 * Verify the time since the blockNumber is equal to or less than the maxVerifiedTime.
 * @param challenge
 * @param maxVerifiedTime
 */
export const verifyRecency = (challenge: string, maxVerifiedTime: number) => {
  // Get the timestamp from the challenge
  const timestamp = challenge.split("___")[0];

  if (!timestamp) {
    throw new Error("Invalid challenge");
  }

  const currentTimestamp = Date.now();
  const challengeTimestamp = Number.parseInt(timestamp, 10);
  return currentTimestamp - challengeTimestamp <= maxVerifiedTime;
};
