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

// Ported from rust/equivalence/generate.ts: asserts the Rust output matches the TS output
// recorded in vectors.json.

use std::borrow::Cow;
use std::sync::Arc;

use serde::Deserialize;
use serde_json::Value;

use crate::test_endpoints::{EndpointWithArgs, EndpointWithoutArgs, SiteKeyArgs, ThrowingEndpoint};
use crate::{
    ApiEndpoint, ApiEndpointResponse, ApiEndpointResponseStatus, ApiRequestError, ApiRouteLimit,
    ApiRouteLimits, ApiRoutes, DynApiEndpoint, NoArgs, RequestArgs, RouteKey,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

#[derive(Deserialize)]
struct Vectors {
    status: StatusVector,
    responses: Vec<ResponseVector>,
    parse: Vec<ParseVector>,
    #[serde(rename = "noArgs")]
    no_args: NoArgsVector,
    throwing: ThrowingVector,
    routes: RoutesVector,
    limits: Vec<LimitsVector>,
}

#[derive(Deserialize)]
struct StatusVector {
    keys: Vec<String>,
    values: Vec<String>,
}

#[derive(Deserialize)]
struct ResponseVector {
    response: ApiEndpointResponse,
    json: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ParseVector {
    success: bool,
    output: Option<Value>,
    response: Option<Value>,
    issues: Option<Value>,
    message: Option<String>,
    error_json: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NoArgsVector {
    schema_is_undefined: bool,
    response: Value,
    json: String,
}

#[derive(Deserialize)]
struct ThrowingVector {
    message: String,
}

#[derive(Deserialize)]
struct RoutesVector {
    keys: Vec<String>,
}

#[derive(Deserialize)]
struct LimitsVector {
    limits: serde_json::Map<String, Value>,
    keys: Vec<String>,
    json: String,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn block_on<F: std::future::Future>(future: F) -> F::Output {
    tokio::runtime::Builder::new_current_thread()
        .build()
        .expect("runtime")
        .block_on(future)
}

/// serde decodes both a missing `input` (TS `undefined`) and `"input": null` as `None`, so the
/// inputs are read from the raw JSON to keep the two apart.
fn raw_inputs() -> Vec<Option<Value>> {
    let raw: Value = serde_json::from_str(VECTORS).expect("vectors.json parses");
    raw["parse"]
        .as_array()
        .expect("parse is an array")
        .iter()
        .map(|vector| vector.get("input").cloned())
        .collect()
}

#[test]
fn equivalence_status_members() {
    let vectors = vectors();
    let values: Vec<&str> = ApiEndpointResponseStatus::ALL
        .iter()
        .map(|status| status.as_str())
        .collect();
    assert_eq!(vectors.status.values, values);
    assert_eq!(vectors.status.keys, values);
}

#[test]
fn equivalence_response_serialisation() {
    let vectors = vectors();
    assert!(!vectors.responses.is_empty());
    for vector in vectors.responses {
        assert_eq!(
            serde_json::to_string(&vector.response).unwrap(),
            vector.json,
            "{:?}",
            vector.response
        );
    }
}

#[test]
fn equivalence_request_args_parsing() {
    let vectors = vectors();
    let inputs = raw_inputs();
    assert_eq!(inputs.len(), vectors.parse.len());
    let schema = SiteKeyArgs::get_request_args_schema().expect("has a schema");
    for (vector, input) in vectors.parse.into_iter().zip(inputs) {
        let parsed = schema.safe_parse(input.as_ref());
        let handled = block_on(DynApiEndpoint::handle_request(
            &EndpointWithArgs,
            input.as_ref(),
            None,
        ));
        if vector.success {
            assert_eq!(parsed.ok(), vector.output, "{input:?}");
            let response = serde_json::to_value(handled.expect("processed")).unwrap();
            assert_eq!(Some(response), vector.response, "{input:?}");
        } else {
            let error = parsed.expect_err("rejected");
            assert_eq!(
                Some(serde_json::to_value(&error.issues).unwrap()),
                vector.issues,
                "{input:?}"
            );
            assert_eq!(Some(error.message()), vector.message, "{input:?}");
            assert_eq!(
                Some(serde_json::to_string(&error).unwrap()),
                vector.error_json,
                "{input:?}"
            );
            match handled {
                Err(ApiRequestError::Parse(handled_error)) => assert_eq!(handled_error, error),
                other => panic!("expected a parse error for {input:?}, got {other:?}"),
            }
        }
    }
}

#[test]
fn equivalence_endpoint_without_args() {
    let vector = vectors().no_args;
    assert_eq!(
        EndpointWithoutArgs.get_request_args_schema().is_none(),
        vector.schema_is_undefined
    );
    let response = block_on(EndpointWithoutArgs.process_request(NoArgs, None)).unwrap();
    assert_eq!(serde_json::to_value(&response).unwrap(), vector.response);
    assert_eq!(serde_json::to_string(&response).unwrap(), vector.json);
}

#[test]
fn equivalence_throwing_endpoint() {
    let vector = vectors().throwing;
    let error = block_on(ThrowingEndpoint.process_request(NoArgs, None)).unwrap_err();
    assert_eq!(error.to_string(), vector.message);
}

#[test]
fn equivalence_route_table_order() {
    let vector = vectors().routes;
    let mut routes: ApiRoutes = ApiRoutes::new();
    routes.insert("/without".to_string(), Arc::new(EndpointWithoutArgs));
    routes.insert("/with".to_string(), Arc::new(EndpointWithArgs));
    routes.insert("/throwing".to_string(), Arc::new(ThrowingEndpoint));
    let keys: Vec<String> = routes.keys().cloned().collect();
    assert_eq!(keys, vector.keys);
}

macro_rules! route_enum {
    ($name:ident { $($variant:ident => $key:literal),+ $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        enum $name {
            $($variant),+
        }

        impl RouteKey for $name {
            const ALL: &'static [$name] = &[$($name::$variant),+];

            fn route_key(self) -> Cow<'static, str> {
                Cow::Borrowed(match self {
                    $($name::$variant => $key),+
                })
            }
        }
    };
}

route_enum!(StringRoute { Verify => "verify", Submit => "submit" });
route_enum!(NumericRoute { Ten => "10", Two => "2", Zero => "0" });
route_enum!(MixedRoute { B => "/v1/b", One => "1", A => "/v1/a", ZeroOne => "01" });

fn assert_limits<E: RouteKey>(vector: &LimitsVector) {
    let entries: Vec<(E, ApiRouteLimit)> = E::ALL
        .iter()
        .map(|route| {
            let limit = vector.limits[route.route_key().as_ref()].clone();
            (*route, serde_json::from_value(limit).expect("limit parses"))
        })
        .collect();
    let limits = ApiRouteLimits::<E>::from_entries(entries).expect("total");
    assert_eq!(limits.keys(), vector.keys);
    assert_eq!(serde_json::to_string(&limits).unwrap(), vector.json);
}

#[test]
fn equivalence_route_limits() {
    let vectors = vectors();
    assert_eq!(vectors.limits.len(), 3);
    assert_limits::<StringRoute>(&vectors.limits[0]);
    assert_limits::<NumericRoute>(&vectors.limits[1]);
    assert_limits::<MixedRoute>(&vectors.limits[2]);
}
