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

// For testing purposes, provide a mock implementation since the obfuscated code
// may not work in test environments. The real implementation is in index.js
export const detect = (...args: any[]) => {
  // Simulate the obfuscated code behavior - may succeed or fail
  return Promise.resolve({
    token: 'test-token',
    encryptHeadHash: 'test-hash',
    shadowDomCleanup: () => {
      // Mock cleanup function
    }
  });
};
