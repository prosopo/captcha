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

use std::fmt;
use std::future::Future;
use std::pin::Pin;

use prosopo_logger::Logger;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::response::ApiEndpointResponse;
use crate::validation::{Validate, ValidationError, ValidationIssue};

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// Whatever an endpoint fails with. Nothing in this contract turns it into a FAIL response:
/// the layer that mounts the endpoint decides how to report it.
pub type ApiEndpointError = Box<dyn std::error::Error + Send + Sync>;

/// The value `getRequestArgsSchema()` returns when an endpoint has a schema.
#[derive(Debug, Clone, Copy)]
pub struct RequestArgsSchema {
    validate: fn(Option<&Value>) -> Result<Value, ValidationError>,
}

impl RequestArgsSchema {
    pub fn of<T: Validate>() -> RequestArgsSchema {
        RequestArgsSchema {
            validate: T::validate,
        }
    }

    /// zod's `safeParse`: the parsed output, or the issues.
    pub fn safe_parse(&self, input: Option<&Value>) -> Result<Value, ValidationError> {
        (self.validate)(input)
    }
}

/// The type an endpoint's `process_request` receives. Implemented for every
/// `DeserializeOwned + Validate` type, and for [`NoArgs`].
pub trait RequestArgs: Sized + Send + 'static {
    fn get_request_args_schema() -> Option<RequestArgsSchema>;

    /// `None` is an absent (`undefined`) body.
    fn parse_request_args(body: Option<&Value>) -> Result<Self, ValidationError>;
}

impl<T: DeserializeOwned + Validate + Send + 'static> RequestArgs for T {
    fn get_request_args_schema() -> Option<RequestArgsSchema> {
        Some(RequestArgsSchema::of::<T>())
    }

    fn parse_request_args(body: Option<&Value>) -> Result<T, ValidationError> {
        let output = T::validate(body)?;
        // Only reachable if a Validate impl outputs something its own serde type rejects.
        serde_json::from_value(output)
            .map_err(|error| ValidationIssue::custom(Vec::new(), error.to_string()).into())
    }
}

/// The args of an endpoint whose schema is `undefined`: the body is never inspected.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct NoArgs;

impl RequestArgs for NoArgs {
    fn get_request_args_schema() -> Option<RequestArgsSchema> {
        None
    }

    fn parse_request_args(_body: Option<&Value>) -> Result<NoArgs, ValidationError> {
        Ok(NoArgs)
    }
}

pub trait ApiEndpoint: Send + Sync {
    type Args: RequestArgs;

    fn process_request(
        &self,
        args: Self::Args,
        logger: Option<&Logger>,
    ) -> impl Future<Output = Result<ApiEndpointResponse, ApiEndpointError>> + Send;
}

#[derive(Debug)]
pub enum ApiRequestError {
    /// The body did not satisfy the schema; `processRequest` was not called.
    Parse(ValidationError),
    /// `processRequest` itself failed.
    Process(ApiEndpointError),
}

impl fmt::Display for ApiRequestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiRequestError::Parse(error) => fmt::Display::fmt(error, f),
            ApiRequestError::Process(error) => fmt::Display::fmt(error, f),
        }
    }
}

impl std::error::Error for ApiRequestError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ApiRequestError::Parse(error) => Some(error),
            ApiRequestError::Process(error) => Some(error.as_ref()),
        }
    }
}

/// Object-safe form of [`ApiEndpoint`], so endpoints with different args types share a route
/// table. Implemented for every `ApiEndpoint`, which is how an endpoint's
/// `get_request_args_schema()` is reached.
pub trait DynApiEndpoint: Send + Sync {
    fn get_request_args_schema(&self) -> Option<RequestArgsSchema>;

    /// Parses `body` against the schema, then processes it: what the express adapter does
    /// with `schema?.parse(request.body)` followed by `processRequest(args, logger)`.
    fn handle_request<'a>(
        &'a self,
        body: Option<&Value>,
        logger: Option<&'a Logger>,
    ) -> BoxFuture<'a, Result<ApiEndpointResponse, ApiRequestError>>;
}

impl<E: ApiEndpoint> DynApiEndpoint for E {
    fn get_request_args_schema(&self) -> Option<RequestArgsSchema> {
        E::Args::get_request_args_schema()
    }

    fn handle_request<'a>(
        &'a self,
        body: Option<&Value>,
        logger: Option<&'a Logger>,
    ) -> BoxFuture<'a, Result<ApiEndpointResponse, ApiRequestError>> {
        let parsed = E::Args::parse_request_args(body);
        Box::pin(async move {
            let args = parsed.map_err(ApiRequestError::Parse)?;
            self.process_request(args, logger)
                .await
                .map_err(ApiRequestError::Process)
        })
    }
}
