// Copyright 2021-2026 Prosopo (UK) Ltd.
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

//! config/timeouts.ts, in milliseconds.

const ONE_MINUTE: u64 = 60 * 1000;

pub const DEFAULT_IMAGE_CAPTCHA_TIMEOUT: u64 = ONE_MINUTE;
pub const DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT: u64 = DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 2;
pub const DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT: u64 = DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 3;
pub const DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED: u64 = DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 15;
pub const DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT: u64 = ONE_MINUTE;
pub const DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT: u64 = DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT * 2;
pub const DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT: u64 = DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT * 3;
pub const DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT: u64 = ONE_MINUTE;
pub const DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT: u64 =
    DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT * 2;
pub const DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT: u64 = DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT * 3;
pub const DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT: u64 = ONE_MINUTE;
pub const DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT: u64 = DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT * 2;
pub const DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT: u64 = DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT * 3;
pub const DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT: u64 = ONE_MINUTE * 2;
pub const DEFAULT_ICON_ORDER_CAPTCHA_VERIFIED_TIMEOUT: u64 =
    DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT * 2;
pub const DEFAULT_ICON_ORDER_CAPTCHA_CACHED_TIMEOUT: u64 =
    DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT * 3;
pub const DEFAULT_MAX_VERIFIED_TIME_CONTRACT: u64 = ONE_MINUTE * 15;
pub const DEFAULT_MAX_TIMESTAMP_AGE: u64 = ONE_MINUTE * 10;
pub const DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS: u64 = 10 * 1000;

/// Every timeout by its TS name.
pub const TIMEOUTS: [(&str, u64); 19] = [
    (
        "DEFAULT_IMAGE_CAPTCHA_TIMEOUT",
        DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
    ),
    (
        "DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT",
        DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
    ),
    (
        "DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT",
        DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
    ),
    (
        "DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED",
        DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
    ),
    (
        "DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT",
        DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
    ),
    (
        "DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT",
        DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
    ),
    (
        "DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT",
        DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
    ),
    (
        "DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT",
        DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT,
    ),
    (
        "DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT",
        DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT,
    ),
    (
        "DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT",
        DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT,
    ),
    (
        "DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT",
        DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT,
    ),
    (
        "DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT",
        DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT,
    ),
    (
        "DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT",
        DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT,
    ),
    (
        "DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT",
        DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT,
    ),
    (
        "DEFAULT_ICON_ORDER_CAPTCHA_VERIFIED_TIMEOUT",
        DEFAULT_ICON_ORDER_CAPTCHA_VERIFIED_TIMEOUT,
    ),
    (
        "DEFAULT_ICON_ORDER_CAPTCHA_CACHED_TIMEOUT",
        DEFAULT_ICON_ORDER_CAPTCHA_CACHED_TIMEOUT,
    ),
    (
        "DEFAULT_MAX_VERIFIED_TIME_CONTRACT",
        DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
    ),
    ("DEFAULT_MAX_TIMESTAMP_AGE", DEFAULT_MAX_TIMESTAMP_AGE),
    (
        "DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS",
        DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS,
    ),
];

/// The comment the TS gives a timeout, for the generated TypeScript.
pub const TIMEOUT_DOCS: [(&str, &str); 17] = [
    (
        "DEFAULT_IMAGE_CAPTCHA_TIMEOUT",
        "The timeframe in which a user must complete an image captcha (1 minute)",
    ),
    (
        "DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT",
        "The timeframe in which an image captcha solution remains valid on the page before timing out (2 minutes)",
    ),
    (
        "DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT",
        "The timeframe in which an image captcha solution must be verified within (3 minutes)",
    ),
    (
        "DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED",
        "The time in milliseconds that a cached, verified, image captcha solution is valid for (15 minutes)",
    ),
    (
        "DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT",
        "The timeframe in which a pow captcha solution remains valid on the page before timing out (1 minute)",
    ),
    (
        "DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT",
        "The timeframe in which a pow captcha must be completed and verified (2 minutes)",
    ),
    (
        "DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT",
        "The time in milliseconds that a Provider cached, verified, pow captcha solution is valid for (3 minutes)",
    ),
    (
        "DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT",
        "The timeframe in which a puzzle captcha solution remains valid on the page before timing out (1 minute)",
    ),
    (
        "DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT",
        "The timeframe in which a puzzle captcha must be completed and verified (2 minutes)",
    ),
    (
        "DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT",
        "The time in milliseconds that a Provider cached, verified, puzzle captcha solution is valid for (3 minutes)",
    ),
    (
        "DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT",
        "The timeframe in which an audio captcha solution remains valid on the page before timing out (1 minute)",
    ),
    (
        "DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT",
        "The timeframe in which an audio captcha must be completed and verified (2 minutes)",
    ),
    (
        "DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT",
        "The time in milliseconds that a Provider cached, verified, audio captcha solution is valid for (3 minutes)",
    ),
    (
        "DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT",
        "Double the puzzle's solution window, since finding and clicking several\nicons takes longer than one drag; the other windows keep the puzzle's\nmultiples of it.",
    ),
    (
        "DEFAULT_MAX_VERIFIED_TIME_CONTRACT",
        "The time in milliseconds since the last correct captcha recorded in the contract (15 minutes), after which point, the\nuser will be required to complete another captcha",
    ),
    (
        "DEFAULT_MAX_TIMESTAMP_AGE",
        "How old a detector payload may be before the frictionless flow penalises it\nas stale (10 minutes). This is the window in which a payload is still worth\nreading, so it is also the window in which the provider must keep the key\nthat reads it — see `DETECTOR_BUNDLE_TTL_SECONDS`, which is derived from this\nrather than set independently. A binding shorter than this makes the provider\naccept payloads it has already thrown away the means to decrypt.",
    ),
    (
        "DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS",
        "How long @prosopo/server waits for a provider to answer a verify call (10 seconds)",
    ),
];
