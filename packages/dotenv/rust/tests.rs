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

// Ported from src/tests/env.unit.test.ts

use crate::{
    apply_env, load_env, parse, populate, sanitise_node_env, DotenvError, EnvContext, EnvFs, RealFs,
};
use prosopo_logger::{
    get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger, Sink,
    SystemClock,
};
use std::collections::HashMap;
use std::io;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;

const WORKSPACE_PKG_JSON: &str = r#"{"name":"@prosopo/captcha-private"}"#;

#[derive(Default)]
struct CaptureSink {
    lines: Mutex<Vec<String>>,
}

impl Sink for CaptureSink {
    fn write(&self, _method: ConsoleMethod, line: &str) {
        self.lines.lock().expect("sink lock").push(line.to_string());
    }
}

impl CaptureSink {
    fn messages(&self) -> Vec<String> {
        self.lines
            .lock()
            .expect("sink lock")
            .iter()
            .map(|line| {
                let value: serde_json::Value = serde_json::from_str(line).expect("json log line");
                value["msg"].as_str().unwrap_or_default().to_string()
            })
            .collect()
    }
}

fn logger_at(level: LogLevel) -> (Logger, Arc<CaptureSink>) {
    let sink = Arc::new(CaptureSink::default());
    let runtime = LogRuntime {
        sink: sink.clone(),
        clock: Arc::new(SystemClock),
        directives: Arc::new(DirectiveStore::new("")),
    };
    (get_logger_with_runtime(level, "dotenv", runtime), sink)
}

enum Failure {
    None,
    Read(i32),
    Exists(i32),
}

struct FaultyFs {
    failure: Failure,
}

impl EnvFs for FaultyFs {
    fn exists(&self, path: &str) -> io::Result<bool> {
        match self.failure {
            Failure::Exists(code) => Err(io::Error::from_raw_os_error(code)),
            _ => RealFs.exists(path),
        }
    }

    fn read_to_string(&self, path: &str) -> io::Result<String> {
        match self.failure {
            Failure::Read(code) => Err(io::Error::from_raw_os_error(code)),
            _ => RealFs.read_to_string(path),
        }
    }
}

struct Tree {
    dir: TempDir,
}

impl Tree {
    fn new() -> Tree {
        Tree {
            dir: tempfile::Builder::new()
                .prefix("prosopo-dotenv-test-")
                .tempdir()
                .expect("temp dir"),
        }
    }

    fn root(&self) -> String {
        self.dir.path().to_string_lossy().into_owned()
    }

    fn mkdir(&self, segments: &[&str]) -> String {
        let mut path = self.dir.path().to_path_buf();
        for segment in segments {
            path.push(segment);
        }
        std::fs::create_dir_all(&path).expect("mkdir");
        path.to_string_lossy().into_owned()
    }

    fn write_file(&self, dir: &str, name: &str, contents: &str) -> String {
        std::fs::create_dir_all(dir).expect("mkdir");
        let file = Path::new(dir).join(name);
        std::fs::write(&file, contents).expect("write");
        file.to_string_lossy().into_owned()
    }

    fn ctx(&self, node_env_var: Option<&str>) -> EnvContext {
        self.ctx_with(node_env_var, Arc::new(RealFs), logger_at(LogLevel::Info).0)
    }

    fn ctx_with(
        &self,
        node_env_var: Option<&str>,
        fs: Arc<dyn EnvFs>,
        logger: Logger,
    ) -> EnvContext {
        EnvContext {
            cwd: self.root(),
            node_env_var: node_env_var.map(str::to_string),
            default_filepath: crate::node_path::normalize(crate::DEFAULT_FILEPATH),
            fs,
            logger,
        }
    }
}

fn join(dir: &str, name: &str) -> String {
    crate::node_path::join(&[dir, name])
}

type FakeEnv = HashMap<String, String>;

fn load_into(
    ctx: &EnvContext,
    env: &mut FakeEnv,
    args: (Option<&str>, Option<&str>, Option<&str>, Option<&str>),
    override_existing: bool,
) -> Result<String, DotenvError> {
    let loaded = ctx.read_env(args.0, args.1, args.2, args.3)?;
    let assignments = populate(
        &loaded.parsed,
        |key| env.contains_key(key),
        override_existing,
    );
    env.extend(assignments);
    Ok(loaded.path)
}

mod get_env {
    use super::sanitise_node_env;

    #[test]
    fn returns_development_when_node_env_is_not_set() {
        assert_eq!(sanitise_node_env(None), "development");
    }

    #[test]
    fn returns_development_when_node_env_is_the_empty_string() {
        assert_eq!(sanitise_node_env(Some("")), "development");
    }

    #[test]
    fn returns_node_env_unchanged_when_it_is_already_word_characters_only() {
        assert_eq!(sanitise_node_env(Some("test")), "test");
    }

    #[test]
    fn strips_non_word_characters() {
        assert_eq!(sanitise_node_env(Some("pro-duction!")), "production");
    }

    #[test]
    fn preserves_digits_and_underscores() {
        assert_eq!(sanitise_node_env(Some("staging_2")), "staging_2");
    }

    #[test]
    fn strips_whitespace_including_a_value_that_is_only_whitespace() {
        assert_eq!(sanitise_node_env(Some(" test ")), "test");
        assert_eq!(sanitise_node_env(Some("   ")), "");
    }

    #[test]
    fn strips_non_ascii_characters() {
        assert_eq!(sanitise_node_env(Some("tëst")), "tst");
    }

    #[test]
    fn returns_the_empty_string_when_node_env_is_entirely_non_word_characters() {
        assert_eq!(sanitise_node_env(Some("!!!")), "");
    }
}

mod get_env_file {
    use super::*;

    #[test]
    fn finds_the_env_file_directly_in_root_dir() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env.test", "");
        let result = t
            .ctx(None)
            .get_env_file(Some(&t.root()), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn walks_up_the_tree_to_find_the_env_file_in_an_ancestor() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env.test", "");
        let deep = t.mkdir(&["a", "b", "c"]);
        let result = t
            .ctx(None)
            .get_env_file(Some(&deep), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn returns_the_nearest_match_when_the_file_exists_at_several_levels() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.test", "");
        let nearest_dir = t.mkdir(&["a", "b"]);
        let nearest = t.write_file(&nearest_dir, ".env.test", "");
        let start = t.mkdir(&["a", "b", "c"]);
        let result = t
            .ctx(None)
            .get_env_file(Some(&start), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), nearest);
    }

    #[test]
    fn respects_a_custom_filename() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), "custom.test", "");
        let result = t
            .ctx(None)
            .get_env_file(Some(&t.root()), Some("custom"), None, Some("test"));
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn uses_the_explicit_node_env_argument_in_preference_to_node_env() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env.production", "");
        let result = t.ctx(Some("development")).get_env_file(
            Some(&t.root()),
            Some(".env"),
            None,
            Some("production"),
        );
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn falls_back_to_node_env_when_node_env_argument_is_the_empty_string() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env.staging", "");
        let result =
            t.ctx(Some("staging"))
                .get_env_file(Some(&t.root()), Some(".env"), None, Some(""));
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn falls_back_to_node_env_when_node_env_argument_is_omitted() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env.staging", "");
        let result = t
            .ctx(Some("staging"))
            .get_env_file(Some(&t.root()), None, None, None);
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn resolves_a_relative_root_dir_against_the_current_working_directory() {
        let t = Tree::new();
        let target = t.mkdir(&["x", "target"]);
        let expected = t.write_file(&target, ".env.test", "");
        let mut ctx = t.ctx(None);
        ctx.cwd = t.mkdir(&["cwd", "here"]);
        let result = ctx.get_env_file(Some("../../x/target"), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn treats_an_empty_root_dir_as_the_current_working_directory() {
        let t = Tree::new();
        let result = t
            .ctx(None)
            .get_env_file(Some(""), Some(".env"), None, Some("nonexistent-env-xyz"))
            .unwrap();
        assert!(Path::new(&result).is_absolute());
        assert!(result.ends_with(".env.nonexistent-env-xyz"));
    }

    #[test]
    fn falls_back_to_the_unsuffixed_filename_when_the_sanitised_env_is_empty() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env", "");
        let result = t
            .ctx(Some("!!!"))
            .get_env_file(Some(&t.root()), None, None, None);
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn never_appends_a_bare_dot_when_the_sanitised_env_is_empty() {
        let t = Tree::new();
        let result = t
            .ctx(Some("!!!"))
            .get_env_file(Some(&t.root()), None, None, None)
            .unwrap();
        assert_eq!(result, join(&t.root(), ".env"));
        assert!(!result.ends_with('.'));
    }

    #[test]
    fn uses_the_unsuffixed_name_for_a_custom_filename_when_the_env_is_empty() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), "custom", "");
        let result = t
            .ctx(Some("!!!"))
            .get_env_file(Some(&t.root()), Some("custom"), None, None);
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn prefers_the_unsuffixed_file_over_a_stale_trailing_dot_file() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.", "");
        let expected = t.write_file(&t.root(), ".env", "");
        let result = t
            .ctx(Some("!!!"))
            .get_env_file(Some(&t.root()), None, None, None);
        assert_eq!(result.unwrap(), expected);
    }

    mod workspace_root_sentinel {
        use super::super::*;

        #[test]
        fn stops_searching_at_the_workspace_root_package_json() {
            let t = Tree::new();
            t.write_file(&t.root(), ".env.test", "");
            let workspace_root = t.mkdir(&["workspace"]);
            t.write_file(&workspace_root, "package.json", WORKSPACE_PKG_JSON);
            let start = t.mkdir(&["workspace", "packages", "thing"]);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"))
                .unwrap();
            assert_eq!(result, join(&start, ".env.test"));
            assert!(!Path::new(&result).exists());
        }

        #[test]
        fn keeps_walking_past_a_package_json_belonging_to_another_project() {
            let t = Tree::new();
            let expected = t.write_file(&t.root(), ".env.test", "");
            let intermediate = t.mkdir(&["some-package"]);
            t.write_file(
                &intermediate,
                "package.json",
                r#"{"name":"@prosopo/dotenv"}"#,
            );
            let start = t.mkdir(&["some-package", "src"]);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"));
            assert_eq!(result.unwrap(), expected);
        }

        #[test]
        fn keeps_walking_past_a_package_json_with_no_name_field() {
            let t = Tree::new();
            let expected = t.write_file(&t.root(), ".env.test", "");
            let intermediate = t.mkdir(&["nameless"]);
            t.write_file(&intermediate, "package.json", r#"{"version":1}"#);
            let start = t.mkdir(&["nameless", "src"]);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"));
            assert_eq!(result.unwrap(), expected);
        }

        #[test]
        fn keeps_walking_when_package_json_is_valid_json_but_not_an_object() {
            let t = Tree::new();
            let expected = t.write_file(&t.root(), ".env.test", "");
            let intermediate = t.mkdir(&["weird"]);
            t.write_file(&intermediate, "package.json", "123");
            let start = t.mkdir(&["weird", "src"]);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"));
            assert_eq!(result.unwrap(), expected);
        }

        #[test]
        fn finds_the_env_file_at_the_workspace_root_itself() {
            let t = Tree::new();
            let workspace_root = t.mkdir(&["workspace"]);
            t.write_file(&workspace_root, "package.json", WORKSPACE_PKG_JSON);
            let expected = t.write_file(&workspace_root, ".env.test", "");
            let start = t.mkdir(&["workspace", "packages", "thing"]);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"));
            assert_eq!(result.unwrap(), expected);
        }
    }

    mod depth_limit {
        use super::super::*;

        fn chain(length: usize) -> Vec<String> {
            (0..length).map(|i| format!("d{i}")).collect()
        }

        #[test]
        fn gives_up_after_ascending_more_than_10_levels() {
            let t = Tree::new();
            let segments = chain(14);
            let refs: Vec<&str> = segments.iter().map(String::as_str).collect();
            let start = t.mkdir(&refs);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"));
            assert_eq!(result.unwrap(), join(&start, ".env.test"));
        }

        #[test]
        fn still_finds_a_file_exactly_10_levels_up() {
            let t = Tree::new();
            let segments = chain(10);
            let refs: Vec<&str> = segments.iter().map(String::as_str).collect();
            let expected = t.write_file(&t.root(), ".env.test", "");
            let start = t.mkdir(&refs);
            let result = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"));
            assert_eq!(result.unwrap(), expected);
        }

        #[test]
        fn terminates_at_the_filesystem_root_instead_of_looping_forever() {
            let t = Tree::new();
            let result = t.ctx(None).get_env_file(
                Some("/"),
                Some(".env"),
                None,
                Some("definitely-not-a-real-env-9f3a"),
            );
            assert_eq!(result.unwrap(), "/.env.definitely-not-a-real-env-9f3a");
        }
    }

    mod fallback_path_when_nothing_is_found {
        use super::super::*;

        #[test]
        fn falls_back_to_root_dir_when_root_dir_was_supplied() {
            let t = Tree::new();
            let start = t.mkdir(&["a"]);
            let result = t.ctx(None).get_env_file(
                Some(&start),
                Some(".env"),
                Some("/some/other/place"),
                Some("test"),
            );
            assert_eq!(result.unwrap(), join(&start, ".env.test"));
        }

        #[test]
        fn falls_back_to_the_filepath_argument_when_root_dir_is_falsy() {
            let t = Tree::new();
            let base = t.mkdir(&["base"]);
            let result = t.ctx(None).get_env_file(
                Some(""),
                Some(".env"),
                Some(&base),
                Some("nonexistent-env-xyz"),
            );
            assert_eq!(result.unwrap(), join(&base, ".env.nonexistent-env-xyz"));
        }
    }

    mod failure_modes {
        use super::super::*;

        #[test]
        fn propagates_a_syntax_error_when_an_ancestor_package_json_is_malformed() {
            let t = Tree::new();
            t.write_file(&t.root(), ".env.test", "");
            let intermediate = t.mkdir(&["broken"]);
            t.write_file(&intermediate, "package.json", "{ not valid json");
            let start = t.mkdir(&["broken", "src"]);
            let error = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"))
                .unwrap_err();
            assert!(matches!(error, DotenvError::Syntax { .. }));
            assert_eq!(error.kind(), "SyntaxError");
        }

        #[test]
        fn propagates_a_type_error_when_an_ancestor_package_json_contains_null() {
            let t = Tree::new();
            t.write_file(&t.root(), ".env.test", "");
            let intermediate = t.mkdir(&["nullish"]);
            t.write_file(&intermediate, "package.json", "null");
            let start = t.mkdir(&["nullish", "src"]);
            let error = t
                .ctx(None)
                .get_env_file(Some(&start), Some(".env"), None, Some("test"))
                .unwrap_err();
            assert_eq!(error.kind(), "TypeError");
            assert_eq!(
                error.to_string(),
                "Cannot read properties of null (reading 'name')"
            );
        }

        #[test]
        fn propagates_a_read_error_when_package_json_vanishes_after_the_existence_check() {
            let t = Tree::new();
            t.write_file(&t.root(), ".env.test", "");
            let intermediate = t.mkdir(&["racy"]);
            t.write_file(&intermediate, "package.json", WORKSPACE_PKG_JSON);
            let start = t.mkdir(&["racy", "src"]);
            let ctx = t.ctx_with(
                None,
                Arc::new(FaultyFs {
                    failure: Failure::Read(13),
                }),
                logger_at(LogLevel::Info).0,
            );
            let error = ctx
                .get_env_file(Some(&start), Some(".env"), None, Some("test"))
                .unwrap_err();
            assert!(matches!(error, DotenvError::Read { .. }));
            assert_eq!(error.kind(), "EACCES");
        }

        #[test]
        fn propagates_an_error_thrown_by_the_existence_check_itself() {
            let t = Tree::new();
            let ctx = t.ctx_with(
                None,
                Arc::new(FaultyFs {
                    failure: Failure::Exists(5),
                }),
                logger_at(LogLevel::Info).0,
            );
            let error = ctx
                .get_env_file(Some(&t.root()), Some(".env"), None, Some("test"))
                .unwrap_err();
            assert!(matches!(error, DotenvError::Exists { .. }));
            assert_eq!(error.kind(), "EIO");
        }
    }
}

mod load_env {
    use super::*;

    #[test]
    fn loads_variables_from_the_discovered_file_into_process_env() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.test", "PROSOPO_TEST_VALUE=hello\n");
        let mut env = FakeEnv::new();
        let returned = load_into(
            &t.ctx(None),
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            false,
        );
        assert_eq!(returned.unwrap(), join(&t.root(), ".env.test"));
        assert_eq!(env["PROSOPO_TEST_VALUE"], "hello");
    }

    #[test]
    fn loads_multiple_variables_and_ignores_comments_and_blank_lines() {
        let t = Tree::new();
        t.write_file(
            &t.root(),
            ".env.test",
            "# a comment\n\nPROSOPO_A=1\nPROSOPO_B=two\n",
        );
        let mut env = FakeEnv::new();
        load_into(
            &t.ctx(None),
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            false,
        )
        .unwrap();
        assert_eq!(env["PROSOPO_A"], "1");
        assert_eq!(env["PROSOPO_B"], "two");
        assert_eq!(env.len(), 2);
    }

    #[test]
    fn handles_an_empty_env_file_without_error() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env.test", "");
        let mut env = FakeEnv::new();
        let returned = load_into(
            &t.ctx(None),
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            false,
        );
        assert_eq!(returned.unwrap(), expected);
        assert!(env.is_empty());
    }

    #[test]
    fn does_not_overwrite_existing_variables_by_default() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.test", "PROSOPO_TEST_VALUE=replacement\n");
        let mut env = FakeEnv::from([("PROSOPO_TEST_VALUE".to_string(), "original".to_string())]);
        load_into(
            &t.ctx(None),
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            false,
        )
        .unwrap();
        assert_eq!(env["PROSOPO_TEST_VALUE"], "original");
    }

    #[test]
    fn overwrites_existing_variables_when_override_is_true() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.test", "PROSOPO_TEST_VALUE=replacement\n");
        let mut env = FakeEnv::from([("PROSOPO_TEST_VALUE".to_string(), "original".to_string())]);
        load_into(
            &t.ctx(None),
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            true,
        )
        .unwrap();
        assert_eq!(env["PROSOPO_TEST_VALUE"], "replacement");
    }

    #[test]
    fn uses_the_explicit_node_env_to_choose_which_file_to_load() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.development", "PROSOPO_WHICH=development\n");
        t.write_file(&t.root(), ".env.production", "PROSOPO_WHICH=production\n");
        let mut env = FakeEnv::new();
        load_into(
            &t.ctx(Some("development")),
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("production")),
            false,
        )
        .unwrap();
        assert_eq!(env["PROSOPO_WHICH"], "production");
    }

    #[test]
    fn respects_a_custom_filename() {
        let t = Tree::new();
        t.write_file(&t.root(), "custom.test", "PROSOPO_CUSTOM=yes\n");
        let mut env = FakeEnv::new();
        let returned = load_into(
            &t.ctx(None),
            &mut env,
            (Some(&t.root()), Some("custom"), None, Some("test")),
            false,
        );
        assert_eq!(returned.unwrap(), join(&t.root(), "custom.test"));
        assert_eq!(env["PROSOPO_CUSTOM"], "yes");
    }

    #[test]
    fn returns_a_path_and_stays_silent_when_no_env_file_exists() {
        let t = Tree::new();
        let start = t.mkdir(&["empty"]);
        let ctx = t.ctx(None);
        let loaded = ctx
            .read_env(
                Some(&start),
                Some(".env"),
                None,
                Some("nonexistent-env-xyz"),
            )
            .unwrap();
        assert_eq!(loaded.path, join(&start, ".env.nonexistent-env-xyz"));
        assert!(!Path::new(&loaded.path).exists());
        assert!(loaded.parsed.is_empty());
        assert_eq!(
            loaded.read_error.map(|e| e.kind()),
            Some(io::ErrorKind::NotFound)
        );
    }

    #[test]
    fn loads_the_unsuffixed_file_when_the_sanitised_env_is_empty() {
        let t = Tree::new();
        let expected = t.write_file(&t.root(), ".env", "PROSOPO_UNSUFFIXED=yes\n");
        let ctx = t.ctx(Some("!!!"));
        let mut env = FakeEnv::new();
        let returned = load_into(&ctx, &mut env, (None, None, None, None), false);
        assert_eq!(returned.unwrap(), expected);
        assert_eq!(env["PROSOPO_UNSUFFIXED"], "yes");
    }

    #[test]
    fn defaults_to_the_current_working_directory_when_root_dir_is_omitted() {
        let t = Tree::new();
        let mut env = FakeEnv::new();
        let returned = load_into(
            &t.ctx(None),
            &mut env,
            (None, Some(".env"), None, Some("nonexistent-xyz")),
            false,
        )
        .unwrap();
        assert!(Path::new(&returned).is_absolute());
        assert!(returned.ends_with(".env.nonexistent-xyz"));
        assert!(env.is_empty());
    }

    #[test]
    fn propagates_errors_thrown_during_discovery() {
        let t = Tree::new();
        let intermediate = t.mkdir(&["broken"]);
        t.write_file(&intermediate, "package.json", "{ not valid json");
        let start = t.mkdir(&["broken", "src"]);
        let mut env = FakeEnv::new();
        let error = load_into(
            &t.ctx(None),
            &mut env,
            (Some(&start), Some(".env"), None, Some("test")),
            false,
        )
        .unwrap_err();
        assert_eq!(error.kind(), "SyntaxError");
    }

    #[test]
    fn silently_ignores_a_read_failure_on_the_env_file() {
        let t = Tree::new();
        t.write_file(&t.root(), ".env.test", "PROSOPO_TEST_VALUE=hello\n");
        let ctx = t.ctx_with(
            None,
            Arc::new(FaultyFs {
                failure: Failure::Read(13),
            }),
            logger_at(LogLevel::Info).0,
        );
        let mut env = FakeEnv::new();
        let returned = load_into(
            &ctx,
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            false,
        );
        assert_eq!(returned.unwrap(), join(&t.root(), ".env.test"));
        assert!(!env.contains_key("PROSOPO_TEST_VALUE"));
    }
}

mod debug_logging {
    use super::*;

    fn debug_ctx(t: &Tree) -> (EnvContext, Arc<CaptureSink>) {
        let (logger, sink) = logger_at(LogLevel::Debug);
        (
            t.ctx_with(
                None,
                Arc::new(FaultyFs {
                    failure: Failure::None,
                }),
                logger,
            ),
            sink,
        )
    }

    #[test]
    fn builds_the_search_payload_without_throwing() {
        let t = Tree::new();
        let (ctx, sink) = debug_ctx(&t);
        let expected = t.write_file(&t.root(), ".env.test", "");
        let result = ctx.get_env_file(Some(&t.root()), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), expected);
        assert_eq!(sink.messages(), ["Searching"]);
    }

    #[test]
    fn builds_the_workspace_root_payload_without_throwing() {
        let t = Tree::new();
        let (ctx, sink) = debug_ctx(&t);
        let workspace_root = t.mkdir(&["workspace"]);
        t.write_file(&workspace_root, "package.json", WORKSPACE_PKG_JSON);
        let start = t.mkdir(&["workspace", "packages", "thing"]);
        let result = ctx.get_env_file(Some(&start), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), join(&start, ".env.test"));
        assert_eq!(
            sink.messages(),
            [
                "Searching",
                "Reached the workspace root package.json, stopping search."
            ]
        );
    }

    #[test]
    fn builds_the_depth_limit_payload_without_throwing() {
        let t = Tree::new();
        let (ctx, sink) = debug_ctx(&t);
        let segments: Vec<String> = (0..14).map(|i| format!("d{i}")).collect();
        let refs: Vec<&str> = segments.iter().map(String::as_str).collect();
        let start = t.mkdir(&refs);
        let result = ctx.get_env_file(Some(&start), Some(".env"), None, Some("test"));
        assert_eq!(result.unwrap(), join(&start, ".env.test"));
        assert_eq!(
            sink.messages(),
            ["Searching", "Checked directories above, stopping search."]
        );
    }

    #[test]
    fn builds_the_load_payload_without_throwing() {
        let t = Tree::new();
        let (ctx, sink) = debug_ctx(&t);
        let expected = t.write_file(&t.root(), ".env.test", "PROSOPO_DEBUG_V=1\n");
        let mut env = FakeEnv::new();
        let returned = load_into(
            &ctx,
            &mut env,
            (Some(&t.root()), Some(".env"), None, Some("test")),
            false,
        );
        assert_eq!(returned.unwrap(), expected);
        assert_eq!(env["PROSOPO_DEBUG_V"], "1");
        assert_eq!(sink.messages(), ["Searching", "Loading env"]);
    }
}

mod process_environment {
    use super::*;

    #[test]
    fn populate_truncates_values_at_nul_as_node_does() {
        let parsed = parse("A=x\0y\nB=keep\n");
        assert_eq!(parsed["A"], "x\0y");
        let assignments = populate(&parsed, |_| false, false);
        assert_eq!(
            assignments,
            [
                ("A".to_string(), "x".to_string()),
                ("B".to_string(), "keep".to_string())
            ]
        );
    }

    #[test]
    fn load_env_writes_to_the_real_process_environment() {
        let t = Tree::new();
        let key = "PROSOPO_DOTENV_RS_LOAD_ENV_ONLY_TEST";
        t.write_file(&t.root(), ".env.test", &format!("{key}=from-file\n"));
        let returned = load_env(Some(&t.root()), None, None, Some("test"), false).unwrap();
        assert_eq!(returned, join(&t.root(), ".env.test"));
        assert_eq!(std::env::var(key).as_deref(), Ok("from-file"));
        apply_env(&[(key.to_string(), "kept".to_string())]);
        load_env(Some(&t.root()), None, None, Some("test"), false).unwrap();
        assert_eq!(std::env::var(key).as_deref(), Ok("kept"));
        load_env(Some(&t.root()), None, None, Some("test"), true).unwrap();
        assert_eq!(std::env::var(key).as_deref(), Ok("from-file"));
    }
}
