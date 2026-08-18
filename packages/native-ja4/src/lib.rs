#[macro_use]
extern crate napi_derive;

mod ja4;

use napi::bindgen_prelude::{Buffer, Error, Status};

/// Compute a JA4 TLS fingerprint from raw ClientHello bytes.
///
/// Uses the vendored JA4 parser in `src/ja4.rs`. Parity with any external
/// reference implementation is checked by the vitest suite in
/// packages/provider/src/tests/unit/api/ja4.unit.test.ts.
#[napi(js_name = "calculateJa4")]
pub fn calculate_ja4(data: Buffer) -> napi::Result<String> {
    ja4::Ja4::from_client_hello(data.as_ref())
        .map(|parsed| parsed.ja4)
        .map_err(|e| Error::new(Status::InvalidArg, format!("{:?}", e)))
}
