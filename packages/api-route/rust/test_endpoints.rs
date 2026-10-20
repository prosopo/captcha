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

// Ported from src/tests/apiRoute.unit.test.ts: the example endpoints its cases exercise.

use prosopo_logger::Logger;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::{
    parsed_type, ApiEndpoint, ApiEndpointError, ApiEndpointResponse, ApiEndpointResponseStatus,
    NoArgs, PathSegment, Validate, ValidationError, ValidationIssue,
};

/// `z.object({ siteKey: z.string() })`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteKeyArgs {
    pub site_key: String,
}

impl Validate for SiteKeyArgs {
    fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
        let Some(Value::Object(object)) = input else {
            return Err(
                ValidationIssue::invalid_type(Vec::new(), "object", parsed_type(input)).into(),
            );
        };
        match object.get("siteKey") {
            Some(Value::String(site_key)) => Ok(json!({ "siteKey": site_key })),
            other => Err(ValidationIssue::invalid_type(
                vec![PathSegment::from("siteKey")],
                "string",
                parsed_type(other),
            )
            .into()),
        }
    }
}

pub struct EndpointWithArgs;

impl ApiEndpoint for EndpointWithArgs {
    type Args = SiteKeyArgs;

    async fn process_request(
        &self,
        args: SiteKeyArgs,
        _logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success)
            .with_data(json!({ "siteKey": args.site_key })))
    }
}

pub struct EndpointWithoutArgs;

impl ApiEndpoint for EndpointWithoutArgs {
    type Args = NoArgs;

    async fn process_request(
        &self,
        _args: NoArgs,
        _logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        Ok(ApiEndpointResponse::new(ApiEndpointResponseStatus::Success))
    }
}

pub struct ThrowingEndpoint;

impl ApiEndpoint for ThrowingEndpoint {
    type Args = NoArgs;

    async fn process_request(
        &self,
        _args: NoArgs,
        _logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        Err("boom".into())
    }
}
