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

/// `PUZZLE_REFRESHES_BEFORE_IMAGE`.
pub const PUZZLE_REFRESHES_BEFORE_IMAGE: f64 = 3.0;

/// `switchTypeAfterRefreshes`: a puzzle becomes an image challenge after three refreshes in a
/// row, on a site that may serve image challenges.
pub fn switch_type_after_refreshes(resolved: CaptchaType, refresh_count: Option<f64>, allowed: Option<&serde_json::Value>) -> CaptchaType {
    if resolved == CaptchaType::Puzzle && refresh_count.unwrap_or(0.0) >= PUZZLE_REFRESHES_BEFORE_IMAGE && prosopo_types::settings::resolve_frictionless_types(allowed).image {
        CaptchaType::Image
    } else {
        resolved
    }
}

/// `switchTypeOnUserRequest`: a puzzle becomes an image challenge when the user asks, on a site
/// that may serve image challenges.
pub fn switch_type_on_user_request(resolved: CaptchaType, switch_to_image: bool, allowed: Option<&serde_json::Value>) -> CaptchaType {
    if resolved == CaptchaType::Puzzle && switch_to_image && prosopo_types::settings::resolve_frictionless_types(allowed).image {
        CaptchaType::Image
    } else {
        resolved
    }
}

/// `resolveSiteAllowedCaptchaTypes`: the owner's `frictionlessTypes` count only for a
/// frictionless site; a site pinned to a type is held to the feature flags alone.
pub fn resolve_site_allowed_captcha_types(settings: Option<&serde_json::Value>) -> AllowedTypes {
    let mut narrowed: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    if let Some(flags) = settings.and_then(|settings| settings.get("captchaTypeFeatureFlags")) {
        narrowed.insert("captchaTypeFeatureFlags".to_string(), flags.clone());
    }
    let captcha_type = settings.and_then(|settings| settings.get("captchaType")).and_then(serde_json::Value::as_str).filter(|value| !value.is_empty());
    if captcha_type.is_none_or(|captcha_type| captcha_type == CaptchaType::Frictionless.as_str()) {
        if let Some(types) = settings.and_then(|settings| settings.get("frictionlessTypes")) {
            narrowed.insert("frictionlessTypes".to_string(), types.clone());
        }
    }
    resolve_allowed_captcha_types(Some(&serde_json::Value::Object(narrowed)))
}

/// The allowed types as the `IFrictionlessTypes` object the TS passes around.
pub fn allowed_types_json(allowed: AllowedTypes) -> serde_json::Value {
    json!({ "image": allowed.image, "puzzle": allowed.puzzle, "iconOrder": allowed.icon_order })
}
