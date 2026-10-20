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

use std::borrow::Cow;
use std::sync::Arc;

use prosopo_logger::Logger;
use serde_json::{json, Value};

use crate::test_endpoints::{EndpointWithArgs, EndpointWithoutArgs, SiteKeyArgs, ThrowingEndpoint};
use crate::{
    ApiEndpoint, ApiEndpointError, ApiEndpointResponse, ApiEndpointResponseStatus, ApiRequestError,
    ApiRouteLimit, ApiRouteLimits, ApiRoutes, ApiRoutesProvider, DynApiEndpoint, NoArgs,
    RequestArgs, RequestArgsSchema, RouteKey,
};

fn block_on<F: std::future::Future>(future: F) -> F::Output {
    tokio::runtime::Builder::new_current_thread()
        .build()
        .expect("runtime")
        .block_on(future)
}

fn site_key_args() -> SiteKeyArgs {
    SiteKeyArgs {
        site_key: "abc".to_string(),
    }
}

mod unit {
    // Ported from src/tests/apiRoute.unit.test.ts

    use super::*;

    #[test]
    fn status_keeps_the_exact_strings_clients_compare_against() {
        assert_eq!(ApiEndpointResponseStatus::Success.as_str(), "SUCCESS");
        assert_eq!(ApiEndpointResponseStatus::Fail.as_str(), "FAIL");
        assert_eq!(ApiEndpointResponseStatus::Processing.as_str(), "PROCESSING");
        assert_eq!(
            serde_json::to_value(ApiEndpointResponseStatus::Success).unwrap(),
            json!("SUCCESS")
        );
        assert_eq!(
            serde_json::to_value(ApiEndpointResponseStatus::Fail).unwrap(),
            json!("FAIL")
        );
        assert_eq!(
            serde_json::to_value(ApiEndpointResponseStatus::Processing).unwrap(),
            json!("PROCESSING")
        );
    }

    #[test]
    fn status_declares_exactly_three_statuses() {
        // The exhaustive match stops compiling if a fourth member is added.
        let index = |status: ApiEndpointResponseStatus| -> usize {
            match status {
                ApiEndpointResponseStatus::Success => 0,
                ApiEndpointResponseStatus::Fail => 1,
                ApiEndpointResponseStatus::Processing => 2,
            }
        };
        assert_eq!(ApiEndpointResponseStatus::ALL.len(), 3);
        for (position, status) in ApiEndpointResponseStatus::ALL.into_iter().enumerate() {
            assert_eq!(index(status), position);
        }
    }

    #[test]
    fn status_is_a_string_enum_with_no_reverse_numeric_mapping() {
        let values: Vec<&str> = ApiEndpointResponseStatus::ALL
            .iter()
            .map(|status| status.as_str())
            .collect();
        assert_eq!(values, ["SUCCESS", "FAIL", "PROCESSING"]);
        assert!(serde_json::from_value::<ApiEndpointResponseStatus>(json!(0)).is_err());
        assert!("0".parse::<ApiEndpointResponseStatus>().is_err());
        assert_eq!(
            "PROCESSING".parse::<ApiEndpointResponseStatus>(),
            Ok(ApiEndpointResponseStatus::Processing)
        );
    }

    #[test]
    fn status_distinguishes_failure_from_a_still_running_request() {
        assert_ne!(
            ApiEndpointResponseStatus::Processing,
            ApiEndpointResponseStatus::Fail
        );
        assert_ne!(
            ApiEndpointResponseStatus::Processing,
            ApiEndpointResponseStatus::Success
        );
    }

    #[test]
    fn re_exports_the_status_enum_from_the_crate_root() {
        let inner: crate::status::ApiEndpointResponseStatus =
            crate::ApiEndpointResponseStatus::Fail;
        assert_eq!(inner, crate::ApiEndpointResponseStatus::Fail);
    }

    #[test]
    fn lets_an_implementation_validate_its_own_arguments_with_its_schema() {
        let schema: RequestArgsSchema = EndpointWithArgs
            .get_request_args_schema()
            .expect("has a schema");
        let parsed = schema.safe_parse(Some(&json!({ "siteKey": "abc" })));
        assert!(parsed.is_ok());
    }

    #[test]
    fn rejects_arguments_the_endpoints_own_schema_does_not_accept() {
        let schema: RequestArgsSchema = EndpointWithArgs
            .get_request_args_schema()
            .expect("has a schema");
        assert!(schema.safe_parse(Some(&json!({}))).is_err());
    }

    #[test]
    fn allows_an_endpoint_that_takes_no_arguments_at_all() {
        assert!(EndpointWithoutArgs.get_request_args_schema().is_none());
        let response = block_on(EndpointWithoutArgs.process_request(NoArgs, None)).unwrap();
        assert_eq!(
            response,
            ApiEndpointResponse::new(ApiEndpointResponseStatus::Success)
        );
    }

    #[test]
    fn carries_the_request_arguments_through_to_the_response() {
        let response = block_on(EndpointWithArgs.process_request(site_key_args(), None)).unwrap();
        assert_eq!(
            response,
            ApiEndpointResponse {
                status: ApiEndpointResponseStatus::Success,
                data: Some(json!({ "siteKey": "abc" })),
                error: None,
            }
        );
    }

    #[test]
    fn permits_a_response_with_neither_data_nor_error() {
        let response: ApiEndpointResponse =
            block_on(EndpointWithoutArgs.process_request(NoArgs, None)).unwrap();
        assert_eq!(response.data, None);
        assert_eq!(response.error, None);
    }

    #[test]
    fn holds_endpoints_with_differing_schemas_in_one_routes_record() {
        struct Provider {
            routes: ApiRoutes,
        }
        impl ApiRoutesProvider for Provider {
            fn get_routes(&self) -> ApiRoutes {
                self.routes.clone()
            }
        }
        let mut routes: ApiRoutes = ApiRoutes::new();
        routes.insert("/with".to_string(), Arc::new(EndpointWithArgs));
        routes.insert("/without".to_string(), Arc::new(EndpointWithoutArgs));
        let provider = Provider { routes };

        let keys: Vec<String> = provider.get_routes().keys().cloned().collect();
        assert_eq!(keys, ["/with", "/without"]);
    }

    #[test]
    fn tolerates_a_provider_that_exposes_no_routes() {
        struct Provider;
        impl ApiRoutesProvider for Provider {
            fn get_routes(&self) -> ApiRoutes {
                ApiRoutes::new()
            }
        }
        assert_eq!(Provider.get_routes().len(), 0);
    }

    #[test]
    fn surfaces_a_rejection_rather_than_swallowing_it_into_a_fail_response() {
        let error: ApiEndpointError =
            block_on(ThrowingEndpoint.process_request(NoArgs, None)).unwrap_err();
        assert_eq!(error.to_string(), "boom");

        let handled = block_on(DynApiEndpoint::handle_request(
            &ThrowingEndpoint,
            None,
            None,
        ));
        match handled {
            Err(ApiRequestError::Process(error)) => assert_eq!(error.to_string(), "boom"),
            other => panic!("expected a process error, got {other:?}"),
        }
    }
}

mod contracts {
    // Ported from src/tests/apiRoute.test-d.ts; the @ts-expect-error halves are compile_fail
    // doctests in compile_fail.rs.

    use super::*;

    fn assert_args<E: ApiEndpoint<Args = A>, A: RequestArgs>(_endpoint: &E) {}

    #[test]
    fn process_request_takes_the_parsed_arguments_when_the_endpoint_declares_a_schema() {
        assert_args::<EndpointWithArgs, SiteKeyArgs>(&EndpointWithArgs);
        let response = block_on(EndpointWithArgs.process_request(site_key_args(), None)).unwrap();
        assert_eq!(response.status, ApiEndpointResponseStatus::Success);
    }

    #[test]
    fn process_request_takes_no_arguments_at_all_when_the_schema_is_undefined() {
        assert_args::<EndpointWithoutArgs, NoArgs>(&EndpointWithoutArgs);
        assert!(NoArgs::get_request_args_schema().is_none());
        assert_eq!(
            NoArgs::parse_request_args(Some(&json!({ "siteKey": "abc" }))).unwrap(),
            NoArgs
        );
    }

    #[test]
    fn process_request_keeps_the_logger_optional_on_both_branches() {
        let logger = Logger::new("api-route-test");
        assert!(block_on(EndpointWithArgs.process_request(site_key_args(), None)).is_ok());
        assert!(block_on(EndpointWithArgs.process_request(site_key_args(), Some(&logger))).is_ok());
        assert!(block_on(EndpointWithoutArgs.process_request(NoArgs, None)).is_ok());
        assert!(block_on(EndpointWithoutArgs.process_request(NoArgs, Some(&logger))).is_ok());
    }

    #[test]
    fn process_request_always_resolves_to_a_response_never_to_void() {
        let with_args: Result<ApiEndpointResponse, ApiEndpointError> =
            block_on(EndpointWithArgs.process_request(site_key_args(), None));
        let without_args: Result<ApiEndpointResponse, ApiEndpointError> =
            block_on(EndpointWithoutArgs.process_request(NoArgs, None));
        assert!(with_args.is_ok());
        assert!(without_args.is_ok());
    }

    #[test]
    fn process_request_rejects_arguments_that_do_not_match_the_declared_schema() {
        let handled = block_on(DynApiEndpoint::handle_request(
            &EndpointWithArgs,
            Some(&json!({})),
            None,
        ));
        assert!(matches!(handled, Err(ApiRequestError::Parse(_))));
    }

    #[test]
    fn process_request_ignores_a_body_sent_to_an_argument_free_endpoint() {
        let handled = block_on(DynApiEndpoint::handle_request(
            &EndpointWithoutArgs,
            Some(&json!({ "siteKey": "abc" })),
            None,
        ));
        assert_eq!(
            handled.unwrap(),
            ApiEndpointResponse::new(ApiEndpointResponseStatus::Success)
        );
    }

    #[test]
    fn get_request_args_schema_returns_exactly_the_schema_the_endpoint_was_parameterised_with() {
        let schema = EndpointWithArgs
            .get_request_args_schema()
            .expect("has a schema");
        let direct = SiteKeyArgs::get_request_args_schema().expect("has a schema");
        for input in [json!({ "siteKey": "abc" }), json!({}), json!(null)] {
            assert_eq!(
                schema.safe_parse(Some(&input)),
                direct.safe_parse(Some(&input))
            );
        }
        assert!(EndpointWithoutArgs.get_request_args_schema().is_none());
    }

    #[test]
    fn get_request_args_schema_takes_no_arguments() {
        let get: fn() -> Option<RequestArgsSchema> =
            <NoArgs as RequestArgs>::get_request_args_schema;
        assert!(get().is_none());
    }

    #[test]
    fn response_requires_a_status_and_nothing_else() {
        let response = ApiEndpointResponse::new(ApiEndpointResponseStatus::Success);
        assert_eq!(
            serde_json::to_string(&response).unwrap(),
            r#"{"status":"SUCCESS"}"#
        );
        assert!(serde_json::from_value::<ApiEndpointResponse>(json!({ "data": {} })).is_err());
    }

    #[test]
    fn response_keeps_data_and_error_independently_optional() {
        let data: Option<Value> = None;
        let error: Option<String> = None;
        let both = ApiEndpointResponse {
            status: ApiEndpointResponseStatus::Fail,
            data: Some(json!({ "partial": true })),
            error: Some("partial failure".to_string()),
        };
        assert_eq!(
            ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail)
                .with_data(json!({ "partial": true }))
                .with_error("partial failure"),
            both
        );
        assert_eq!(
            ApiEndpointResponse {
                status: ApiEndpointResponseStatus::Fail,
                data,
                error,
            },
            ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail)
        );
    }

    #[test]
    fn response_types_the_status_as_the_enum_not_a_bare_string() {
        let status: ApiEndpointResponseStatus =
            ApiEndpointResponse::new(ApiEndpointResponseStatus::Success).status;
        assert_eq!(status, ApiEndpointResponseStatus::Success);
        assert!(serde_json::from_value::<ApiEndpointResponse>(json!({ "status": "OK" })).is_err());
    }

    #[test]
    fn response_rejects_an_error_that_is_not_a_string() {
        let error: Option<String> = ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail)
            .with_error("boom")
            .error;
        assert_eq!(error.as_deref(), Some("boom"));
        assert!(serde_json::from_value::<ApiEndpointResponse>(
            json!({ "status": "FAIL", "error": { "message": "boom" } })
        )
        .is_err());
    }

    #[test]
    fn routes_are_keyed_by_route_string_and_valued_by_endpoints_of_any_schema() {
        let with_args: Arc<dyn DynApiEndpoint> = Arc::new(EndpointWithArgs);
        let without_args: Arc<dyn DynApiEndpoint> = Arc::new(EndpointWithoutArgs);
        let mut routes: ApiRoutes = ApiRoutes::new();
        routes.insert(String::from("/with"), with_args);
        routes.insert(String::from("/without"), without_args);
        assert!(routes["/with"].get_request_args_schema().is_some());
        assert!(routes["/without"].get_request_args_schema().is_none());
    }

    #[test]
    fn routes_accept_an_empty_record_for_a_provider_with_no_endpoints_yet() {
        let routes: ApiRoutes = ApiRoutes::new();
        assert!(routes.is_empty());
    }

    #[test]
    fn routes_provider_exposes_the_routes_through_a_method_not_a_property() {
        struct Provider;
        impl ApiRoutesProvider for Provider {
            fn get_routes(&self) -> ApiRoutes {
                ApiRoutes::new()
            }
        }
        let get_routes: fn(&Provider) -> ApiRoutes = Provider::get_routes;
        assert!(get_routes(&Provider).is_empty());
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum Route {
        Verify,
        Submit,
    }

    impl RouteKey for Route {
        const ALL: &'static [Route] = &[Route::Verify, Route::Submit];

        fn route_key(self) -> Cow<'static, str> {
            Cow::Borrowed(match self {
                Route::Verify => "verify",
                Route::Submit => "submit",
            })
        }
    }

    const LIMIT: ApiRouteLimit = ApiRouteLimit {
        window_ms: 1000,
        limit: 5,
    };

    #[test]
    fn route_limits_require_a_limit_for_every_member_of_the_route_enum() {
        let limits =
            ApiRouteLimits::<Route>::from_entries([(Route::Verify, LIMIT), (Route::Submit, LIMIT)])
                .unwrap();
        assert_eq!(limits.get(Route::Submit), &LIMIT);
        assert_eq!(
            ApiRouteLimits::<Route>::from_entries([(Route::Verify, LIMIT)])
                .unwrap_err()
                .0,
            "submit"
        );
        let total = ApiRouteLimits::<Route>::new(|_| LIMIT);
        assert_eq!(total.iter().count(), Route::ALL.len());
    }

    #[test]
    fn route_limits_require_both_the_window_and_the_count_on_each_limit() {
        assert!(serde_json::from_value::<ApiRouteLimit>(json!({ "windowMs": 1000 })).is_err());
        assert!(serde_json::from_value::<ApiRouteLimit>(json!({ "limit": 5 })).is_err());
        assert_eq!(
            serde_json::from_value::<ApiRouteLimit>(json!({ "windowMs": 1000, "limit": 5 }))
                .unwrap(),
            LIMIT
        );
    }

    #[test]
    fn route_limits_expose_the_entry_type_so_a_consumer_can_name_one_limit() {
        let limits = ApiRouteLimits::<Route>::new(|_| LIMIT);
        let entry: &ApiRouteLimit = limits.get(Route::Verify);
        assert_eq!(
            entry,
            &ApiRouteLimit {
                window_ms: 1000,
                limit: 5
            }
        );
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum NumericRoute {
        Zero,
        One,
    }

    impl RouteKey for NumericRoute {
        const ALL: &'static [NumericRoute] = &[NumericRoute::Zero, NumericRoute::One];

        fn route_key(self) -> Cow<'static, str> {
            Cow::Owned((self as u8).to_string())
        }
    }

    #[test]
    fn route_limits_work_with_a_numeric_route_enum_as_well_as_a_string_one() {
        let limits = ApiRouteLimits::<NumericRoute>::new(|_| LIMIT);
        assert_eq!(limits.keys(), ["0", "1"]);
        assert_eq!(
            serde_json::to_string(&limits).unwrap(),
            r#"{"0":{"windowMs":1000,"limit":5},"1":{"windowMs":1000,"limit":5}}"#
        );
    }
}
