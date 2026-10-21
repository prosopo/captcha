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

//! Ports of src/tests/lodash.unit.test.ts and src/tests/mocked.unit.test.ts, one test each,
//! with the helpers of src/tests/utils.ts.

use crate::args::*;
use crate::test_support::{fixtures_dir, repo_dir, ScratchDir};
use crate::*;
use prosopo_types::datasets::{captchas_container_schema, data_schema};
use prosopo_util::{Rng, SeededLodash};
use prosopo_util_crypto::{hex_hash, U8aLike};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

const REPO_PLACEHOLDER: &str = "${repo}";

fn context() -> Context {
    Context::default()
}

fn fixture(name: &str) -> String {
    fixtures_dir().join(name).to_string_lossy().into_owned()
}

/// `fsWalk`: the path, then everything under it, in `readdir` order.
fn fs_walk(path: &Path) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = vec![path.to_path_buf()];
    if path.is_dir() {
        for name in node_fs::read_dir(&path.to_string_lossy()).expect("readdir") {
            out.extend(fs_walk(&path.join(name)));
        }
    }
    out
}

/// `fsEq`: the same paths under both, and the same bytes in every file.
fn fs_eq(first: &Path, second: &Path) -> bool {
    let relative = |root: &Path| -> Vec<String> {
        let mut paths: Vec<String> = fs_walk(root)
            .iter()
            .map(|path| path.to_string_lossy()[root.to_string_lossy().len()..].to_string())
            .collect();
        paths.sort();
        paths
    };
    let (files1, files2): (Vec<String>, Vec<String>) = (relative(first), relative(second));
    if files1 != files2 {
        return false;
    }
    files1.iter().all(|file| {
        let (one, two): (PathBuf, PathBuf) = (
            PathBuf::from(format!("{}{file}", first.display())),
            PathBuf::from(format!("{}{file}", second.display())),
        );
        one.is_dir() || std::fs::read(&one).ok() == std::fs::read(&two).ok()
    })
}

/// `readJson(path, replace)`.
fn read_json(path: &str, replace: Option<(&str, &str)>) -> Value {
    let mut content: String = std::fs::read_to_string(path).expect("read json");
    if let Some((from, to)) = replace {
        content = content.replace(from, to);
    }
    serde_json::from_str(&content).expect("json")
}

/// `substituteRepoDir`: a copy of the fixture with `${repo}` resolved.
fn substitute_repo_dir(fixture: &str, dest: &str) -> String {
    let content: String = std::fs::read_to_string(fixture).expect("a fixture");
    std::fs::create_dir_all(Path::new(dest).parent().expect("a parent")).expect("mkdir");
    std::fs::write(dest, content.replace(REPO_PLACEHOLDER, &repo_dir())).expect("write");
    dest.to_string()
}

fn read_captchas(path: &str) -> Value {
    captchas_container_schema()
        .safe_parse(Some(&read_json(path, None)))
        .expect("captchas")
        .expect("captchas")
}

/// `captchasEq`: the same captchas, but for the salts, which must differ.
fn captchas_eq(first: &Value, second: &Value) -> bool {
    let (one, two): (&Vec<Value>, &Vec<Value>) = (
        first["captchas"].as_array().expect("captchas"),
        second["captchas"].as_array().expect("captchas"),
    );
    one.len() == two.len()
        && one.iter().zip(two).all(|(a, b)| {
            let (mut a, mut b): (Value, Value) = (a.clone(), b.clone());
            let salts_differ: bool = a["salt"] != b["salt"];
            if let (Some(a), Some(b)) = (a.as_object_mut(), b.as_object_mut()) {
                a.shift_remove("salt");
                b.shift_remove("salt");
            }
            salts_differ
                && prosopo_logger::json_stringify(&a, 0) == prosopo_logger::json_stringify(&b, 0)
        })
}

/// A JPEG's dimensions, from its start-of-frame segment.
fn jpeg_dimensions(bytes: &[u8]) -> Option<(u16, u16)> {
    let mut at: usize = 2;
    while at + 9 < bytes.len() {
        let marker: u8 = bytes[at + 1];
        let length: usize = usize::from(u16::from_be_bytes([bytes[at + 2], bytes[at + 3]]));
        if matches!(marker, 0xC0..=0xC3 | 0xC5..=0xC7 | 0xC9..=0xCB | 0xCD..=0xCF) {
            let height: u16 = u16::from_be_bytes([bytes[at + 5], bytes[at + 6]]);
            let width: u16 = u16::from_be_bytes([bytes[at + 7], bytes[at + 8]]);
            return Some((width, height));
        }
        at += 2 + length;
    }
    None
}

mod rng {
    use super::*;

    #[test]
    fn generates_random_numbers_using_a_seed() {
        let mut rand: Rng = Rng::new("0");
        let expected: [i64; 7] = [
            -1681090547,
            408334984,
            788430095,
            3233831872,
            963300000,
            -299378919,
            97582850,
        ];
        for value in expected {
            assert_eq!(rand.int(), value);
        }
    }
}

mod seeded_lodash {
    use super::*;

    #[test]
    fn shuffles_an_array_using_a_seed() {
        let mut lodash: SeededLodash = SeededLodash::new("0");
        let mut array: Vec<i32> = vec![1, 2, 3, 4, 5];
        array = lodash.shuffle(&array);
        assert_eq!(array, vec![4, 2, 1, 3, 5]);
        array = lodash.shuffle(&array);
        assert_eq!(array, vec![3, 4, 1, 5, 2]);
        array = lodash.shuffle(&array);
        assert_eq!(array, vec![3, 4, 5, 2, 1]);
    }
}

mod dataset_commands {
    use super::*;

    struct Dirs {
        scratch: ScratchDir,
    }

    impl Dirs {
        fn new() -> Dirs {
            Dirs {
                scratch: ScratchDir::new(),
            }
        }

        fn results(&self, name: &str) -> String {
            self.scratch.join(&format!("results/{name}"))
        }

        /// `resolvedFixture`.
        fn resolved_fixture(&self, name: &str) -> String {
            substitute_repo_dir(
                &fixture(name),
                &self.scratch.join(&format!("fixtures/{name}")),
            )
        }
    }

    /// `expectDataJsonMatchesFixture`.
    fn expect_data_json_matches_fixture(output_dir: &str, fixture_name: &str) {
        let fixture_dir: String = Path::new(&fixture(fixture_name))
            .parent()
            .expect("a parent")
            .to_string_lossy()
            .into_owned();
        let in_repo: String = format!("{REPO_PLACEHOLDER}{}", &fixture_dir[repo_dir().len()..]);
        let actual: Value = read_json(
            &format!("{output_dir}/data.json"),
            Some((&node_fs::realpath(output_dir).expect("realpath"), &in_repo)),
        );
        assert_eq!(actual, read_json(&fixture(fixture_name), None));
    }

    #[test]
    fn labels() {
        let dirs: Dirs = Dirs::new();
        let output: String = dirs.results("labels.json");
        crate::labels(
            &LabelsArgs {
                input: dirs.resolved_fixture("flat_resized/data.json"),
                output: output.clone(),
                overwrite: None,
            },
            &mut context(),
        )
        .expect("labels");
        assert_eq!(
            read_json(&output, None),
            read_json(&fixture("flat_resized/labels.json"), None)
        );
        let found: Vec<Value> = read_json(&output, None)["labels"]
            .as_array()
            .expect("labels")
            .clone();
        let categories: Vec<Value> = node_fs::read_dir(&fixture("hierarchical"))
            .expect("categories")
            .into_iter()
            .map(Value::from)
            .collect();
        assert_eq!(found, categories);
    }

    #[test]
    fn generate_v2() {
        let dirs: Dirs = Dirs::new();
        let input: String = dirs.resolved_fixture("flat_resized/data.json");
        let output: String = dirs.results("captchas_v2.json");
        let (min_incorrect, min_correct, min_labelled, max_labelled): (f64, f64, f64, f64) =
            (1.0, 1.0, 2.0, 7.0);
        let args: GenerateV2Args = parse(
            &generate_v2_args_schema(),
            &json!({
                "labelled": input,
                "unlabelled": input,
                "overwrite": true,
                "output": output,
                "count": 100,
                "seed": 0,
                "minIncorrect": min_incorrect,
                "minCorrect": min_correct,
                "minLabelled": min_labelled,
                "maxLabelled": max_labelled,
                "allowDuplicates": true,
            }),
        )
        .expect("args");
        crate::generate_v2(&args, &mut context()).expect("generate");
        assert!(captchas_eq(
            &read_captchas(&output),
            &read_captchas(&dirs.resolved_fixture("flat_resized/captchas_v2.json"))
        ));

        for captcha in read_captchas(&output)["captchas"]
            .as_array()
            .expect("captchas")
        {
            let solutions: &Vec<Value> = captcha["solution"].as_array().expect("a solution array");
            let unlabelled: &Vec<Value> = captcha["unlabelled"]
                .as_array()
                .expect("an unlabelled array");
            for solution in solutions {
                assert!(
                    !unlabelled.contains(solution),
                    "solution {solution} is also in unlabelled array"
                );
            }
            let n_correct: f64 = solutions.len() as f64;
            let n_unlabelled: f64 = unlabelled.len() as f64;
            let n_incorrect: f64 = 9.0 - n_correct - n_unlabelled;
            let n_labelled: f64 = n_correct + n_incorrect;
            assert!(
                n_correct >= min_correct,
                "expected at least {min_correct} correct but found {n_correct}"
            );
            assert!(
                n_incorrect >= min_incorrect,
                "expected at least {min_incorrect} incorrect but found {n_incorrect}"
            );
            assert!(
                n_labelled >= min_labelled,
                "expected at least {min_labelled} labelled but found {n_labelled}"
            );
            assert!(
                n_labelled <= max_labelled,
                "expected at most {max_labelled} labelled but found {n_labelled}"
            );
            assert_eq!(n_unlabelled, 9.0 - n_labelled);
        }
    }

    #[test]
    fn generate_v1() {
        let dirs: Dirs = Dirs::new();
        let input: String = dirs.resolved_fixture("flat_resized/data.json");
        let output: String = dirs.results("captchas_v1.json");
        let args: GenerateV1Args = parse(
            &generate_v1_args_schema(),
            &json!({
                "labelled": input,
                "unlabelled": input,
                "overwrite": true,
                "output": output,
                "solved": 50,
                "unsolved": 50,
                "seed": 0,
                "minCorrect": 1,
                "maxCorrect": 6,
                "allowDuplicates": true,
            }),
        )
        .expect("args");
        crate::generate_v1(&args, &mut context()).expect("generate");
        assert!(captchas_eq(
            &read_captchas(&output),
            &read_captchas(&dirs.resolved_fixture("flat_resized/captchas_v1.json"))
        ));
    }

    #[test]
    fn resizes_data() {
        let dirs: Dirs = Dirs::new();
        let output: String = dirs.results("flat_resized");
        crate::resize(
            &ResizeArgs {
                input: dirs.resolved_fixture("flat/data.json"),
                output: output.clone(),
                overwrite: Some(true),
                square: Some(true),
                size: 128.0,
            },
            &mut context(),
        )
        .expect("resize");
        assert!(fs_eq(
            Path::new(&format!("{output}/images")),
            &fixtures_dir().join("flat_resized/images")
        ));
        expect_data_json_matches_fixture(&output, "flat_resized/data.json");
        for path in fs_walk(Path::new(&output)) {
            let name: String = path.to_string_lossy().into_owned();
            if !name.ends_with(".jpg") && !name.ends_with(".jpeg") && !name.ends_with(".png") {
                continue;
            }
            let dimensions = jpeg_dimensions(&std::fs::read(&path).expect("an image"));
            assert_eq!(dimensions, Some((128, 128)), "image {name} is not 128x128");
        }
    }

    #[test]
    fn relocates_data() {
        let dirs: Dirs = Dirs::new();
        let output: String = dirs.results("relocated_data.json");
        crate::relocate(
            &RelocateArgs {
                input: fixture("flat_resized/data.json"),
                output: output.clone(),
                overwrite: Some(true),
                from: REPO_PLACEHOLDER.to_string(),
                to: "newwebsite.com".to_string(),
            },
            &mut context(),
        )
        .expect("relocate");
        assert_eq!(
            read_json(&output, None),
            read_json(&fixture("flat_resized/relocated_data.json"), None)
        );
    }

    #[test]
    fn flattens_hierarchical_data() {
        let dirs: Dirs = Dirs::new();
        let input: String = fixture("hierarchical");
        let output: String = dirs.results("flat");
        crate::flatten(
            &FlattenArgs {
                input: input.clone(),
                output: output.clone(),
                overwrite: Some(true),
                allow_duplicates: None,
            },
            &mut context(),
        )
        .expect("flatten");
        assert!(fs_eq(
            Path::new(&format!("{output}/images")),
            &fixtures_dir().join("flat/images")
        ));
        expect_data_json_matches_fixture(&output, "flat/data.json");

        let data: Value = data_schema()
            .safe_parse(Some(&read_json(&format!("{output}/data.json"), None)))
            .expect("data")
            .expect("data");
        let items: &Vec<Value> = data["items"].as_array().expect("items");
        let is_image = |path: &str| {
            path.ends_with(".jpg") || path.ends_with(".jpeg") || path.ends_with(".png")
        };
        let mut hier_count: usize = 0;
        for path in fs_walk(Path::new(&input)) {
            let name: String = path.to_string_lossy().into_owned();
            if !is_image(&name) {
                continue;
            }
            hier_count += 1;
            let category: String = name.rsplit('/').nth(1).expect("a category").to_string();
            let content: Vec<u8> = std::fs::read(&path).expect("an image");
            let copied: String = fs_walk(Path::new(&output))
                .into_iter()
                .filter(|other| other.is_file())
                .find(|other| std::fs::read(other).ok().as_ref() == Some(&content))
                .and_then(|other| {
                    other
                        .file_name()
                        .map(|name| name.to_string_lossy().into_owned())
                })
                .unwrap_or_else(|| panic!("unable to find image {name} in output"));
            let item: &Value = items
                .iter()
                .find(|item| {
                    item["data"]
                        .as_str()
                        .and_then(|data| data.rsplit('/').next())
                        == Some(&copied)
                })
                .unwrap_or_else(|| panic!("unable to find image {name} in data.json"));
            assert_eq!(
                item["label"],
                json!(category),
                "expected {category} but found {}",
                item["label"]
            );
            assert_eq!(item["type"], json!("image"));
            let stem: &str = copied.split('.').next().expect("a stem");
            assert_eq!(item["hash"], json!(stem));
            let hash: String = hex_hash(U8aLike::Bytes(&content), None).expect("a hash");
            assert_eq!(item["hash"], json!(hash));
        }
        let flat_count: usize = fs_walk(Path::new(&output))
            .iter()
            .filter(|path| is_image(&path.to_string_lossy()))
            .count();
        assert_eq!(hier_count, flat_count);
    }
}
