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

//! The cases of src/tests/mongooseOptions.unit.test.ts and src/tests/unit/base/mongo.unit.test.ts,
//! one for one, then the Rust-only ones.

use crate::mongo::{mask_credentials, MongoConnectionTimeouts, MongoDatabase};
use crate::options::{
    get_mongo_compressors, get_mongo_connection_options, ConnectionArgs, MongoCompressor,
    DEFAULT_CONNECT_TIMEOUT_MS, DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
};

const EXPLICIT: [MongoCompressor; 4] =
    [MongoCompressor::Zstd, MongoCompressor::Snappy, MongoCompressor::Zlib, MongoCompressor::None];

mod get_mongo_compressors_tests {
    use super::*;

    #[test]
    fn returns_the_default_empty_compressors_for_remote_domains() {
        for url in [
            "mongodb://user:pass@example.com:27017/db",
            "mongodb://abc.com/db",
            "mongodb://x.y.com:27017/db",
            "mongodb://cluster.mongodb.net/db",
            "mongodb://subdomain.example.com/db",
        ] {
            assert!(get_mongo_compressors(url, &[]).is_empty(), "{url}");
        }
    }

    #[test]
    fn returns_the_explicit_compressor_list_for_remote_domains_when_provided() {
        for url in ["mongodb://user:pass@example.com:27017/db", "mongodb://abc.com/db", "mongodb://cluster.mongodb.net/db"] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn returns_empty_array_for_local_hostnames_without_dots() {
        for url in ["mongodb://database:27017/db", "mongodb://db/db", "mongodb://mongo:27017/db", "mongodb://container-name/db"] {
            assert!(get_mongo_compressors(url, &EXPLICIT).is_empty(), "{url}");
        }
    }

    #[test]
    fn returns_empty_array_for_localhost_variants() {
        for url in ["mongodb://localhost:27017/db", "mongodb://127.0.0.1:27017/db", "mongodb://[::1]:27017/db"] {
            assert!(get_mongo_compressors(url, &EXPLICIT).is_empty(), "{url}");
        }
    }

    #[test]
    fn returns_the_explicit_list_for_ip_addresses_treated_as_remote() {
        for url in ["mongodb://192.168.1.1:27017/db", "mongodb://10.0.0.1/db", "mongodb://172.16.0.1:27017/db"] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn returns_the_explicit_list_for_ipv6_addresses_treated_as_remote() {
        for url in [
            "mongodb://[2001:0db8::1]:27017/db",
            "mongodb://[2001:0db8:85a3::8a2e:0370:7334]/db",
            "mongodb://[::ffff:192.168.1.1]:27017/db",
        ] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn uses_custom_compressors_when_provided() {
        let custom: [MongoCompressor; 2] = [MongoCompressor::Zstd, MongoCompressor::Snappy];
        assert_eq!(get_mongo_compressors("mongodb://example.com:27017/db", &custom), custom);
    }

    #[test]
    fn returns_empty_array_for_local_connections_even_with_custom_compressors() {
        let custom: [MongoCompressor; 2] = [MongoCompressor::Zstd, MongoCompressor::Snappy];
        assert!(get_mongo_compressors("mongodb://localhost:27017/db", &custom).is_empty());
    }

    #[test]
    fn handles_mongodb_srv_urls() {
        assert_eq!(get_mongo_compressors("mongodb+srv://cluster.mongodb.net/db", &EXPLICIT), EXPLICIT);
    }

    #[test]
    fn returns_the_provided_list_when_the_host_cannot_be_parsed() {
        for url in ["mongodb://::1:27017/db", "mongodb://[bad"] {
            assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT, "{url}");
        }
    }

    #[test]
    fn returns_empty_array_for_hostless_urls_and_bare_single_label_hosts() {
        for url in ["", "mongodb://", "not-a-url"] {
            assert!(get_mongo_compressors(url, &EXPLICIT).is_empty(), "{url:?}");
        }
    }

    #[test]
    fn handles_urls_with_authentication() {
        assert_eq!(get_mongo_compressors("mongodb://user:password@example.com:27017/db", &EXPLICIT), EXPLICIT);
    }

    #[test]
    fn handles_urls_with_query_parameters() {
        let url: &str = "mongodb://example.com:27017/db?authSource=admin&retryWrites=true";
        assert_eq!(get_mongo_compressors(url, &EXPLICIT), EXPLICIT);
    }
}

mod get_mongo_connection_options_tests {
    use super::*;

    fn args(url: &str) -> ConnectionArgs {
        ConnectionArgs {
            url: url.to_string(),
            app_name: "test-app".to_string(),
            ..ConnectionArgs::default()
        }
    }

    #[test]
    fn throws_on_an_empty_or_whitespace_only_url() {
        for url in ["", "   "] {
            let error = get_mongo_connection_options(&args(url)).expect_err("refused");
            assert!(error.to_string().contains("cannot be empty"), "{url:?}");
        }
    }

    #[test]
    fn applies_sensible_defaults() {
        let options = get_mongo_connection_options(&args("mongodb://example.com:27017/db")).expect("options");
        assert_eq!(options.app_name, "test-app");
        assert_eq!(options.max_pool_size, 10);
        assert_eq!(options.min_pool_size, 0);
        let mut driver = mongodb::options::ClientOptions::default();
        options.apply(&mut driver);
        let api = driver.server_api.expect("a server API");
        assert_eq!(api.version, mongodb::options::ServerApiVersion::V1);
        assert_eq!(api.strict, Some(false));
        assert_eq!(api.deprecation_errors, Some(false));
    }

    #[test]
    fn uses_no_compressors_for_localhost() {
        let options = get_mongo_connection_options(&args("mongodb://localhost:27017/db")).expect("options");
        assert!(options.compressors.is_empty());
    }

    #[test]
    fn uses_no_compressors_for_a_remote_host_default_is_no_compression() {
        let options = get_mongo_connection_options(&args("mongodb://cluster.mongodb.net/db")).expect("options");
        assert!(options.compressors.is_empty());
    }

    #[test]
    fn applies_pool_size_overrides() {
        let options = get_mongo_connection_options(&ConnectionArgs {
            max_pool_size: Some(50),
            min_pool_size: Some(5),
            ..args("mongodb://example.com:27017/db")
        })
        .expect("options");
        assert_eq!(options.max_pool_size, 50);
        assert_eq!(options.min_pool_size, 5);
    }

    #[test]
    fn defaults_the_connect_and_server_selection_timeouts() {
        let options = get_mongo_connection_options(&args("mongodb://example.com:27017/db")).expect("options");
        assert_eq!(options.connect_timeout_ms, DEFAULT_CONNECT_TIMEOUT_MS);
        assert_eq!(options.server_selection_timeout_ms, DEFAULT_SERVER_SELECTION_TIMEOUT_MS);
    }

    #[test]
    fn applies_connect_and_server_selection_timeout_overrides() {
        let options = get_mongo_connection_options(&ConnectionArgs {
            connect_timeout_ms: Some(45_000),
            server_selection_timeout_ms: Some(45_000),
            ..args("mongodb://example.com:27017/db")
        })
        .expect("options");
        assert_eq!(options.connect_timeout_ms, 45_000);
        assert_eq!(options.server_selection_timeout_ms, 45_000);
    }

    #[test]
    fn only_sets_db_name_when_provided() {
        let with_name = get_mongo_connection_options(&ConnectionArgs {
            db_name: Some("mydb".to_string()),
            ..args("mongodb://example.com:27017/db")
        })
        .expect("options");
        assert_eq!(with_name.db_name.as_deref(), Some("mydb"));
        let without = get_mongo_connection_options(&args("mongodb://example.com:27017/db")).expect("options");
        assert_eq!(without.db_name, None);
    }
}

mod mongo_database_connect {
    use super::*;

    /// No mongod listens on port 1, and a 300 ms server selection timeout keeps the test short.
    fn unreachable() -> MongoDatabase {
        MongoDatabase::new(
            "mongodb://user:pass@127.0.0.1:1/db",
            Some("db"),
            None,
            None,
            MongoConnectionTimeouts {
                connect_timeout_ms: Some(300),
                server_selection_timeout_ms: Some(300),
            },
        )
        .expect("a valid URL")
    }

    #[tokio::test]
    async fn destroys_a_connection_that_failed_to_open() {
        let db: MongoDatabase = unreachable();
        assert!(db.connect().await.is_err());
        assert!(!db.connected());
        assert!(db.database().await.is_err(), "no connection is kept");
    }

    /// Needs a mongod at PROSOPO_TEST_MONGO_URL.
    #[tokio::test]
    #[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
    async fn does_not_destroy_a_connection_that_already_opened() {
        let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
        let db: MongoDatabase =
            MongoDatabase::new(&url, Some("prosopo-test-connect"), None, None, MongoConnectionTimeouts::default())
                .expect("a valid URL");
        db.connect().await.expect("connects");
        assert!(db.connected());
        let database = db.database().await.expect("open");
        let missing = database.run_command(bson::doc! { "noSuchCommand": 1 }).await;
        assert!(missing.is_err(), "a failing command");
        assert!(db.connected(), "an error after opening does not tear the connection down");
        db.database().await.expect("still open").run_command(bson::doc! { "ping": 1 }).await.expect("still usable");
        db.close().await;
        assert!(!db.connected());
    }
}

mod rust_only {
    use super::*;

    #[test]
    fn masks_the_whole_password_and_leaves_a_url_without_credentials_alone() {
        assert_eq!(
            mask_credentials("mongodb://admin:S3cr3t-Pass+x@db.example:27017/prosopo"),
            "mongodb://%3CCredentials%3E@db.example:27017/prosopo"
        );
        assert_eq!(mask_credentials("mongodb://127.0.0.1:27017/prosopo"), "mongodb://127.0.0.1:27017/prosopo");
        assert_eq!(
            mask_credentials("mongodb+srv://svc:a.b.c@cluster0.example.net/prosopo"),
            "mongodb+srv://%3CCredentials%3E@cluster0.example.net/prosopo"
        );
    }

    #[test]
    fn rejects_an_endpoint_url_cannot_parse() {
        for url in ["   ", "not-a-url", "mongodb://h1:1,h2:2/db", "mongodb://[bad"] {
            assert!(MongoDatabase::new(url, None, None, None, MongoConnectionTimeouts::default()).is_err(), "{url}");
        }
    }
}
