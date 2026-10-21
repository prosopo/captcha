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

//! The api-express-router unit tests of the TS, each against the axum layers by request. The
//! TS drives express doubles; here a request goes through the real router.

use crate::{
    auth_middleware, create_router, error_response, i18n_middleware, request_logger_middleware, verify_signature, AdminKey,
    AuthMiddlewareOptions, AuthState, DefaultEndpointAdapter, EndpointAdapter, JwtReplayGuard, MemoryJwtReplayGuard, RequestBody,
    RequestI18n, RequestLog,
};
use axum::body::Body;
use axum::extract::Request;
use axum::middleware::{from_fn, from_fn_with_state, Next};
use axum::response::Response;
use axum::routing::post;
use axum::Router;
use http::{HeaderMap, Method, StatusCode};
use http_body_util::BodyExt;
use indexmap::IndexMap;
use prosopo_api_route::schema::{coerce_number, number, object, string, Schema};
use prosopo_api_route::{
    ApiEndpoint, ApiEndpointError, ApiEndpointResponse, ApiEndpointResponseStatus, ApiRoutes, ApiRoutesProvider, DynApiEndpoint, NoArgs,
    Validate, ValidationError,
};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError};
use prosopo_locale::{default_locales_directory, I18n};
use prosopo_logger::{get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger, Sink, SystemClock};
use prosopo_util_crypto::jwt::{JwtVerifyOptions, JwtVerifyResult};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use tower::ServiceExt;

static I18N: LazyLock<Arc<I18n>> = LazyLock::new(|| Arc::new(I18n::load(&default_locales_directory())));

struct Answer {
    status: StatusCode,
    headers: HeaderMap,
    reason: Option<String>,
    text: String,
}

impl Answer {
    fn json(&self) -> Value {
        serde_json::from_str(&self.text).expect("a JSON body")
    }
}

async fn send(router: Router, request: Request) -> Answer {
    let response: Response = router.oneshot(request).await.expect("answers");
    let status: StatusCode = response.status();
    let headers: HeaderMap = response.headers().clone();
    let reason: Option<String> = response.extensions().get::<hyper::ext::ReasonPhrase>().map(|phrase| String::from_utf8_lossy(phrase.as_bytes()).into_owned());
    let bytes = response.into_body().collect().await.expect("a body").to_bytes();
    Answer {
        status,
        headers,
        reason,
        text: String::from_utf8_lossy(&bytes).into_owned(),
    }
}

/// A POST to `path`, with the body the JSON parser would have left.
fn post_to(path: &str, body: Option<Value>) -> Request {
    let mut request: Request = Request::builder().method(Method::POST).uri(path).body(Body::empty()).expect("a request");
    if let Some(body) = body {
        request.extensions_mut().insert(RequestBody(body));
    }
    request
}

#[derive(Default)]
struct Lines(Mutex<Vec<(ConsoleMethod, String)>>);

impl Sink for Lines {
    fn write(&self, method: ConsoleMethod, line: &str) {
        self.0.lock().expect("lock").push((method, line.to_string()));
    }
}

impl Lines {
    fn of(&self, method: ConsoleMethod) -> Vec<Value> {
        self.0
            .lock()
            .expect("lock")
            .iter()
            .filter(|(logged, _)| *logged == method)
            .filter_map(|(_, line)| serde_json::from_str(line).ok())
            .collect()
    }
}

fn capturing(lines: &Arc<Lines>, scope: &str) -> Logger {
    get_logger_with_runtime(
        LogLevel::Debug,
        scope,
        LogRuntime {
            sink: lines.clone(),
            clock: Arc::new(SystemClock),
            directives: Arc::new(DirectiveStore::new("")),
        },
    )
}

/// Puts a capturing request logger on every request, as the request logger layer would.
fn with_request_log(router: Router, lines: Arc<Lines>) -> Router {
    router.layer(from_fn(move |mut request: Request, next: Next| {
        let logger: Logger = capturing(&lines, "provider:request");
        async move {
            request.extensions_mut().insert(RequestLog {
                logger,
                request_id: "r-1".to_string(),
            });
            next.run(request).await
        }
    }))
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
struct Count {
    count: f64,
}

static COUNT_SCHEMA: LazyLock<Schema> = LazyLock::new(|| object(vec![("count", coerce_number())]));
static STRICT_COUNT_SCHEMA: LazyLock<Schema> = LazyLock::new(|| object(vec![("count", number())]));
static OPTIONAL_SCHEMA: LazyLock<Schema> = LazyLock::new(|| object(vec![("a", string())]).optional());

impl Validate for Count {
    fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
        COUNT_SCHEMA.validate(input)
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
struct StrictCount {
    count: f64,
}

impl Validate for StrictCount {
    fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
        STRICT_COUNT_SCHEMA.validate(input)
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
struct MaybeA(Option<Value>);

impl Validate for MaybeA {
    fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
        OPTIONAL_SCHEMA.validate(input).map(|output| if input.is_none() { Value::Null } else { output })
    }
}

type Outcome = Result<ApiEndpointResponse, ApiEndpointError>;

/// An endpoint that keeps the args and logger scope it was called with and answers with
/// `outcome`.
struct Probe<A> {
    calls: Mutex<Vec<(A, Option<String>)>>,
    outcome: Box<dyn Fn() -> Outcome + Send + Sync>,
}

impl<A> Probe<A> {
    fn answering(outcome: impl Fn() -> Outcome + Send + Sync + 'static) -> Arc<Probe<A>> {
        Arc::new(Probe {
            calls: Mutex::new(Vec::new()),
            outcome: Box::new(outcome),
        })
    }

    fn calls(&self) -> usize {
        self.calls.lock().expect("lock").len()
    }
}

fn success() -> Outcome {
    Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success))
}

impl<A: prosopo_api_route::RequestArgs + Clone + Send + Sync> ApiEndpoint for Probe<A> {
    type Args = A;

    async fn process_request(&self, args: A, logger: Option<&Logger>) -> Outcome {
        self.calls.lock().expect("lock").push((args, logger.map(|logger| logger.get_scope().to_string())));
        (self.outcome)()
    }
}

/// A route table, counting how often it is asked for.
struct Routes {
    routes: ApiRoutes,
    asked: AtomicUsize,
}

impl Routes {
    fn of(routes: Vec<(&str, Arc<dyn DynApiEndpoint>)>) -> Routes {
        Routes {
            routes: routes.into_iter().map(|(path, endpoint)| (path.to_string(), endpoint)).collect::<IndexMap<String, Arc<dyn DynApiEndpoint>>>(),
            asked: AtomicUsize::new(0),
        }
    }
}

impl ApiRoutesProvider for Routes {
    fn get_routes(&self) -> ApiRoutes {
        self.asked.fetch_add(1, Ordering::SeqCst);
        self.routes.clone()
    }
}

fn adapter(error_status_code: Option<u16>) -> Arc<dyn EndpointAdapter> {
    Arc::new(DefaultEndpointAdapter::new(LogLevel::Info, error_status_code))
}

fn router_for(endpoint: Arc<dyn DynApiEndpoint>, error_status_code: Option<u16>) -> Router {
    create_router(&Routes::of(vec![("/endpoint", endpoint)]), adapter(error_status_code))
}

fn failure(message: &str) -> ApiEndpointError {
    Box::new(std::io::Error::other(message.to_string()))
}

/// apiExpressDefaultEndpointAdapter.unit.test.ts.
mod adapter {
    use super::*;

    #[tokio::test]
    async fn parses_the_body_and_passes_the_parsed_value_on() {
        let probe: Arc<Probe<Count>> = Probe::answering(success);
        send(router_for(probe.clone(), None), post_to("/endpoint", Some(json!({ "count": "5" })))).await;
        assert_eq!(probe.calls.lock().expect("lock")[0].0, Count { count: 5.0 });
    }

    #[tokio::test]
    async fn an_endpoint_without_a_schema_is_called_without_args() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(success);
        send(router_for(probe.clone(), None), post_to("/endpoint", Some(json!({ "ignored": true })))).await;
        assert_eq!(probe.calls(), 1);
    }

    #[tokio::test]
    async fn hands_the_endpoint_the_request_logger() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(success);
        let router: Router = with_request_log(router_for(probe.clone(), None), Arc::new(Lines::default()));
        send(router, post_to("/endpoint", None)).await;
        assert_eq!(probe.calls.lock().expect("lock")[0].1.as_deref(), Some("provider:request"));
    }

    #[tokio::test]
    async fn answers_with_the_endpoint_response_as_json() {
        let probe: Arc<Probe<NoArgs>> =
            Probe::answering(|| Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success).with_data(json!({ "value": 1 }))));
        let answer: Answer = send(router_for(probe, None), post_to("/endpoint", None)).await;
        assert_eq!(answer.status, StatusCode::OK);
        assert_eq!(answer.text, r#"{"status":"SUCCESS","data":{"value":1}}"#);
        assert_eq!(answer.headers.get("content-type").and_then(|value| value.to_str().ok()), Some("application/json; charset=utf-8"));
    }

    #[tokio::test]
    async fn passes_an_empty_data_payload_straight_through() {
        let probe: Arc<Probe<NoArgs>> =
            Probe::answering(|| Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success).with_data(json!({}))));
        let answer: Answer = send(router_for(probe, None), post_to("/endpoint", None)).await;
        assert_eq!(answer.json(), json!({ "status": "SUCCESS", "data": {} }));
    }

    #[tokio::test]
    async fn an_absent_body_is_still_handed_to_the_schema() {
        let probe: Arc<Probe<MaybeA>> = Probe::answering(success);
        let answer: Answer = send(router_for(probe.clone(), None), post_to("/endpoint", None)).await;
        assert_eq!(probe.calls.lock().expect("lock")[0].0, MaybeA(None));
        assert_eq!(answer.json(), json!({ "status": "SUCCESS" }));
    }

    #[tokio::test]
    async fn a_rejected_body_is_a_400_parse_error_carrying_the_issues_and_the_endpoint_is_not_called() {
        let probe: Arc<Probe<StrictCount>> = Probe::answering(success);
        let answer: Answer = send(router_for(probe.clone(), None), post_to("/endpoint", Some(json!({ "count": "not a number" })))).await;
        assert_eq!(probe.calls(), 0);
        assert_eq!(answer.status, StatusCode::BAD_REQUEST);
        let error: Value = answer.json()["error"].clone();
        assert_eq!(error["code"], json!(400));
        assert_eq!(error["key"], json!("API.PARSE_ERROR"));
        assert_eq!(error["message"][0]["path"], json!(["count"]));
        assert_eq!(error["message"][0]["code"], json!("invalid_type"));
    }

    #[tokio::test]
    async fn a_failing_endpoint_is_answered_with_the_adapter_status_and_the_json_envelope() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(|| Err(failure("database down")));
        let answer: Answer = send(router_for(probe, None), post_to("/endpoint", None)).await;
        assert_eq!(answer.status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(answer.json()["error"]["key"], json!("API.UNKNOWN"));
        assert_eq!(answer.json()["error"]["code"], json!(500));
    }

    #[tokio::test]
    async fn does_not_leak_the_failure_message_to_the_client() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(|| Err(failure("connection string: postgres://user:secret@host")));
        let answer: Answer = send(router_for(probe, None), post_to("/endpoint", None)).await;
        assert!(!answer.text.contains("secret"));
    }

    #[tokio::test]
    async fn logs_the_failure_against_the_request_logger() {
        let lines: Arc<Lines> = Arc::new(Lines::default());
        let probe: Arc<Probe<NoArgs>> = Probe::answering(|| Err(failure("database down")));
        send(with_request_log(router_for(probe, None), lines.clone()), post_to("/endpoint", None)).await;
        let errors: Vec<Value> = lines.of(ConsoleMethod::Error);
        assert_eq!(errors.len(), 1);
        assert!(errors[0]["err"].to_string().contains("database down"));
    }

    #[tokio::test]
    async fn answers_with_the_configured_error_status_code() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(|| Err(failure("unavailable")));
        let answer: Answer = send(router_for(probe, Some(503)), post_to("/endpoint", None)).await;
        assert_eq!(answer.status, StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn an_error_carrying_its_own_status_code_keeps_it() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(|| {
            Err(Box::new(ProsopoError::new(
                ErrorClass::Api,
                ErrorSource::key("API.BAD_REQUEST"),
                ErrorOptions {
                    context: Some(ErrorContext::new().with("code", 400)),
                    silent: true,
                    ..ErrorOptions::default()
                },
            )))
        });
        let answer: Answer = send(router_for(probe, None), post_to("/endpoint", None)).await;
        assert_eq!(answer.status, StatusCode::BAD_REQUEST);
        assert_eq!(answer.json()["error"]["key"], json!("API.BAD_REQUEST"));
    }

    #[tokio::test]
    async fn a_base_error_with_a_numeric_code_keeps_it_and_one_without_does_not() {
        let base = |code: Option<u16>| {
            let mut context: ErrorContext = ErrorContext::new();
            if let Some(code) = code {
                context = context.with("code", code);
            }
            ProsopoError::new(
                ErrorClass::Db,
                ErrorSource::key("DATABASE.CONNECT_ERROR"),
                ErrorOptions {
                    context: Some(context),
                    silent: true,
                    ..ErrorOptions::default()
                },
            )
        };
        let with_code: Arc<Probe<NoArgs>> = Probe::answering(move || Err(Box::new(base(Some(409)))));
        assert_eq!(send(router_for(with_code, None), post_to("/endpoint", None)).await.status, StatusCode::CONFLICT);
        let without_code: Arc<Probe<NoArgs>> = Probe::answering(move || Err(Box::new(base(None))));
        let answer: Answer = send(router_for(without_code, None), post_to("/endpoint", None)).await;
        assert_eq!(answer.status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(answer.json()["error"]["key"], json!("API.UNKNOWN"));
    }
}

/// errorHandler.unit.test.ts.
mod error_handler {
    use super::*;

    fn english() -> RequestI18n {
        RequestI18n {
            i18n: I18N.clone(),
            language: "en".to_string(),
        }
    }

    async fn answer_of(error: ThrownError) -> Answer {
        let english: RequestI18n = english();
        let router: Router = Router::new().route("/", post(move || async move { error_response(&error, Some(&english)) }));
        send(router, post_to("/", None)).await
    }

    #[tokio::test]
    async fn answers_a_prosopo_api_error_with_its_code_key_and_translations() {
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("CONTRACT.INVALID_DATA_FORMAT"),
            ErrorOptions {
                context: Some(ErrorContext::new().with("code", 400)),
                silent: true,
                ..ErrorOptions::default()
            },
        );
        let answer: Answer = answer_of(error.into()).await;
        assert_eq!(answer.status, StatusCode::BAD_REQUEST);
        assert_eq!(answer.headers.get("content-type").and_then(|value| value.to_str().ok()), Some("application/json; charset=utf-8"));
        assert_eq!(
            answer.json(),
            json!({ "error": { "code": 400, "key": "CONTRACT.INVALID_DATA_FORMAT", "message": "Invalid data format", "messageEn": "Invalid data format" } })
        );
    }

    #[tokio::test]
    async fn answers_a_plain_error_as_an_unknown_400_with_its_message() {
        let error: ThrownError = ThrownError::from(prosopo_logger::ErrorObject::new("SyntaxError", "Unknown API error"));
        let answer: Answer = answer_of(error).await;
        assert_eq!(answer.status, StatusCode::BAD_REQUEST);
        assert_eq!(answer.json(), json!({ "error": { "code": 400, "key": "API.UNKNOWN", "message": "Unknown API error" } }));
    }

    #[tokio::test]
    async fn answers_a_validation_failure_with_its_issues() {
        let issue: Value = json!({ "code": "custom", "message": "Invalid input", "path": ["some", "variable"] });
        let error: ThrownError = ThrownError::from(ZodLikeError {
            message: serde_json::to_string_pretty(&json!([issue])).expect("serialises"),
            issues: vec![issue.clone()],
        });
        let answer: Answer = answer_of(error).await;
        assert_eq!(answer.status, StatusCode::BAD_REQUEST);
        assert_eq!(answer.json(), json!({ "error": { "code": 400, "key": "API.INVALID_BODY", "message": [issue] } }));
    }

    #[tokio::test]
    async fn unwraps_a_nested_prosopo_error() {
        let env_error: ProsopoError = ProsopoError::new(
            ErrorClass::Env,
            ErrorSource::key("GENERAL.ENVIRONMENT_NOT_READY"),
            ErrorOptions {
                silent: true,
                ..ErrorOptions::default()
            },
        );
        let api_error: ProsopoError = ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::from(&env_error),
            ErrorOptions {
                silent: true,
                ..ErrorOptions::default()
            },
        );
        let answer: Answer = answer_of(api_error.into()).await;
        assert_eq!(answer.status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(answer.json()["error"]["key"], json!("GENERAL.ENVIRONMENT_NOT_READY"));
        assert_eq!(answer.json()["error"]["message"], json!("Environment not ready"));
    }

    #[tokio::test]
    async fn answers_in_the_language_the_request_is_served_in() {
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("CONTRACT.INVALID_DATA_FORMAT"),
            ErrorOptions {
                context: Some(ErrorContext::new().with("code", 400)),
                silent: true,
                ..ErrorOptions::default()
            },
        );
        let error: ThrownError = error.into();
        let router: Router = Router::new()
            .route(
                "/",
                post(move |request: Request| {
                    let error: ThrownError = error.clone();
                    async move { error_response(&error, request.extensions().get::<RequestI18n>()) }
                }),
            )
            .layer(from_fn_with_state(I18N.clone(), i18n_middleware));
        let request: Request = Request::builder().method(Method::POST).uri("/?lng=es").body(Body::empty()).expect("a request");
        let answer: Answer = send(router, request).await;
        assert_eq!(answer.headers.get("content-language").and_then(|value| value.to_str().ok()), Some("es"));
        assert_eq!(answer.json()["error"]["messageEn"], json!("Invalid data format"));
        assert_ne!(answer.json()["error"]["message"], json!("Invalid data format"));
    }

    #[tokio::test]
    async fn a_status_without_a_standard_phrase_keeps_the_ts_phrase() {
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("API.UNKNOWN"),
            ErrorOptions {
                context: Some(ErrorContext::new().with("code", 418)),
                silent: true,
                ..ErrorOptions::default()
            },
        );
        let answer: Answer = answer_of(error.into()).await;
        assert_eq!(answer.status.as_u16(), 418);
        assert_eq!(answer.reason.as_deref(), Some("Bad Request"));
    }
}

/// apiExpressRouterFactory.unit.test.ts and index.unit.test.ts.
mod router {
    use super::*;

    #[tokio::test]
    async fn registers_one_post_route_per_declared_route_each_to_its_own_endpoint() {
        let first: Arc<Probe<NoArgs>> = Probe::answering(|| Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success).with_data(json!("first"))));
        let second: Arc<Probe<NoArgs>> = Probe::answering(|| Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success).with_data(json!("second"))));
        let routes: Routes = Routes::of(vec![("/first", first.clone()), ("/second", second.clone())]);
        let router: Router = create_router(&routes, adapter(None));
        assert_eq!(send(router.clone(), post_to("/first", None)).await.json()["data"], json!("first"));
        assert_eq!(send(router, post_to("/second", None)).await.json()["data"], json!("second"));
        assert_eq!((first.calls(), second.calls()), (1, 1));
    }

    #[tokio::test]
    async fn answers_another_method_as_express_answers_a_request_no_route_took() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(success);
        let request: Request = Request::builder().method(Method::GET).uri("/endpoint").body(Body::empty()).expect("a request");
        let answer: Answer = send(router_for(probe.clone(), None), request).await;
        assert_eq!(answer.status, StatusCode::NOT_FOUND);
        assert_eq!(probe.calls(), 0);
        assert_eq!(
            answer.text,
            "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot GET /endpoint</pre>\n</body>\n</html>\n"
        );
        assert_eq!(answer.headers.get("content-security-policy").and_then(|value| value.to_str().ok()), Some("default-src 'none'"));
        assert_eq!(answer.headers.get("x-content-type-options").and_then(|value| value.to_str().ok()), Some("nosniff"));
    }

    #[tokio::test]
    async fn a_provider_with_no_routes_still_yields_a_router() {
        let router: Router = create_router(&Routes::of(Vec::new()), adapter(None));
        let router: Router = router.fallback(|| async { StatusCode::NOT_FOUND });
        assert_eq!(send(router, post_to("/anything", None)).await.status, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn asks_the_provider_for_its_routes_exactly_once() {
        let routes: Routes = Routes::of(vec![("/endpoint", Probe::<NoArgs>::answering(success) as Arc<dyn DynApiEndpoint>)]);
        let _: Router = create_router(&routes, adapter(None));
        assert_eq!(routes.asked.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn routes_named_oddly_are_mounted_verbatim() {
        let probe: Arc<Probe<NoArgs>> = Probe::answering(success);
        let routes: Routes = Routes::of(vec![("/v1/prosopo/provider/client/captcha/pow", probe.clone() as Arc<dyn DynApiEndpoint>)]);
        let router: Router = create_router(&routes, adapter(None));
        assert_eq!(send(router, post_to("/v1/prosopo/provider/client/captcha/pow", None)).await.status, StatusCode::OK);
        assert_eq!(probe.calls(), 1);
    }

    #[test]
    fn the_adapter_defaults_its_error_status_to_500() {
        let adapter: DefaultEndpointAdapter = DefaultEndpointAdapter::new(LogLevel::Info, None);
        let _: &dyn EndpointAdapter = &adapter;
    }
}

/// jwtReplayGuard.unit.test.ts.
mod replay_guard {
    use super::*;

    fn guard_at(max_entries: usize, now: Arc<Mutex<f64>>) -> MemoryJwtReplayGuard {
        MemoryJwtReplayGuard::new(Some(max_entries), Some(Box::new(move || *now.lock().expect("lock"))))
    }

    #[test]
    fn accepts_an_id_once_and_refuses_it_until_it_expires() {
        let now: Arc<Mutex<f64>> = Arc::new(Mutex::new(100.0));
        let guard: MemoryJwtReplayGuard = guard_at(10, now.clone());
        assert!(guard.claim("a", 150.0));
        assert!(!guard.claim("a", 150.0));
        *now.lock().expect("lock") = 151.0;
        assert!(guard.claim("a", 200.0));
    }

    #[test]
    fn tracks_ids_independently() {
        let guard: MemoryJwtReplayGuard = guard_at(10, Arc::new(Mutex::new(100.0)));
        assert!(guard.claim("a", 150.0));
        assert!(guard.claim("b", 150.0));
        assert!(!guard.claim("a", 150.0));
    }

    #[test]
    fn drops_expired_entries_before_evicting_live_ones_when_full() {
        let now: Arc<Mutex<f64>> = Arc::new(Mutex::new(100.0));
        let guard: MemoryJwtReplayGuard = guard_at(2, now.clone());
        assert!(guard.claim("expiring", 110.0));
        assert!(guard.claim("live", 500.0));
        *now.lock().expect("lock") = 200.0;
        assert!(guard.claim("new", 500.0));
        assert!(!guard.claim("live", 500.0), "the live entry was kept");
    }

    #[test]
    fn evicts_the_oldest_live_entry_rather_than_growing_past_the_cap() {
        let guard: MemoryJwtReplayGuard = guard_at(2, Arc::new(Mutex::new(100.0)));
        assert!(guard.claim("first", 500.0));
        assert!(guard.claim("second", 500.0));
        assert!(guard.claim("third", 500.0));
        assert!(guard.claim("first", 500.0), "the oldest was evicted");
        assert!(!guard.claim("third", 500.0));
    }
}

/// authMiddleware.unit.test.ts: keys that only implement what the middleware calls.
mod auth {
    use super::*;

    type Verify = Box<dyn Fn(&str, &JwtVerifyOptions) -> Result<JwtVerifyResult, ProsopoError> + Send + Sync>;

    /// A `verify` call: the message, the signature bytes and the public key.
    type SignatureCheck = (String, Vec<u8>, Vec<u8>);

    struct Key {
        verify: Verify,
        verified: Mutex<Vec<(String, JwtVerifyOptions)>>,
        signature_valid: bool,
        signatures: Mutex<Vec<SignatureCheck>>,
    }

    impl AdminKey for Key {
        fn jwt_verify(&self, jwt: &str, options: &JwtVerifyOptions) -> Result<JwtVerifyResult, ProsopoError> {
            self.verified.lock().expect("lock").push((jwt.to_string(), options.clone()));
            (self.verify)(jwt, options)
        }

        fn verify(&self, message: &str, signature: &[u8], public_key: &[u8]) -> bool {
            self.signatures.lock().expect("lock").push((message.to_string(), signature.to_vec(), public_key.to_vec()));
            self.signature_valid
        }

        fn public_key(&self) -> Vec<u8> {
            vec![1, 2, 3]
        }

        fn address(&self) -> String {
            "5Test".to_string()
        }
    }

    fn result(is_valid: bool, payload: Option<prosopo_util_crypto::js::JsonValue>) -> JwtVerifyResult {
        JwtVerifyResult {
            is_valid,
            error: None,
            crypto: None,
            public_key: Vec::new(),
            is_wrapped: false,
            payload,
        }
    }

    fn key_that(verify: impl Fn(&str, &JwtVerifyOptions) -> Result<JwtVerifyResult, ProsopoError> + Send + Sync + 'static) -> Arc<Key> {
        Arc::new(Key {
            verify: Box::new(verify),
            verified: Mutex::new(Vec::new()),
            signature_valid: true,
            signatures: Mutex::new(Vec::new()),
        })
    }

    fn accepts() -> Arc<Key> {
        key_that(|_, _| Ok(result(true, None)))
    }

    fn rejects() -> Arc<Key> {
        key_that(|_, _| Ok(result(false, None)))
    }

    fn explodes(message: &'static str) -> Arc<Key> {
        key_that(move |_, _| {
            Err(ProsopoError::new(
                ErrorClass::Prosopo,
                ErrorSource::message(message),
                ErrorOptions {
                    silent: true,
                    ..ErrorOptions::default()
                },
            ))
        })
    }

    struct Harness {
        reached: Arc<AtomicUsize>,
        lines: Arc<Lines>,
    }

    async fn run(pair: Option<Arc<Key>>, auth_account: Option<Arc<Key>>, options: AuthMiddlewareOptions, headers: Vec<(&str, &str)>, i18n: bool) -> (Answer, Harness) {
        let reached: Arc<AtomicUsize> = Arc::new(AtomicUsize::new(0));
        let counter: Arc<AtomicUsize> = reached.clone();
        let state: AuthState = AuthState {
            pair: pair.map(|key| key as Arc<dyn AdminKey>),
            auth_account: auth_account.map(|key| key as Arc<dyn AdminKey>),
            options,
        };
        let lines: Arc<Lines> = Arc::new(Lines::default());
        let mut router: Router = Router::new()
            .route(
                "/admin",
                post(move || {
                    counter.fetch_add(1, Ordering::SeqCst);
                    async { "handled" }
                }),
            )
            .layer(from_fn_with_state(state, auth_middleware));
        router = with_request_log(router, lines.clone());
        if i18n {
            router = router.layer(from_fn_with_state(I18N.clone(), i18n_middleware));
        }
        let mut request = Request::builder().method(Method::POST).uri("/admin");
        for (name, value) in headers {
            request = request.header(name, value);
        }
        let answer: Answer = send(router, request.body(Body::empty()).expect("a request")).await;
        (answer, Harness { reached, lines })
    }

    fn bearer() -> Vec<(&'static str, &'static str)> {
        vec![("authorization", "Bearer token-1")]
    }

    #[tokio::test]
    async fn passes_the_request_through_on_the_auth_account() {
        let (answer, harness) = run(Some(rejects()), Some(accepts()), AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(harness.reached.load(Ordering::SeqCst), 1);
        assert_eq!(answer.status, StatusCode::OK);
    }

    #[tokio::test]
    async fn passes_the_request_through_on_the_provider_pair() {
        let (_, harness) = run(Some(accepts()), Some(rejects()), AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(harness.reached.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn does_not_consult_the_provider_pair_once_the_auth_account_accepts() {
        let pair: Arc<Key> = accepts();
        run(Some(pair.clone()), Some(accepts()), AuthMiddlewareOptions::default(), bearer(), false).await;
        assert!(pair.verified.lock().expect("lock").is_empty());
    }

    #[tokio::test]
    async fn works_with_only_one_key_configured() {
        let (_, harness) = run(Some(accepts()), None, AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(harness.reached.load(Ordering::SeqCst), 1);
        let (_, harness) = run(None, Some(accepts()), AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(harness.reached.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn hands_the_verifier_the_token_without_its_bearer_prefix() {
        let pair: Arc<Key> = accepts();
        run(Some(pair.clone()), None, AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(pair.verified.lock().expect("lock")[0].0, "token-1");
    }

    #[tokio::test]
    async fn a_token_neither_key_accepts_is_answered_401_with_the_unauthorized_body() {
        let (answer, harness) = run(Some(rejects()), Some(rejects()), AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(answer.status, StatusCode::UNAUTHORIZED);
        assert_eq!(harness.reached.load(Ordering::SeqCst), 0);
        assert_eq!(answer.json(), json!({ "error": { "code": 401, "key": "API.UNAUTHORIZED", "message": "API.UNAUTHORIZED" } }));
    }

    #[tokio::test]
    async fn the_401_message_is_translated_and_carries_no_context() {
        let (answer, _) = run(Some(rejects()), Some(rejects()), AuthMiddlewareOptions::default(), bearer(), true).await;
        assert!(!answer.text.contains("context"));
        let english: String = I18N.fixed_t("en").language().to_string();
        assert_eq!(english, "en");
        assert_eq!(answer.json()["error"]["key"], json!("API.UNAUTHORIZED"));
        assert_ne!(answer.json()["error"]["message"], json!("API.UNAUTHORIZED"));
    }

    #[tokio::test]
    async fn does_not_echo_what_a_verifier_threw() {
        let (answer, _) = run(Some(explodes("mongodb://admin:hunter2@10.0.0.5/provider")), None, AuthMiddlewareOptions::default(), bearer(), false).await;
        assert!(!answer.text.contains("hunter2"));
        assert_eq!(answer.json(), json!({ "error": { "code": 401, "key": "API.UNAUTHORIZED", "message": "API.UNAUTHORIZED" } }));
    }

    #[tokio::test]
    async fn reports_only_the_translation_key_of_a_prosopo_error() {
        let (answer, _) = run(Some(accepts()), None, AuthMiddlewareOptions::default(), Vec::new(), false).await;
        assert!(!answer.text.contains("Missing Authorization header"));
        assert_eq!(answer.json(), json!({ "error": { "code": 401, "key": "GENERAL.MISSING_AUTH_HEADER", "message": "GENERAL.MISSING_AUTH_HEADER" } }));
    }

    #[tokio::test]
    async fn no_configured_keys_at_all_is_rejected() {
        let (answer, harness) = run(None, None, AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(answer.status, StatusCode::UNAUTHORIZED);
        assert_eq!(harness.reached.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn a_missing_empty_or_bare_bearer_header_is_rejected_without_reaching_the_verifier() {
        for headers in [Vec::new(), vec![("authorization", "")], vec![("authorization", "Bearer ")]] {
            let pair: Arc<Key> = accepts();
            let (answer, harness) = run(Some(pair.clone()), Some(accepts()), AuthMiddlewareOptions::default(), headers.clone(), false).await;
            assert_eq!(answer.status, StatusCode::UNAUTHORIZED, "{headers:?}");
            assert_eq!(harness.reached.load(Ordering::SeqCst), 0);
            assert!(pair.verified.lock().expect("lock").is_empty());
        }
    }

    #[tokio::test]
    async fn a_header_rejection_is_logged() {
        let (_, harness) = run(Some(accepts()), None, AuthMiddlewareOptions::default(), Vec::new(), false).await;
        let errors: Vec<Value> = harness.lines.of(ConsoleMethod::Error);
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0]["msg"], json!("Auth Middleware Error"));
    }

    #[tokio::test]
    async fn a_repeated_authorization_header_is_read_as_its_first_as_node_keeps_it() {
        let pair: Arc<Key> = accepts();
        run(Some(pair.clone()), None, AuthMiddlewareOptions::default(), vec![("authorization", "Bearer a"), ("authorization", "Bearer b")], false).await;
        assert_eq!(pair.verified.lock().expect("lock")[0].0, "a");
    }

    #[tokio::test]
    async fn header_quirks_a_bare_token_a_capitalised_name_and_an_inner_bearer() {
        for (header, token) in [("token-1", "token-1"), ("abcBearer xyz", "abcxyz")] {
            let pair: Arc<Key> = accepts();
            run(Some(pair.clone()), None, AuthMiddlewareOptions::default(), vec![("Authorization", header)], false).await;
            assert_eq!(pair.verified.lock().expect("lock")[0].0, token, "{header}");
        }
    }

    #[tokio::test]
    async fn a_verifier_that_fails_is_answered_401_logged_and_does_not_fall_through() {
        let pair: Arc<Key> = accepts();
        let (answer, harness) = run(Some(pair.clone()), Some(explodes("verifier unavailable")), AuthMiddlewareOptions::default(), bearer(), false).await;
        assert_eq!(answer.status, StatusCode::UNAUTHORIZED);
        assert_eq!(harness.reached.load(Ordering::SeqCst), 0);
        assert!(pair.verified.lock().expect("lock").is_empty());
        assert_eq!(harness.lines.of(ConsoleMethod::Error)[0]["msg"], json!("Auth Middleware Error"));
    }

    #[tokio::test]
    async fn passes_the_verify_options_to_the_key() {
        let pair: Arc<Key> = accepts();
        let verify: JwtVerifyOptions = JwtVerifyOptions {
            audience: Some(vec!["https://p1.example".to_string()]),
            ..JwtVerifyOptions::default()
        };
        run(Some(pair.clone()), None, AuthMiddlewareOptions { verify: verify.clone(), replay_guard: None }, bearer(), false).await;
        assert_eq!(pair.verified.lock().expect("lock")[0].1, verify);
    }

    fn payload(jti: Option<&str>) -> prosopo_util_crypto::js::JsonValue {
        use prosopo_util_crypto::js::JsonValue;
        let exp: f64 = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).expect("time").as_secs_f64() + 300.0;
        let mut entries: Vec<(String, JsonValue)> =
            vec![("sub".to_string(), JsonValue::String("0x01".to_string())), ("iat".to_string(), JsonValue::Number(1.0)), ("exp".to_string(), JsonValue::Number(exp))];
        if let Some(jti) = jti {
            entries.push(("jti".to_string(), JsonValue::String(jti.to_string())));
        }
        JsonValue::Object(entries)
    }

    #[tokio::test]
    async fn a_token_with_a_jti_is_accepted_once_and_refused_on_replay() {
        let options: AuthMiddlewareOptions = AuthMiddlewareOptions {
            verify: JwtVerifyOptions::default(),
            replay_guard: Some(Arc::new(MemoryJwtReplayGuard::new(None, None))),
        };
        let pair = || key_that(|_, _| Ok(result(true, Some(payload(Some("n-1"))))));
        let (_, first) = run(Some(pair()), None, options.clone(), bearer(), false).await;
        assert_eq!(first.reached.load(Ordering::SeqCst), 1);
        let (answer, second) = run(Some(pair()), None, options, bearer(), false).await;
        assert_eq!(second.reached.load(Ordering::SeqCst), 0);
        assert_eq!(answer.status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn a_token_without_a_jti_can_be_reused() {
        let options: AuthMiddlewareOptions = AuthMiddlewareOptions {
            verify: JwtVerifyOptions::default(),
            replay_guard: Some(Arc::new(MemoryJwtReplayGuard::new(None, None))),
        };
        let pair = || key_that(|_, _| Ok(result(true, Some(payload(None)))));
        run(Some(pair()), None, options.clone(), bearer(), false).await;
        let (_, second) = run(Some(pair()), None, options, bearer(), false).await;
        assert_eq!(second.reached.load(Ordering::SeqCst), 1);
    }

    mod verify_signature_of {
        use super::*;

        #[test]
        fn returns_quietly_when_the_pair_verifies_and_hands_it_the_decoded_bytes() {
            let pair: Arc<Key> = accepts();
            verify_signature("0x0102", "sign me", pair.as_ref()).expect("verifies");
            assert_eq!(pair.signatures.lock().expect("lock")[0], ("sign me".to_string(), vec![1, 2], vec![1, 2, 3]));
        }

        #[test]
        fn fails_with_a_401_naming_the_account_message_and_signature() {
            let pair: Key = Key {
                verify: Box::new(|_, _| Ok(result(true, None))),
                verified: Mutex::new(Vec::new()),
                signature_valid: false,
                signatures: Mutex::new(Vec::new()),
            };
            let error: ProsopoError = verify_signature("0x0102", "sign me", &pair).expect_err("fails");
            assert_eq!(error.code(), Some(401));
            let context = error.context().expect("a context").to_json();
            assert_eq!(context["account"], json!("5Test"));
            assert_eq!(context["message"], json!("sign me"));
            assert_eq!(context["signature"], json!("0x0102"));
        }

        #[test]
        fn a_non_hex_signature_is_decoded_rather_than_rejected_and_an_empty_message_passes_through() {
            let pair: Arc<Key> = accepts();
            verify_signature("not hex", "", pair.as_ref()).expect("the key decides");
            assert_eq!(pair.signatures.lock().expect("lock").len(), 1);
            assert_eq!(pair.signatures.lock().expect("lock")[0].0, "");
        }
    }
}

/// requestLoggerMiddleware.unit.test.ts, with the request logger writing to a capture.
mod request_logger {
    use super::*;

    struct Logged {
        answer: Answer,
        seen: Option<String>,
        lines: Arc<Lines>,
    }

    async fn through_logger(request: Request) -> Logged {
        let lines: Arc<Lines> = Arc::new(Lines::default());
        let seen: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let recorded: Arc<Mutex<Option<String>>> = seen.clone();
        let handler = move |request: Request| {
            let log: Option<RequestLog> = request.extensions().get::<RequestLog>().cloned();
            if let Some(log) = &log {
                log.logger.info(|| prosopo_logger::LogRecord::msg("handled"));
            }
            *recorded.lock().expect("lock") = log.map(|log| log.request_id);
            async { "ok" }
        };
        let router: Router = Router::new()
            .route("/{*path}", post(handler.clone()).get(handler))
            .layer(from_fn_with_state(capturing(&lines, "provider:request"), request_logger_middleware));
        let answer: Answer = send(router, request).await;
        let seen: Option<String> = seen.lock().expect("lock").clone();
        Logged { answer, seen, lines }
    }

    fn request(method: Method, path: &str, headers: Vec<(&str, &str)>, body: Option<Value>) -> Request {
        let mut builder = Request::builder().method(method).uri(path);
        for (name, value) in headers {
            builder = builder.header(name, value);
        }
        let mut request: Request = builder.body(Body::empty()).expect("a request");
        if let Some(body) = body {
            request.extensions_mut().insert(RequestBody(body));
        }
        request
    }

    fn post_with(headers: Vec<(&str, &str)>, body: Option<Value>) -> Request {
        request(Method::POST, "/verify", headers, body)
    }

    /// The bindings the handler's log line carries.
    fn handled(logged: &Logged) -> Value {
        logged.lines.of(ConsoleMethod::Info).into_iter().find(|line| line["msg"] == json!("handled")).expect("the handler logged")
    }

    #[tokio::test]
    async fn reuses_the_id_an_upstream_proxy_assigned_and_mirrors_it() {
        let logged: Logged = through_logger(post_with(vec![("x-request-id", "caddy-123")], None)).await;
        assert_eq!(logged.seen.as_deref(), Some("caddy-123"));
        assert_eq!(logged.answer.headers.get("x-request-id").and_then(|value| value.to_str().ok()), Some("caddy-123"));
    }

    #[tokio::test]
    async fn generates_a_fresh_e_prefixed_uuid_for_a_missing_or_empty_id_and_mirrors_it() {
        let logged: Logged = through_logger(post_with(vec![("x-request-id", "")], None)).await;
        let id: String = logged.seen.expect("an id");
        assert!(id.starts_with("e-") && id.len() == 38, "{id}");
        assert_eq!(logged.answer.headers.get("x-request-id").and_then(|value| value.to_str().ok()), Some(id.as_str()));
        let again: Logged = through_logger(post_with(Vec::new(), None)).await;
        assert_ne!(again.seen.expect("an id"), id);
    }

    #[tokio::test]
    async fn binds_the_user_site_key_and_session_and_leaves_absent_ones_out() {
        let logged: Logged = through_logger(post_with(
            vec![("prosopo-user", "user-1"), ("prosopo-site-key", "site-1")],
            Some(json!({ "sessionId": "session-1" })),
        ))
        .await;
        let line: Value = handled(&logged);
        assert_eq!(line["data"]["user"], json!("user-1"));
        assert_eq!(line["data"]["siteKey"], json!("site-1"));
        assert_eq!(line["data"]["sessionId"], json!("session-1"));
        let bare: Logged = through_logger(post_with(vec![("prosopo-user", "")], Some(json!({ "sessionId": "" })))).await;
        let line: Value = handled(&bare);
        for absent in ["user", "siteKey", "sessionId"] {
            assert!(line["data"].get(absent).is_none(), "{absent}");
        }
    }

    #[tokio::test]
    async fn collapses_a_repeated_header_to_one_string() {
        let logged: Logged = through_logger(post_with(vec![("prosopo-user", "a"), ("prosopo-user", "b")], None)).await;
        assert_eq!(handled(&logged)["data"]["user"], json!("a, b"));
    }

    #[tokio::test]
    async fn tolerates_a_missing_body_or_one_that_is_not_an_object() {
        for body in [None, Some(json!("text")), Some(json!([1]))] {
            let logged: Logged = through_logger(post_with(Vec::new(), body.clone())).await;
            assert!(handled(&logged)["data"].get("sessionId").is_none(), "{body:?}");
        }
    }

    #[tokio::test]
    async fn logs_a_received_line_and_one_sent_line_with_status_and_outcome() {
        let logged: Logged = through_logger(post_with(Vec::new(), None)).await;
        let infos: Vec<Value> = logged.lines.of(ConsoleMethod::Info);
        assert_eq!(infos[0]["msg"], json!("Request received"));
        assert_eq!(infos[0]["data"]["method"], json!("POST"));
        assert_eq!(infos[0]["data"]["path"], json!("/verify"));
        let sent: Vec<&Value> = infos.iter().filter(|line| line["msg"] == json!("Response sent")).collect();
        assert_eq!(sent.len(), 1);
        assert_eq!(sent[0]["data"]["status"], json!(200));
        assert_eq!(sent[0]["data"]["outcome"], json!("finish"));
        assert!(sent[0]["data"]["durationMs"].as_f64().is_some_and(|duration| duration >= 0.0));
    }

    #[tokio::test]
    async fn a_health_probe_gets_an_id_and_a_logger_but_no_envelope_lines() {
        for path in ["/healthz", "/health", "/readyz"] {
            let logged: Logged = through_logger(request(Method::GET, path, Vec::new(), None)).await;
            assert!(logged.answer.headers.get("x-request-id").is_some());
            assert!(logged.seen.is_some());
            let envelope: usize = logged.lines.of(ConsoleMethod::Info).iter().filter(|line| line["msg"] != json!("handled")).count();
            assert_eq!(envelope, 0, "{path}");
        }
    }

    #[tokio::test]
    async fn a_path_that_merely_looks_like_a_probe_is_still_logged() {
        let logged: Logged = through_logger(request(Method::GET, "/healthz/extra", Vec::new(), None)).await;
        assert!(logged.lines.of(ConsoleMethod::Info).iter().any(|line| line["msg"] == json!("Request received")));
    }

    #[tokio::test]
    async fn a_dropped_request_is_logged_as_closed() {
        let lines: Arc<Lines> = Arc::new(Lines::default());
        let router: Router = Router::new()
            .route("/slow", post(|| async { tokio::time::sleep(std::time::Duration::from_secs(60)).await; "late" }))
            .layer(from_fn_with_state(capturing(&lines, "provider:request"), request_logger_middleware));
        let call = tokio::spawn(router.oneshot(request(Method::POST, "/slow", Vec::new(), None)));
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        call.abort();
        let _ = call.await;
        let sent: Vec<Value> = lines.of(ConsoleMethod::Info).into_iter().filter(|line| line["msg"] == json!("Response sent")).collect();
        assert_eq!(sent.len(), 1);
        assert_eq!(sent[0]["data"]["outcome"], json!("close"));
    }
}
