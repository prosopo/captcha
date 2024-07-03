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
const ONE_MINUTE = 60 * 1000
// The timeframe in which a user must complete an image captcha (1 minute)
export const DEFAULT_IMAGE_CAPTCHA_TIMEOUT = ONE_MINUTE
// The timeframe in which an image captcha solution remains valid on the page before timing out (2 minutes)
export const DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT = DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 2
// The timeframe in which an image captcha solution must be verified within (3 minutes)
export const DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT = DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 3
// The time in milliseconds that a cached, verified, image captcha solution is valid for (15 minutes)
export const DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED = DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 15
// The timeframe in which a pow captcha solution remains valid on the page before timing out (1 minute)
export const DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT = ONE_MINUTE
// The timeframe in which a pow captcha must be completed and verified (2 minutes)
export const DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT = DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT * 2
// The time in milliseconds that a Provider cached, verified, pow captcha solution is valid for (3 minutes)
export const DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT = DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT * 3
// The time in milliseconds since the last correct captcha recorded in the contract (15 minutes), after which point, the
// user will be required to complete another captcha
export const DEFAULT_MAX_VERIFIED_TIME_CONTRACT = ONE_MINUTE * 15
