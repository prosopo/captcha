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

//! tasks/captchaTypeSelection.ts: holding a decided captcha type to what the site permits and
//! this provider can render.

use prosopo_logger::{LogRecord, Logger};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::settings::{resolve_allowed_captcha_types, AllowedTypes};
use serde_json::json;

/// `isPuzzleRenderAvailable`: backgrounds are synthesised in-process, so always.
pub const PUZZLE_RENDER_AVAILABLE: bool = true;

/// `coerceToEnabledCaptchaType`: `requested` if allowed, otherwise the other interactive type
/// if that is, otherwise PoW. Only ever narrows. `allowed` absent means the defaults.
pub fn coerce_to_enabled_captcha_type(requested: CaptchaType, allowed: Option<AllowedTypes>, logger: Option<&Logger>) -> CaptchaType {
    let types: AllowedTypes = allowed.unwrap_or_else(|| resolve_allowed_captcha_types(None));
    let puzzle_allowed: bool = types.puzzle && PUZZLE_RENDER_AVAILABLE;
    let image_or_pow: CaptchaType = if types.image { CaptchaType::Image } else { CaptchaType::Pow };
    let resolved: CaptchaType = match requested {
        CaptchaType::Puzzle if puzzle_allowed => CaptchaType::Puzzle,
        CaptchaType::Puzzle => image_or_pow,
        CaptchaType::Image if types.image => CaptchaType::Image,
        CaptchaType::Image if puzzle_allowed => CaptchaType::Puzzle,
        CaptchaType::Image => CaptchaType::Pow,
        CaptchaType::IconOrder if types.icon_order => CaptchaType::IconOrder,
        CaptchaType::IconOrder if puzzle_allowed => CaptchaType::Puzzle,
        CaptchaType::IconOrder => image_or_pow,
        other => other,
    };
    if resolved != requested {
        if let Some(logger) = logger {
            logger.info(|| {
                LogRecord::msg("Captcha type coerced to an enabled type").with_data(json!({
                    "requested": requested.as_str(),
                    "served": resolved.as_str(),
                    "imageEnabled": types.image,
                    "puzzleEnabled": types.puzzle,
                    "puzzleRenderable": PUZZLE_RENDER_AVAILABLE,
                    "iconOrderEnabled": types.icon_order,
                }))
            });
        }
    }
    resolved
}
