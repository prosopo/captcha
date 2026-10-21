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

//! Rust port of the server-side subset of `@prosopo/util`.

mod at;
mod cache_file;
mod coords;
mod domain_validation;
mod email;
mod error;
mod fetch_with_etag;
mod hex;
mod ip;
mod js;
mod seeded;
mod solver_service;
mod url;
mod util;
mod verify_recency;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod seeded_equivalence;

pub use crate::at::{at, at_f64, at_optional, at_str, resolve_at_index, AtOptions};
pub use crate::cache_file::{
    cache_file, ensure_dir_exists, get_cached_file_path, get_current_etag,
    get_current_last_modified, purge_old_cache, save_file_with_etag, save_file_with_last_modified,
    CacheFileFetcher, CacheFileLogger, CacheLogEntry, HttpCacheFileFetcher,
};
pub use crate::coords::{
    assert_coords_safe, assert_coords_safe_value, is_valid_coord_scalar, safe_coords_or_undefined,
    safe_coords_or_undefined_value, MAX_PIXEL_COORD,
};
pub use crate::domain_validation::{
    is_domain_safe_for_outbound_request, validate_domain_for_outbound_request,
    DomainValidationResult,
};
pub use crate::email::extract_domain_from_email;
pub use crate::error::UtilError;
pub use crate::fetch_with_etag::{
    fetch_with_etag, fetch_with_last_modified, ByteStream, FetchWithETagResult,
    FetchWithLastModifiedResult, HttpClient, HttpResponse, ReqwestHttpClient,
};
pub use crate::hex::{embed_data, extract_data, u8a_to_hex, u8a_to_hex_with};
pub use crate::ip::{get_ip_address, get_ip_address_from_big_int, Address4, Address6, IpAddress};
pub use crate::js::{number_to_string, parse_int};
pub use crate::seeded::{Rng, SeedRandom, SeededLodash};
pub use crate::solver_service::{hash_meets_difficulty, solve_pow, target_for_difficulty};
pub use crate::url::{
    build_domain_suffix_candidates, decode_google_translate_host, is_protect_deployment, parse_url,
    sanitise_page_url, validate_domain,
};
pub use crate::util::{flatten, version};
pub use crate::verify_recency::{verify_recency, verify_recency_at};
