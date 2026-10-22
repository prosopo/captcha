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

//! app.ts and routes/routes.ts: the environment readers, the app with express's framing (CORS,
//! the form and JSON bodies, the demo's own headers, `X-Powered-By`), the routes, and `main`.

use crate::auth;
use crate::form;
use crate::memory_server::MemoryServer;
use crate::users::UserStore;
use axum::extract::{Request, State};
use axum::middleware::{from_fn, Next};
use axum::response::Response;
use axum::Router;
use http::{HeaderMap, HeaderValue, Method, StatusCode};
use hyper_util::rt::TokioIo;
use hyper_util::service::TowerToHyperService;
use prosopo_api_router::RequestBody;
use prosopo_load_balancer::{Clock, EnvLookup, ProviderDirectory};
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use prosopo_provider::api::express::{header, powered_by, require_host, send_json, Requested};
use prosopo_server::get_server_config;
use prosopo_types::config::ProsopoServerConfig;
use rustls_pki_types::pem::PemObject;
use rustls_pki_types::{CertificateDer, PrivateKeyDer};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Arc;

pub const DEFAULT_PORT: u16 = 9228;

/// `ProsopoVerificationType`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerificationType {
    Api,
    Local,
}

impl VerificationType {
    pub fn as_str(self) -> &'static str {
        match self {
            VerificationType::Api => "api",
            VerificationType::Local => "local",
        }
    }
}


fn logger() -> Logger {
    get_logger(LogLevel::Info, "client-example-server:app")
}

/// `resolveVerifyEndpoint`: the configured endpoint, else the hosted API, prefixed with the
/// environment's name outside production. An unset or empty `NODE_ENV` is production.
pub fn resolve_verify_endpoint(env: &EnvLookup) -> String {
    if let Some(endpoint) = env("PROSOPO_VERIFY_ENDPOINT").filter(|endpoint| !endpoint.is_empty()) {
        return endpoint;
    }
    let prefix: String = match env("NODE_ENV").filter(|environment| !environment.is_empty()) {
        None => String::new(),
        Some(environment) if environment == "production" => String::new(),
        Some(environment) => format!("{environment}-"),
    };
    format!("https://{prefix}api.prosopo.io/siteverify")
}

/// `resolveVerifyType`: anything the enum does not name is the hosted API.
pub fn resolve_verify_type(env: &EnvLookup) -> VerificationType {
    match env("PROSOPO_VERIFICATION_TYPE").as_deref() {
        Some("local") => VerificationType::Local,
        _ => VerificationType::Api,
    }
}

pub fn is_development_or_test(env: &EnvLookup) -> bool {
    matches!(env("NODE_ENV").as_deref(), Some("development") | Some("test"))
}

/// `resolvePort`: `parseInt` of the third `:`-separated segment of the server URL, or the default.
pub fn resolve_port(server_url: Option<&str>) -> f64 {
    let Some(url) = server_url.filter(|url| !url.is_empty()) else {
        return f64::from(DEFAULT_PORT);
    };
    let segments: Vec<&str> = url.split(':').collect();
    if segments.len() < 3 {
        return f64::from(DEFAULT_PORT);
    }
    let port: f64 = prosopo_util::parse_int(segments[2], 10);
    if port.is_nan() {
        f64::from(DEFAULT_PORT)
    } else {
        port
    }
}

/// What the routes are bound with.
pub struct AppState {
    pub users: Arc<UserStore>,
    pub config: ProsopoServerConfig,
    pub verify_endpoint: String,
    pub verify_type: VerificationType,
    /// `NODE_ENV === "development"`, where the siteverify request leaves the IP out.
    pub development: bool,
    pub http: reqwest::Client,
    /// `Date.now()`, for the library's freshness checks and the session JWTs.
    pub now_ms: Clock,
    /// The provider list the library looks issuers up in, shared as `@prosopo/server`'s module
    /// cache shares it.
    pub providers: Arc<ProviderDirectory>,
}

fn now_millis() -> f64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|elapsed| elapsed.as_millis() as f64).unwrap_or(0.0)
}

impl AppState {
    pub fn new(users: Arc<UserStore>, config: ProsopoServerConfig, verify_endpoint: String, verify_type: VerificationType, development: bool) -> AppState {
        AppState {
            users,
            config,
            verify_endpoint,
            verify_type,
            development,
            http: reqwest::Client::new(),
            now_ms: Arc::new(now_millis),
            providers: Arc::new(ProviderDirectory::default()),
        }
    }
}

/// `vary(res, field)`: the field appended to `Vary` unless it is already named.
fn vary(headers: &mut HeaderMap, field: &str) {
    let existing: Option<String> = headers.get(http::header::VARY).and_then(|value| value.to_str().ok()).map(str::to_string);
    let value: String = match existing {
        None => field.to_string(),
        Some(existing) if existing.split(',').any(|named| named.trim().eq_ignore_ascii_case(field)) => existing,
        Some(existing) => format!("{existing}, {field}"),
    };
    headers.insert(http::header::VARY, HeaderValue::from_str(&value).expect("a header value"));
}

/// `cors({ origin: true, credentials: true })`: the origin reflected with credentials, and every
/// `OPTIONS` answered at once, its requested headers reflected.
async fn cors(request: Request, next: Next) -> Response {
    let origin: Option<HeaderValue> = request.headers().get(http::header::ORIGIN).cloned();
    if request.method() == Method::OPTIONS {
        let requested_headers: Option<HeaderValue> = request.headers().get(http::header::ACCESS_CONTROL_REQUEST_HEADERS).cloned();
        let mut response: Response = Response::new(axum::body::Body::empty());
        *response.status_mut() = StatusCode::NO_CONTENT;
        let headers: &mut HeaderMap = response.headers_mut();
        if let Some(origin) = origin {
            headers.insert(http::header::ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        }
        vary(headers, "Origin");
        headers.insert(http::header::ACCESS_CONTROL_ALLOW_CREDENTIALS, HeaderValue::from_static("true"));
        headers.insert(http::header::ACCESS_CONTROL_ALLOW_METHODS, HeaderValue::from_static("GET,HEAD,PUT,PATCH,POST,DELETE"));
        if let Some(requested_headers) = requested_headers {
            headers.insert(http::header::ACCESS_CONTROL_ALLOW_HEADERS, requested_headers);
        }
        vary(headers, "Access-Control-Request-Headers");
        headers.insert(http::header::CONTENT_LENGTH, HeaderValue::from_static("0"));
        return response;
    }
    let mut response: Response = next.run(request).await;
    let headers: &mut HeaderMap = response.headers_mut();
    if let Some(origin) = origin.filter(|_| !headers.contains_key(http::header::ACCESS_CONTROL_ALLOW_ORIGIN)) {
        headers.insert(http::header::ACCESS_CONTROL_ALLOW_ORIGIN, origin);
    }
    vary(headers, "Origin");
    headers.insert(http::header::ACCESS_CONTROL_ALLOW_CREDENTIALS, HeaderValue::from_static("true"));
    response
}

/// `express.urlencoded({ extended: true })` then `express.json()`, each with the 100kb default.
async fn bodies(request: Request, next: Next) -> Response {
    let parsed: Result<Request, Box<Response>> = if form::has_body(request.headers()) && form::is_urlencoded(request.headers()) {
        form::form_body_within(request, form::LIMIT).await
    } else {
        prosopo_provider::api::body::json_body_within(request, form::LIMIT).await
    };
    match parsed {
        Ok(request) => next.run(request).await,
        Err(page) => *page,
    }
}

/// The demo's own middleware: permissive CORS headers on everything that reaches the routes.
async fn demo_headers(request: Request, next: Next) -> Response {
    let mut response: Response = next.run(request).await;
    let headers: &mut HeaderMap = response.headers_mut();
    headers.insert(http::header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    headers.insert(http::header::ACCESS_CONTROL_ALLOW_METHODS, HeaderValue::from_static("GET, POST, PUT, PATCH, DELETE"));
    headers.insert(http::header::ACCESS_CONTROL_ALLOW_HEADERS, HeaderValue::from_static("Origin, Content-Type, X-Auth-Token, Authorization"));
    response
}

/// The path as express's router matches it: case-insensitively, a trailing slash optional.
fn route_path(path: &str) -> String {
    let trimmed: &str = if path.len() > 1 { path.strip_suffix('/').unwrap_or(path) } else { path };
    trimmed.to_lowercase()
}

/// routes.ts: each route, and the catch-all's JSON 404 for anything else.
async fn dispatch(State(state): State<Arc<AppState>>, request: Request) -> Response {
    let requested: Requested = Requested::of(&request);
    let path: String = route_path(request.uri().path());
    let readable: bool = matches!(*request.method(), Method::GET | Method::HEAD);
    let body: Value = request.extensions().get::<RequestBody>().map(|body| body.0.clone()).unwrap_or_else(|| json!({}));
    let (status, answer): auth::Answer = match path.as_str() {
        "/login" if request.method() == Method::POST => auth::login(&state, &body, request.headers()).await,
        "/signup" if request.method() == Method::POST => auth::signup(&state, &body, request.headers()).await,
        "/private" if readable => auth::is_auth(&state, header(request.headers(), "authorization").as_deref()),
        "/public" if readable => (StatusCode::OK, json!({ "message": "here is your public resource" })),
        "/health" if readable => (StatusCode::OK, json!({ "status": "ok" })),
        _ => (StatusCode::NOT_FOUND, json!({ "error": "page not found" })),
    };
    send_json(&requested, status, Vec::new(), &answer)
}

/// `createApp` with the routes mounted.
pub fn create_app(state: Arc<AppState>) -> Router {
    Router::new()
        .fallback(dispatch)
        .with_state(state)
        .layer(from_fn(demo_headers))
        .layer(from_fn(bodies))
        .layer(from_fn(cors))
        .layer(from_fn(powered_by))
        .layer(from_fn(require_host))
}

/// The repository's development certificates: `certs/` at the root, two levels above the
/// directory the binary is built into (`target/<profile>/`).
fn certs_dir() -> PathBuf {
    let exe: PathBuf = std::env::current_exe().unwrap_or_default();
    exe.parent().unwrap_or(Path::new(".")).join("../../certs")
}

fn tls_acceptor(key: &Path, cert: &Path) -> Result<tokio_rustls::TlsAcceptor, String> {
    let certificates: Vec<CertificateDer<'static>> =
        CertificateDer::pem_file_iter(cert).map_err(|error| error.to_string())?.collect::<Result<_, _>>().map_err(|error| error.to_string())?;
    let key: PrivateKeyDer<'static> = PrivateKeyDer::from_pem_file(key).map_err(|error| error.to_string())?;
    let config = rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions()
        .map_err(|error| error.to_string())?
        .with_no_client_auth()
        .with_single_cert(certificates, key)
        .map_err(|error| error.to_string())?;
    Ok(tokio_rustls::TlsAcceptor::from(Arc::new(config)))
}

async fn serve_tls(listener: tokio::net::TcpListener, app: Router, acceptor: tokio_rustls::TlsAcceptor) {
    loop {
        let Ok((socket, _)) = listener.accept().await else {
            continue;
        };
        let (acceptor, app) = (acceptor.clone(), app.clone());
        tokio::spawn(async move {
            if let Ok(stream) = acceptor.accept(socket).await {
                let _ = hyper::server::conn::http1::Builder::new().serve_connection(TokioIo::new(stream), TowerToHyperService::new(app)).await;
            }
        });
    }
}

/// `startServer`: HTTPS in development and test when the certificates exist, plain HTTP otherwise
/// (in production Caddy terminates TLS). Runs until the process ends.
pub async fn start_server(app: Router, port: f64, development_or_test: bool, certs: &Path) -> Result<(), String> {
    if port.fract() != 0.0 || !(0.0..=65535.0).contains(&port) {
        return Err(format!("options.port should be >= 0 and < 65536. Received type number ({}).", prosopo_util::number_to_string(port)));
    }
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(("::", port as u16)).await.map_err(|error| error.to_string())?;
    let log: Logger = logger();
    if development_or_test {
        let (key, cert) = (certs.join("server.key"), certs.join("server.crt"));
        if key.exists() && cert.exists() {
            let acceptor: tokio_rustls::TlsAcceptor = tls_acceptor(&key, &cert)?;
            log.info(|| LogRecord::msg(format!("HTTPS server started on port {port}")));
            serve_tls(listener, app, acceptor).await;
            return Ok(());
        }
        log.warn(|| LogRecord::msg("Certificates not found, starting HTTP server instead. Run ./setup_certs.sh to enable HTTPS in development."));
        log.info(|| LogRecord::msg(format!("HTTP server started on port {port}")));
    } else {
        log.info(|| LogRecord::msg(format!("HTTP server started on port {port} (TLS handled by reverse proxy)")));
    }
    axum::serve(listener, app).await.map_err(|error| error.to_string())
}

/// `main`, reading the environment through `env` once `.env` is loaded.
pub async fn main_with(env: &EnvLookup) -> Result<(), String> {
    prosopo_dotenv::load_env(None, None, None, None, false).map_err(|error| error.to_string())?;
    let log: Logger = logger();
    let verify_endpoint: String = resolve_verify_endpoint(env);
    log.info(|| LogRecord::default().with_data(json!({ "verifyEndpoint": verify_endpoint })));
    let verify_type: VerificationType = resolve_verify_type(env);
    let configured: Option<String> = env("MONGO_URI").filter(|uri| !uri.is_empty());
    if configured.is_none() && !is_development_or_test(env) {
        return Err("Cannot run mongo memory when NODE_ENV is neither development nor test".to_string());
    }
    log.info(|| match &configured {
        Some(uri) => LogRecord::msg(uri.clone()),
        None => LogRecord::default(),
    });
    let memory: Option<MemoryServer> = match configured {
        Some(_) => None,
        None => Some(MemoryServer::start().await?),
    };
    let uri: String = configured.or_else(|| memory.as_ref().map(|memory| memory.uri.clone())).unwrap_or_default();
    log.info(|| LogRecord::msg("mongo uri").with_data(json!({ "uri": uri })));
    let client: mongodb::Client = mongodb::Client::with_uri_str(&uri).await.map_err(|error| error.to_string())?;
    if env("PROSOPO_SITE_PRIVATE_KEY").is_none_or(|key| key.is_empty()) {
        log.error(|| LogRecord::default().with_err("GENERAL.MNEMONIC_UNDEFINED").with_data(json!({ "context": { "missingParams": ["PROSOPO_SITE_PRIVATE_KEY"] } })));
    }
    let config: ProsopoServerConfig = get_server_config(env).map_err(|error| error.to_string())?;
    log.info(|| LogRecord::msg("Config").with_data(json!({ "config": serde_json::to_value(&config).unwrap_or(Value::Null) })));
    let development: bool = env("NODE_ENV").as_deref() == Some("development");
    let state: AppState = AppState::new(Arc::new(UserStore::new(&client)), config.clone(), verify_endpoint, verify_type, development);
    let port: f64 = resolve_port(config.server_url.as_deref());
    log.info(|| LogRecord::msg("Listening on port").with_data(json!({ "port": port })));
    let served: Result<(), String> = start_server(create_app(Arc::new(state)), port, is_development_or_test(env), &certs_dir()).await;
    drop(memory);
    served
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn env(pairs: &[(&str, &str)]) -> EnvLookup {
        let map: HashMap<String, String> = pairs.iter().map(|(name, value)| (name.to_string(), value.to_string())).collect();
        Arc::new(move |name: &str| map.get(name).cloned())
    }

    #[test]
    fn resolves_the_verify_endpoint() {
        assert_eq!(resolve_verify_endpoint(&env(&[("PROSOPO_VERIFY_ENDPOINT", "https://self/siteverify")])), "https://self/siteverify");
        assert_eq!(resolve_verify_endpoint(&env(&[("NODE_ENV", "staging")])), "https://staging-api.prosopo.io/siteverify");
        assert_eq!(resolve_verify_endpoint(&env(&[("NODE_ENV", "production")])), "https://api.prosopo.io/siteverify");
        assert_eq!(resolve_verify_endpoint(&env(&[])), "https://api.prosopo.io/siteverify");
        assert_eq!(resolve_verify_endpoint(&env(&[("NODE_ENV", "")])), "https://api.prosopo.io/siteverify");
    }

    #[test]
    fn resolves_the_verify_type() {
        assert_eq!(resolve_verify_type(&env(&[("PROSOPO_VERIFICATION_TYPE", "local")])), VerificationType::Local);
        assert_eq!(resolve_verify_type(&env(&[("PROSOPO_VERIFICATION_TYPE", "api")])), VerificationType::Api);
        assert_eq!(resolve_verify_type(&env(&[("PROSOPO_VERIFICATION_TYPE", "Local")])), VerificationType::Api);
        assert_eq!(resolve_verify_type(&env(&[])), VerificationType::Api);
    }

    #[test]
    fn is_development_or_test_only_for_those() {
        assert!(is_development_or_test(&env(&[("NODE_ENV", "development")])));
        assert!(is_development_or_test(&env(&[("NODE_ENV", "test")])));
        assert!(!is_development_or_test(&env(&[("NODE_ENV", "production")])));
        assert!(!is_development_or_test(&env(&[])));
    }

    #[test]
    fn resolves_the_port() {
        assert_eq!(resolve_port(Some("https://localhost:9230")), 9230.0);
        assert_eq!(resolve_port(None), 9228.0);
        assert_eq!(resolve_port(Some("https://localhost")), 9228.0);
        assert_eq!(resolve_port(Some("https://localhost:abc")), 9228.0);
        assert_eq!(resolve_port(Some("http://h:12/x")), 12.0);
    }

    #[test]
    fn matches_routes_as_express_does() {
        assert_eq!(route_path("/Public/"), "/public");
        assert_eq!(route_path("/"), "/");
        assert_eq!(route_path("/public//"), "/public/");
    }

    async fn app_on_free_port(development_or_test: bool, certs: &Path) -> u16 {
        let port: u16 = std::net::TcpListener::bind("127.0.0.1:0").and_then(|listener| listener.local_addr()).expect("a free port").port();
        let client: mongodb::Client = mongodb::Client::with_uri_str("mongodb://127.0.0.1:1/").await.expect("a lazy client");
        let config: ProsopoServerConfig = get_server_config(&env(&[])).expect("a config");
        let state: AppState = AppState::new(Arc::new(UserStore::new(&client)), config, String::new(), VerificationType::Api, false);
        let app: Router = create_app(Arc::new(state));
        let certs: PathBuf = certs.to_path_buf();
        tokio::spawn(async move { start_server(app, f64::from(port), development_or_test, &certs).await });
        for _ in 0..100 {
            if tokio::net::TcpStream::connect(("127.0.0.1", port)).await.is_ok() {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        }
        port
    }

    async fn health(url: String) -> Option<u16> {
        let client: reqwest::Client = reqwest::Client::builder().danger_accept_invalid_certs(true).build().expect("a client");
        client.get(url).send().await.ok().map(|response| response.status().as_u16())
    }

    fn fixture_certs() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("rust/fixtures/certs")
    }

    #[tokio::test]
    async fn serves_https_in_development_when_the_certificates_exist() {
        let port: u16 = app_on_free_port(true, &fixture_certs()).await;
        assert_eq!(health(format!("https://127.0.0.1:{port}/health")).await, Some(200));
        assert_eq!(health(format!("http://127.0.0.1:{port}/health")).await, None);
    }

    #[tokio::test]
    async fn falls_back_to_http_in_development_without_certificates() {
        let port: u16 = app_on_free_port(true, Path::new("/nonexistent")).await;
        assert_eq!(health(format!("http://127.0.0.1:{port}/health")).await, Some(200));
    }

    #[tokio::test]
    async fn serves_plain_http_in_production_even_with_certificates() {
        let port: u16 = app_on_free_port(false, &fixture_certs()).await;
        assert_eq!(health(format!("http://127.0.0.1:{port}/health")).await, Some(200));
    }

    #[tokio::test]
    async fn refuses_a_port_node_would_refuse() {
        let app: Router = Router::new();
        assert_eq!(
            start_server(app, 70000.0, false, Path::new("/nonexistent")).await,
            Err("options.port should be >= 0 and < 65536. Received type number (70000).".to_string())
        );
    }

    #[test]
    fn appends_to_vary_once() {
        let mut headers: HeaderMap = HeaderMap::new();
        vary(&mut headers, "Origin");
        vary(&mut headers, "origin");
        vary(&mut headers, "Access-Control-Request-Headers");
        assert_eq!(headers.get(http::header::VARY).and_then(|value| value.to_str().ok()), Some("Origin, Access-Control-Request-Headers"));
    }
}
