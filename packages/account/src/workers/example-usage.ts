// Copyright 2021-2025 Prosopo (UK) Ltd.
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

/**
 * Example usage demonstrating how the Web Worker implementation works
 */

/*
import { getCryptoWorkerManager } from './workers/index.js';
import { stringToU8a } from '@polkadot/util';

// Example usage:
async function exampleUsage() {
  try {
    const workerManager = getCryptoWorkerManager();

    // Convert string entropy to Uint8Array
    const entropy = stringToU8a('some entropy string here');

    // This will now run in a Web Worker and not block the main thread
    const mnemonic = await workerManager.entropyToMnemonic(entropy);

    console.log('Generated mnemonic:', mnemonic);

    // Clean up when done
    workerManager.dispose();
  } catch (error) {
    console.error('Failed to generate mnemonic:', error);
  }
}

// The ExtensionWeb2 class now automatically uses the Web Worker:
async function createAccountExample() {
  const extension = new ExtensionWeb2();

  // This createAccount call will now use Web Worker for entropyToMnemonic
  // and fallback to main thread if the worker fails
  const account = await extension.getAccount(config);

  return account;
}
*/
