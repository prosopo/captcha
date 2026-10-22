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

//! `prosopo-provider --api` against a live MongoDB and Redis Stack: the public routes, the
//! header check, and express's 404 past the stages ported so far. Ignored by default; run
//! with `cargo test -p prosopo-cli --test binary -- --ignored`. MongoDB is
//! `127.0.0.1:${PROSOPO_TEST_MONGO_PORT:-27999}` with a `root`/`root` user, as the provider's
//! default connection string expects; Redis is `REDIS_CONNECTION_URL` (default
//! `redis://localhost:6379`) with `REDIS_CONNECTION_PASSWORD` (default `root`).

use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

const PORT: u16 = 19_331;

fn get(path: &str) -> Option<String> {
    get_with(path, "")
}

fn get_with(path: &str, headers: &str) -> Option<String> {
    let mut stream: TcpStream = TcpStream::connect(("127.0.0.1", PORT)).ok()?;
    write!(stream, "GET {path} HTTP/1.1\r\nHost: localhost\r\n{headers}Connection: close\r\n\r\n").ok()?;
    let mut response: String = String::new();
    stream.read_to_string(&mut response).ok()?;
    Some(response)
}

struct Running(Child);

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.0.kill();
    }
}

#[test]
#[ignore = "needs MongoDB and Redis Stack"]
fn serves_the_phase_0_routes() {
    let directory: std::path::PathBuf = std::env::temp_dir().join("prosopo-provider-binary-test");
    std::fs::create_dir_all(&directory).expect("a working directory");
    let variable = |name: &str, default: &str| std::env::var(name).unwrap_or_else(|_| default.to_string());
    let child: Child = Command::new(env!("CARGO_BIN_EXE_prosopo-provider"))
        .arg("--api")
        .current_dir(&directory)
        .env_clear()
        .env("PATH", variable("PATH", "/usr/bin:/bin"))
        .env("CADDY_DOMAIN", "pronode9.example")
        .env("PROSOPO_IPAPI_KEY", "key")
        .env("PROSOPO_IPAPI_URL", "https://api.ipapi.is")
        .env("PROSOPO_PROVIDER_MNEMONIC", "bottom drive obey lake curtain smoke basket hold race lonely fit walk")
        .env("PROSOPO_ADMIN_ADDRESS", "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty")
        .env("PROSOPO_DATABASE_HOST", "127.0.0.1")
        .env("PROSOPO_DATABASE_PORT", variable("PROSOPO_TEST_MONGO_PORT", "27999"))
        .env("PROSOPO_DATABASE_NAME", "provider_binary_test")
        .env("PROSOPO_DATABASE_AUTH_SOURCE", "admin")
        .env("REDIS_CONNECTION_URL", variable("REDIS_CONNECTION_URL", "redis://localhost:6379"))
        .env("REDIS_CONNECTION_PASSWORD", variable("REDIS_CONNECTION_PASSWORD", "root"))
        .env("PROSOPO_API_PORT", PORT.to_string())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("the binary starts");
    let _running: Running = Running(child);
    let deadline: Instant = Instant::now() + Duration::from_secs(30);
    let healthz: String = loop {
        if let Some(response) = get("/healthz") {
            break response;
        }
        assert!(Instant::now() < deadline, "the API did not come up");
        std::thread::sleep(Duration::from_millis(200));
    };
    assert!(healthz.starts_with("HTTP/1.1 200 OK"), "{healthz}");
    assert!(healthz.ends_with("{\"ok\":true,\"host\":\"pronode9.example\"}"), "{healthz}");
    let details: String = get("/v1/prosopo/provider/public/details").expect("details");
    assert!(details.contains("\"message\":\"Provider online\""), "{details}");
    assert!(details.contains("{\"actor\":\"General\",\"isReady\":true"), "{details}");
    let metrics: String = get("/metrics").expect("metrics");
    assert!(metrics.contains("prosopo_redis_ready{actor=\"uap\"} 1"), "{metrics}");
    let unsigned: String = get("/v1/prosopo/provider/client/captcha/pow").expect("an answer");
    assert!(unsigned.starts_with("HTTP/1.1 401 Unauthorized"), "{unsigned}");
    let accounts: &str = "Prosopo-User: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY\r\nProsopo-Site-Key: 5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y\r\n";
    let unported: String = get_with("/v1/prosopo/provider/client/captcha/pow", accounts).expect("an answer");
    assert!(unported.starts_with("HTTP/1.1 404 Not Found"), "{unported}");
}
