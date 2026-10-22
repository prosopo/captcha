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

//! Replays rust/equivalence/vectors.json, recorded from the TS by generate.ts. Errors are
//! compared as generate.ts describes them: class, translation key, context and the error
//! they wrap. Where the TS sorts a caller's array in place, the array after the call is
//! compared too.

use crate::*;
use prosopo_common::{ContextValue, ProsopoError, ThrownError};
use prosopo_logger::ErrorObject;
use prosopo_types::api_types::{CaptchaSolution, SolutionRecord};
use prosopo_types::datasets::{Captcha, CaptchaItem, DatasetRaw, SolutionEntry};
use prosopo_util_crypto::JoinValue;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

const VECTORS: &str = include_str!("equivalence/vectors.json");

static DATA: LazyLock<Value> =
    LazyLock::new(|| serde_json::from_str(VECTORS).expect("vectors.json parses"));

fn section(name: &str) -> &'static Vec<Value> {
    DATA[name]
        .as_array()
        .unwrap_or_else(|| panic!("no section {name}"))
}

fn merkle(name: &str) -> &'static Value {
    &DATA["merkle"][name]
}

fn list(value: &Value) -> &Vec<Value> {
    value
        .as_array()
        .unwrap_or_else(|| panic!("expected an array: {value}"))
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

fn number(value: &Value) -> f64 {
    value
        .as_f64()
        .unwrap_or_else(|| panic!("expected a number: {value}"))
}

fn strings(value: &Value) -> Vec<String> {
    list(value)
        .iter()
        .map(|item| text(item).to_string())
        .collect()
}

fn decode<T: serde::de::DeserializeOwned>(value: &Value) -> T {
    serde_json::from_value(value.clone()).unwrap_or_else(|error| panic!("{error}: {value}"))
}

fn encode<T: serde::Serialize>(value: &T) -> Value {
    serde_json::to_value(value).expect("serialises")
}

/// The value with every object's keys sorted, for comparisons where key order is not
/// observable.
fn sorted(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            Value::Object(
                keys.into_iter()
                    .map(|key| (key.clone(), sorted(&map[key])))
                    .collect(),
            )
        }
        Value::Array(items) => Value::Array(items.iter().map(sorted).collect()),
        other => other.clone(),
    }
}

fn describe_plain(error: &ErrorObject) -> Value {
    json!({ "class": error.name, "message": plain_message(error) })
}

fn describe_thrown(error: &ThrownError) -> Value {
    match error {
        ThrownError::Prosopo(error) => describe_prosopo(error),
        ThrownError::Zod(error) => json!({ "class": "ZodError", "issues": error.issues }),
        ThrownError::Other(error) => describe_plain(error),
    }
}

fn describe_prosopo(error: &ProsopoError) -> Value {
    let mut described: Map<String, Value> = Map::new();
    described.insert("class".into(), json!(error.error_type()));
    described.insert("key".into(), json!(error.translation_key()));
    let mut context: Map<String, Value> = Map::new();
    let mut wrapped: Option<Value> = None;
    if let Some(entries) = error.context() {
        for (key, value) in entries.entries() {
            match (key, value) {
                ("error", ContextValue::Json(Value::String(error))) => {
                    wrapped = Some(json!({ "string": error }))
                }
                ("error", ContextValue::Thrown(error)) => wrapped = Some(describe_thrown(error)),
                (key, value) => {
                    context.insert(key.to_string(), value.to_json());
                }
            }
        }
    }
    described.insert("context".into(), Value::Object(context));
    if let Some(wrapped) = wrapped {
        described.insert("error".into(), wrapped);
    }
    Value::Object(described)
}

fn describe(error: &DatasetsError) -> Value {
    match error {
        DatasetsError::Prosopo(error) => describe_prosopo(error),
        DatasetsError::Plain(error) => describe_plain(error),
    }
}

fn outcome<T>(result: &Result<T>, ok: impl FnOnce(&T) -> Value) -> Value {
    match result {
        Ok(value) => json!({ "result": ok(value) }),
        Err(error) => json!({ "error": describe(error) }),
    }
}

fn join_json(value: &JoinValue) -> Value {
    match value {
        JoinValue::Nullish => Value::Null,
        JoinValue::Bool(flag) => json!(flag),
        JoinValue::Number(n) => json!(n),
        JoinValue::String(s) => json!(s),
        JoinValue::Array(items) => Value::Array(items.iter().map(join_json).collect()),
    }
}

/// Numbers compare by value: the TS writes `45`, a Rust `f64` serialises as `45.0`.
fn same_numbers(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => x.as_f64() == y.as_f64(),
        (Value::Array(x), Value::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y).all(|(x, y)| same_numbers(x, y))
        }
        (Value::Object(x), Value::Object(y)) => {
            x.len() == y.len()
                && x.iter()
                    .zip(y)
                    .all(|((kx, vx), (ky, vy))| kx == ky && same_numbers(vx, vy))
        }
        (x, y) => x == y,
    }
}

// ---------------------------------------------------------------- merkle

fn tree_state(tree: &CaptchaMerkleTree) -> Value {
    json!({
        "leaves": encode(&tree.leaves),
        "layers": tree.layers,
        "root": encode(&tree.root),
    })
}

fn check_proofs(tree: &CaptchaMerkleTree, proofs: &Value, context: &str) {
    for case in list(proofs) {
        let leaf: &str = text(&case["leaf"]);
        let proof: Result<Vec<Vec<String>>> = tree.proof(leaf);
        assert_eq!(
            case["proof"],
            outcome(&proof, |proof| json!(proof)),
            "{context}: proof of {leaf:?}"
        );
        if let (Ok(proof), Some(root)) = (&proof, &tree.root) {
            assert_eq!(
                case["verified"],
                json!({
                    "root": verify_proof(leaf, proof, &root.hash),
                    "wrongRoot": verify_proof(leaf, proof, &format!("{}0", root.hash)),
                }),
                "{context}: {leaf:?}"
            );
        }
    }
}

#[test]
fn merkle_builds_match_the_ts() {
    for case in list(merkle("builds")) {
        let leaves: Vec<String> = strings(&case["leaves"]);
        let mut tree: CaptchaMerkleTree = CaptchaMerkleTree::new();
        tree.build(&leaves).expect("builds");
        assert_eq!(case["state"], tree_state(&tree), "{leaves:?}");
        check_proofs(&tree, &case["proofs"], &format!("{leaves:?}"));
    }
}

/// Deviation, best-effort per MIGRATION.md §0: the TS recurses forever on no leaves and
/// throws `RangeError: Maximum call stack size exceeded`; the Rust returns an error saying
/// why. Every caller rejects an empty list before building, and the one that does not
/// (`buildCaptchaTree`) turns any error into `DATASET.HASH_ERROR`.
#[test]
fn building_with_no_leaves_fails_as_in_the_ts() {
    assert_eq!(merkle("emptyBuild")["error"]["class"], json!("RangeError"));
    assert!(CaptchaMerkleTree::new().build(&[]).is_err());
}

#[test]
fn merkle_rebuilds_match_the_ts() {
    for case in list(merkle("rebuilds")) {
        let mut tree: CaptchaMerkleTree = CaptchaMerkleTree::new();
        tree.build(&strings(&case["first"])).expect("builds");
        tree.build(&strings(&case["second"])).expect("builds");
        assert_eq!(case["state"], tree_state(&tree), "{case}");
        check_proofs(&tree, &case["proofs"], "rebuild");
    }
}

#[test]
fn an_unbuilt_tree_fails_as_in_the_ts() {
    let tree: CaptchaMerkleTree = CaptchaMerkleTree::new();
    let fresh: &Value = merkle("fresh");
    assert_eq!(
        fresh["getRoot"],
        outcome(&tree.get_root(), |root| encode(root))
    );
    assert_eq!(
        fresh["proof"],
        outcome(&tree.proof("a"), |proof| json!(proof))
    );
}

#[test]
fn merkle_hydrations_match_the_ts() {
    for case in list(merkle("hydrations")) {
        let layers: Vec<Vec<String>> = decode(&case["layers"]);
        let mut tree: CaptchaMerkleTree = CaptchaMerkleTree::new();
        let hydrated: Result<()> = tree.hydrate_from_layers(layers.clone());
        assert_eq!(
            case["hydrated"],
            outcome(&hydrated, |_| Value::Null),
            "{layers:?}"
        );
        assert_eq!(case["state"], tree_state(&tree), "{layers:?}");
        check_proofs(&tree, &case["proofs"], &format!("{layers:?}"));
    }
}

#[test]
fn proof_verification_matches_the_ts() {
    let cases: &Vec<Value> = list(merkle("verify"));
    for case in cases {
        let proof: Vec<Vec<String>> = decode(&case["proof"]);
        let result: bool = verify_proof(text(&case["leaf"]), &proof, text(&case["root"]));
        assert_eq!(case["result"], json!(result), "{case}");
    }
    assert_eq!(cases.len(), 70);
}

// ---------------------------------------------------------------- hashing and matching

#[test]
fn captcha_hashes_match_the_ts() {
    let cases: &Vec<Value> = section("captchaHashes");
    for case in cases {
        let captcha: &Value = &case["captcha"];
        let items: Vec<CaptchaItem> = decode(&captcha["items"]);
        let mut solution: Option<Vec<SolutionEntry>> = captcha.get("solution").map(decode);
        let result: Result<String> = compute_captcha_hash(
            CaptchaHashInput {
                target: text(&captcha["target"]),
                salt: text(&captcha["salt"]),
                items: &items,
                solution: solution.as_deref_mut(),
            },
            case["includeSolution"] == json!(true),
            case["includeSalt"] == json!(true),
            case["sortItemHashes"] == json!(true),
        );
        assert_eq!(
            case["result"],
            outcome(&result, |hash| json!(hash)),
            "{case}"
        );
        assert_eq!(case["after"], encode(&solution), "solution after {case}");
    }
    assert_eq!(cases.len(), 640);
}

#[test]
fn solution_values_match_the_ts() {
    for case in section("solutionValues") {
        let mut solution: Option<Vec<SolutionEntry>> =
            (!case["solution"].is_null()).then(|| decode(&case["solution"]));
        let values: Vec<JoinValue> = get_solution_value_to_hash(solution.as_deref_mut());
        let values: Vec<Value> = values.iter().map(join_json).collect();
        assert!(same_numbers(&case["result"], &json!(values)), "{case}");
    }
}

#[test]
fn item_matching_matches_the_ts() {
    for case in section("matches") {
        let solutions: Vec<SolutionEntry> = decode(&case["solutions"]);
        let items: Option<Vec<CaptchaItem>> =
            (case["itemsUndefined"] == json!(false)).then(|| decode(&case["items"]));
        let result: Result<Vec<String>> = match_items_to_solutions(&solutions, items.as_deref());
        assert_eq!(
            case["result"],
            outcome(&result, |hashes| json!(hashes)),
            "{case}"
        );
    }
}

// ---------------------------------------------------------------- parsing

/// Values are compared exactly and key order is not: `parseCaptchaDataset` spreads each
/// captcha, so a `solution` absent from the file lands last rather than in schema order. No
/// caller serialises this value; `storeDataset` re-parses the built dataset into schema order
/// before writing it, and that stored form is compared byte for byte below.
#[test]
fn parsed_datasets_match_the_ts() {
    for case in section("parsedDatasets") {
        let result: Result<DatasetRaw<String>> = parse_captcha_dataset(&case["input"]);
        let rust: Value = outcome(&result, encode);
        assert_eq!(sorted(&case["result"]), sorted(&rust), "{}", case["input"]);
    }
}

#[test]
fn parsed_solutions_match_the_ts() {
    for case in section("parsedSolutions") {
        let result: Result<Vec<CaptchaSolution>> = parse_and_sort_captcha_solutions(&case["input"]);
        assert_eq!(
            case["result"],
            outcome(&result, encode),
            "{}",
            case["input"]
        );
    }
}

// ---------------------------------------------------------------- comparison

#[test]
fn solution_comparisons_match_the_ts() {
    let cases: &Vec<Value> = section("comparisons");
    for case in cases {
        let mut received: Vec<CaptchaSolution> = decode(&case["received"]);
        let mut solutions: Vec<SolutionRecord> = decode(&case["solutions"]);
        let result: bool = compare_captcha_solutions(
            &mut received,
            &mut solutions,
            number(&case["totalImages"]),
            number(&case["threshold"]),
        );
        assert_eq!(case["result"], json!(result), "{case}");
        assert_eq!(
            case["receivedAfter"],
            encode(&received),
            "received after {case}"
        );
        assert_eq!(
            case["solutionsAfter"],
            encode(&solutions),
            "solutions after {case}"
        );
    }
    assert_eq!(cases.len(), 300);
}

/// The TS destructures a stored captcha with `items = []`; the Rust type always has items, so
/// a record without them is given the same empty list before the comparison.
fn with_items(stored: &Value) -> Value {
    let mut stored: Value = stored.clone();
    for captcha in stored.as_array_mut().expect("an array") {
        let captcha: &mut Map<String, Value> = captcha.as_object_mut().expect("an object");
        captcha.entry("items").or_insert(json!([]));
    }
    stored
}

#[test]
fn sort_and_compute_hashes_matches_the_ts() {
    for case in section("sortAndHash") {
        let mut received: Vec<CaptchaSolution> = decode(&case["received"]);
        let mut stored: Vec<Captcha> = decode(&with_items(&case["stored"]));
        let result: Result<Vec<CaptchaIdHash>> =
            sort_and_compute_hashes(&mut received, &mut stored);
        assert_eq!(case["result"], outcome(&result, encode), "{case}");
        assert_eq!(
            case["receivedAfter"],
            encode(&received),
            "received after {case}"
        );
        assert_eq!(
            sorted(&with_items(&case["storedAfter"])),
            sorted(&encode(&stored)),
            "stored after {case}"
        );
    }
}

#[test]
fn solution_hashes_match_the_ts() {
    for case in section("solutionHashes") {
        let captcha: CaptchaSolution = decode(&case["captcha"]);
        assert_eq!(
            case["result"],
            json!(compute_captcha_solution_hash(&captcha)),
            "{case}"
        );
        assert_eq!(case["after"], encode(&captcha));
    }
}

#[test]
fn pending_request_hashes_match_the_ts() {
    for case in section("pendingHashes") {
        let mut ids: Vec<String> = strings(&case["captchaIds"]);
        let account: JoinValue = match &case["userAccount"] {
            Value::String(account) => JoinValue::from(account.as_str()),
            Value::Array(bytes) => {
                JoinValue::Array(bytes.iter().map(|b| JoinValue::Number(number(b))).collect())
            }
            other => panic!("unexpected account {other}"),
        };
        let result: String = compute_pending_request_hash(&mut ids, account, text(&case["salt"]));
        assert_eq!(case["result"], json!(result), "{case}");
        assert_eq!(case["after"], json!(ids), "ids after {case}");
    }
}

// ---------------------------------------------------------------- assets

struct MappedResolver(HashMap<String, String>);

impl AssetsResolver for MappedResolver {
    fn resolve_asset_url(&self, data: &str) -> std::result::Result<String, String> {
        Ok(self
            .0
            .get(data)
            .cloned()
            .unwrap_or_else(|| data.to_uppercase()))
    }
}

#[test]
fn asset_resolution_matches_the_ts() {
    for case in section("assetResolutions") {
        let item: CaptchaItem = decode(&case["item"]);
        let resolver: Option<MappedResolver> =
            (!case["mapping"].is_null()).then(|| MappedResolver(decode(&case["mapping"])));
        let resolved: CaptchaItem =
            parse_captcha_assets(&item, resolver.as_ref().map(|r| r as &dyn AssetsResolver))
                .expect("resolves");
        assert_eq!(case["result"], encode(&resolved), "{case}");
    }
}

#[test]
fn asset_token_bases_match_the_ts() {
    for case in section("tokenBases") {
        let client_ip: Option<&str> =
            (case["clientIpUndefined"] == json!(false)).then(|| text(&case["clientIp"]));
        let base: String = asset_token_base(
            text(&case["key"]),
            text(&case["path"]),
            number(&case["expires"]),
            client_ip,
        );
        assert_eq!(text(&case["result"]), base, "{case}");
    }
}

#[test]
fn asset_token_encodings_match_the_ts() {
    for case in section("tokenEncodings") {
        let bytes: Vec<u8> = decode(&case["bytes"]);
        assert_eq!(text(&case["result"]), encode_asset_token(&bytes), "{case}");
    }
}

#[test]
fn signed_asset_urls_match_the_ts() {
    let cases: &Vec<Value> = section("signedUrls");
    for case in cases {
        let options: &Value = &case["options"];
        let signed: String = sign_asset_url(
            text(&case["url"]),
            &SignAssetUrlOptions {
                security_key: "test-security-key".to_string(),
                ttl_seconds: options.get("ttlSeconds").map(number),
                client_ip: options.get("clientIp").map(|ip| text(ip).to_string()),
                now_ms: Some(number(&options["now"])),
            },
        );
        assert_eq!(text(&case["result"]), signed, "{case}");
    }
    assert_eq!(cases.len(), 132);
}

fn env_lookup(key: Option<&str>, ttl: Option<&str>) -> impl Fn(&str) -> Option<String> {
    let key: Option<String> = key.map(str::to_string);
    let ttl: Option<String> = ttl.map(str::to_string);
    move |name: &str| match name {
        ASSET_TOKEN_KEY_ENV => key.clone(),
        ASSET_TOKEN_TTL_ENV => ttl.clone(),
        _ => None,
    }
}

#[test]
fn asset_token_options_from_the_environment_match_the_ts() {
    for case in section("envOptions") {
        let options: Option<SignAssetUrlOptions> =
            asset_token_options_from(env_lookup(case["key"].as_str(), case["ttl"].as_str()));
        let rust: Value = options.map_or(Value::Null, |options| {
            json!({ "securityKey": options.security_key, "ttlSeconds": options.ttl_seconds })
        });
        assert!(
            same_numbers(&case["result"], &rust),
            "{case}: Rust gave {rust}"
        );
    }
}

// ---------------------------------------------------------------- building

/// Byte for byte: this is the dataset `storeDataset` writes, the TS's
/// `DatasetWithIdsAndTreeSchema.parse(await buildDataset(raw))`.
#[test]
fn built_datasets_are_stored_byte_for_byte_as_by_the_ts() {
    let cases: &Vec<Value> = section("builtDatasets");
    for case in cases {
        let raw: DatasetRaw<String> = decode(&case["input"]);
        let built: Result<prosopo_types::datasets::DatasetWithIds> = build_dataset(&raw);
        match (&case["stored"].get("result"), &built) {
            (Some(stored), Ok(built)) => assert_eq!(
                serde_json::to_string(stored).expect("serialises"),
                serde_json::to_string(built).expect("serialises"),
                "{}",
                case["input"]
            ),
            _ => assert_eq!(case["stored"], outcome(&built, encode), "{}", case["input"]),
        }
    }
    assert_eq!(cases.len(), 14);
}

// ---------------------------------------------------------------- downloading

/// generate.ts's `fetch`: an unparseable URL is rejected as `fetch` rejects it, `missing` is
/// a 404, `throws` a network failure, anything else a body naming the path.
#[derive(Default)]
struct RecordingFetch(Mutex<Vec<String>>);

impl RecordingFetch {
    fn requests(&self) -> Vec<String> {
        self.0.lock().expect("not poisoned").clone()
    }
}

impl Fetch for RecordingFetch {
    fn get<'a>(&'a self, url: &'a str) -> FetchFuture<'a> {
        Box::pin(async move {
            self.0.lock().expect("not poisoned").push(url.to_string());
            let parsed: url::Url = url::Url::parse(url).map_err(|_| {
                ErrorObject::new("TypeError", format!("Failed to parse URL from {url}"))
            })?;
            if url.contains("missing") {
                return Ok(FetchedResponse {
                    status: 404,
                    body: b"nope".to_vec(),
                });
            }
            if url.contains("throws") {
                return Err(ErrorObject::new("TypeError", "fetch failed"));
            }
            Ok(FetchedResponse {
                status: 200,
                body: format!("bytes of {}", parsed.path()).into_bytes(),
            })
        })
    }
}

#[tokio::test]
async fn item_hashes_match_the_ts() {
    let now: f64 = number(&DATA["itemHashNow"]);
    for case in section("itemHashes") {
        let options: Option<SignAssetUrlOptions> =
            asset_token_options_from(env_lookup(case["key"].as_str(), Some("60"))).map(|options| {
                SignAssetUrlOptions {
                    now_ms: Some(now),
                    ..options
                }
            });
        let Ok(item) = serde_json::from_value::<CaptchaItem>(case["item"].clone()) else {
            assert_eq!(
                case["result"]["error"]["key"],
                json!("CAPTCHA.INVALID_ITEM_FORMAT"),
                "{case}"
            );
            continue;
        };
        let fetch: RecordingFetch = RecordingFetch::default();
        let result: Result<CaptchaItem> =
            compute_item_hash_with(&item, &fetch, options.as_ref()).await;
        assert_eq!(case["result"], outcome(&result, encode), "{case}");
        assert_eq!(case["requests"], json!(fetch.requests()), "{case}");
    }
}

#[tokio::test]
async fn dataset_validation_matches_the_ts() {
    for case in section("validations") {
        let dataset: DatasetRaw<SolutionEntry> = decode(&case["dataset"]);
        let fetch: RecordingFetch = RecordingFetch::default();
        let result: Result<bool> = validate_dataset_content(&dataset, &fetch, None).await;
        assert_eq!(
            case["result"],
            outcome(&result, |valid| json!(valid)),
            "{case}"
        );
        assert_eq!(case["requests"], json!(fetch.requests()), "{case}");
    }
}

#[test]
fn no_solution_value_matches_the_ts() {
    assert_eq!(DATA["noSolutionValue"], json!(NO_SOLUTION_VALUE));
}
