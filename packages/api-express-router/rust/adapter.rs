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

//! `ApiExpressDefaultEndpointAdapter`: the one place a body is validated and the one place an
//! endpoint's failure becomes a response.

use crate::context::{RequestBody, RequestI18n, RequestLog};
use crate::errors::{error_response, json_response};
use axum::extract::Request;
use axum::response::Response;
use prosopo_api_route::{ApiRequestError, BoxFuture, DynApiEndpoint, ValidationError};
use prosopo_common::{
    ContextValue, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError,
};
use prosopo_logger::{get_logger, LogLevel, LogRecord, Logger};
use serde_json::Value;
use std::sync::Arc;

/// `ApiExpressEndpointAdapter`.
pub trait EndpointAdapter: Send + Sync {
    fn handle_request(&self, endpoint: Arc<dyn DynApiEndpoint>, request: Request) -> BoxFuture<'_, Response>;
}

pub struct DefaultEndpointAdapter {
    log_level: LogLevel,
    error_status_code: u16,
}

impl DefaultEndpointAdapter {
    /// `createApiExpressDefaultEndpointAdapter(logLevel, errorStatusCode = 500)`.
    pub fn new(log_level: LogLevel, error_status_code: Option<u16>) -> DefaultEndpointAdapter {
        DefaultEndpointAdapter {
            log_level,
            error_status_code: error_status_code.unwrap_or(500),
        }
    }

    /// The error a failed endpoint is answered with: its own when it knows its status, else
    /// `API.UNKNOWN` with this adapter's status, so its message never reaches the client.
    fn response_error(&self, error: &(dyn std::error::Error + Send + Sync + 'static)) -> ProsopoError {
        let own_status = |error: &ProsopoError| {
            error.class() == ErrorClass::Api || matches!(error.context().and_then(|context| context.get("code")), Some(ContextValue::Json(Value::Number(_))))
        };
        match error.downcast_ref::<ProsopoError>().filter(|error| own_status(error)) {
            Some(error) => error.clone(),
            None => ProsopoError::new(
                ErrorClass::Api,
                ErrorSource::key("API.UNKNOWN"),
                ErrorOptions {
                    context: Some(ErrorContext::new().with("code", self.error_status_code)),
                    silent: true,
                    ..ErrorOptions::default()
                },
            ),
        }
    }
}

/// `new ProsopoApiError("API.PARSE_ERROR", { context: { code: 400, error } })`.
fn parse_error(issues: &ValidationError) -> ProsopoError {
    let cause: ZodLikeError = ZodLikeError {
        message: issues.message(),
        issues: issues.issues.iter().filter_map(|issue| serde_json::to_value(issue).ok()).collect(),
    };
    ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key("API.PARSE_ERROR"),
        ErrorOptions {
            context: Some(ErrorContext::new().with("code", 400).with_error(cause)),
            ..ErrorOptions::default()
        },
    )
}

impl EndpointAdapter for DefaultEndpointAdapter {
    fn handle_request(&self, endpoint: Arc<dyn DynApiEndpoint>, request: Request) -> BoxFuture<'_, Response> {
        Box::pin(async move {
            let body: Option<Value> = request.extensions().get::<RequestBody>().map(|body| body.0.clone());
            let i18n: Option<RequestI18n> = request.extensions().get::<RequestI18n>().cloned();
            let logger: Logger = request
                .extensions()
                .get::<RequestLog>()
                .map(|log| log.logger.clone())
                .unwrap_or_else(|| get_logger(self.log_level, "api"));
            match endpoint.handle_request(body.as_ref(), Some(&logger)).await {
                Ok(response) => {
                    let body: Value = serde_json::to_value(&response).unwrap_or(Value::Null);
                    json_response(200, "OK", &body)
                }
                Err(ApiRequestError::Parse(issues)) => error_response(&ThrownError::from(parse_error(&issues)), i18n.as_ref()),
                Err(ApiRequestError::Process(error)) => {
                    logger.error(|| LogRecord::default().with_err(error.to_string()));
                    error_response(&ThrownError::from(self.response_error(error.as_ref())), i18n.as_ref())
                }
            }
        })
    }
}
