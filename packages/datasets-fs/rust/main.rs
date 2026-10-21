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

//! `datasets-fs <command> [options]` (src/cli.ts).

use clap::{Args, Parser, Subcommand};
use prosopo_api_route::schema::string_to_number;
use prosopo_datasets_fs::args::*;
use prosopo_datasets_fs::{
    flatten, generate_v1, generate_v2, get, labels, relocate, resize, Context, DatasetsFsError,
};
use serde_json::{Map, Value};

#[derive(Parser)]
#[command(name = "datasets-fs", about = "Build captcha datasets from images")]
struct Cli {
    /// The log level.
    #[arg(long = "log-level", global = true, default_value = "info")]
    log_level: String,
    #[command(subcommand)]
    command: Command,
}

#[derive(Args)]
struct Input {
    /// The input path.
    #[arg(long, visible_alias = "in")]
    input: String,
}

#[derive(Args)]
struct Output {
    /// The output path.
    #[arg(long, visible_alias = "out")]
    output: String,
    /// Overwrite files in the output path if they already exist.
    #[arg(long)]
    overwrite: bool,
}

#[derive(Args)]
struct GenerateOptions {
    #[command(flatten)]
    output: Output,
    /// Path to JSON file containing labelled data.
    #[arg(long)]
    labelled: String,
    /// Path to JSON file containing unlabelled data.
    #[arg(long)]
    unlabelled: Option<String>,
    /// Seed for random number generator.
    #[arg(long)]
    seed: String,
    /// Number of images in each captcha.
    #[arg(long)]
    size: Option<String>,
    /// Path to JSON file containing labels which unlabelled data will be assigned to.
    #[arg(long)]
    labels: Option<String>,
    /// If true, allow duplicates in the data (labelled and unlabelled).
    #[arg(long, alias = "allowDuplicates")]
    allow_duplicates: bool,
    /// If true, allow duplicates in the labelled data.
    #[arg(long, alias = "allowDuplicatesLabelled")]
    allow_duplicates_labelled: bool,
    /// If true, allow duplicates in the unlabelled data.
    #[arg(long, alias = "allowDuplicatesUnlabelled")]
    allow_duplicates_unlabelled: bool,
}

#[derive(Subcommand)]
enum Command {
    /// Restructure a directory containing directories for each image classification into a
    /// single directory with a file containing the labels.
    Flatten {
        #[command(flatten)]
        input: Input,
        #[command(flatten)]
        output: Output,
        /// If true, allow duplicates in the data.
        #[arg(long, alias = "allowDuplicates")]
        allow_duplicates: bool,
    },
    /// Generate distinct captchas producing captcha challenges comprising 2 rounds, one
    /// labelled and one unlabelled.
    #[command(name = "generate-v1")]
    GenerateV1 {
        #[command(flatten)]
        generate: GenerateOptions,
        /// Number of captchas to generate that are solved.
        #[arg(long)]
        solved: Option<String>,
        /// Number of captchas to generate that are unsolved.
        #[arg(long)]
        unsolved: Option<String>,
        /// Minimum number of target images in each captcha.
        #[arg(long, alias = "minCorrect")]
        min_correct: Option<String>,
        /// Maximum number of target images in each captcha.
        #[arg(long, alias = "maxCorrect")]
        max_correct: Option<String>,
    },
    /// Generate distinct captchas producing captcha challenges comprising one or more rounds,
    /// mixing labelled and unlabelled data into a single round.
    #[command(name = "generate-v2")]
    GenerateV2 {
        #[command(flatten)]
        generate: GenerateOptions,
        /// Number of captchas to generate.
        #[arg(long)]
        count: Option<String>,
        /// Minimum number of correct images in each captcha.
        #[arg(long, alias = "minCorrect")]
        min_correct: Option<String>,
        /// Minimum number of incorrect images in each captcha.
        #[arg(long, alias = "minIncorrect")]
        min_incorrect: Option<String>,
        /// Minimum number of labelled images in each captcha.
        #[arg(long, alias = "minLabelled")]
        min_labelled: Option<String>,
        /// Maximum number of labelled images in each captcha.
        #[arg(long, alias = "maxLabelled")]
        max_labelled: Option<String>,
    },
    /// Test a GET request at image URLs.
    Get {
        #[command(flatten)]
        input: Input,
    },
    /// Get all labels from some data.
    Labels {
        #[command(flatten)]
        input: Input,
        #[command(flatten)]
        output: Output,
    },
    /// Relocate urls in a JSON file using string substitution.
    Relocate {
        #[command(flatten)]
        input: Input,
        #[command(flatten)]
        output: Output,
        /// The string to replace in the urls.
        #[arg(long)]
        from: String,
        /// The string to substitute in the urls.
        #[arg(long)]
        to: String,
    },
    /// Resize images to a given size.
    Resize {
        #[command(flatten)]
        input: Input,
        #[command(flatten)]
        output: Output,
        /// The dimension (height/width) of the scaled image.
        #[arg(long)]
        size: Option<String>,
        /// If true, the image will be cropped to a square before scaling.
        #[arg(long)]
        square: bool,
    },
}

/// The arguments object yargs hands a command: numbers through `Number()`, flags only when
/// given.
#[derive(Default)]
struct ArgsObject(Map<String, Value>);

impl ArgsObject {
    fn text(mut self, key: &str, value: &str) -> ArgsObject {
        self.0.insert(key.to_string(), Value::from(value));
        self
    }

    fn optional_text(self, key: &str, value: &Option<String>) -> ArgsObject {
        match value {
            Some(value) => self.text(key, value),
            None => self,
        }
    }

    fn number(mut self, key: &str, value: &Option<String>) -> ArgsObject {
        if let Some(value) = value {
            let number: f64 = string_to_number(value);
            let json: Value =
                serde_json::Number::from_f64(number).map_or(Value::Null, Value::Number);
            self.0.insert(key.to_string(), json);
        }
        self
    }

    fn flag(mut self, key: &str, value: bool) -> ArgsObject {
        if value {
            self.0.insert(key.to_string(), Value::Bool(true));
        }
        self
    }

    fn input(self, input: &Input) -> ArgsObject {
        self.text("input", &input.input)
    }

    fn output(self, output: &Output) -> ArgsObject {
        self.text("output", &output.output)
            .flag("overwrite", output.overwrite)
    }

    fn generate(self, generate: &GenerateOptions) -> ArgsObject {
        self.output(&generate.output)
            .text("labelled", &generate.labelled)
            .optional_text("unlabelled", &generate.unlabelled)
            .number("seed", &Some(generate.seed.clone()))
            .number("size", &generate.size)
            .optional_text("labels", &generate.labels)
            .flag("allowDuplicates", generate.allow_duplicates)
            .flag(
                "allowDuplicatesLabelled",
                generate.allow_duplicates_labelled,
            )
            .flag(
                "allowDuplicatesUnlabelled",
                generate.allow_duplicates_unlabelled,
            )
    }

    fn value(self) -> Value {
        Value::Object(self.0)
    }
}

async fn run(command: Command, context: &mut Context) -> Result<(), DatasetsFsError> {
    match command {
        Command::Flatten {
            input,
            output,
            allow_duplicates,
        } => {
            let args: Value = ArgsObject::default()
                .input(&input)
                .output(&output)
                .flag("allowDuplicates", allow_duplicates)
                .value();
            flatten(&parse(&flatten_args_schema(), &args)?, context)
        }
        Command::GenerateV1 {
            generate,
            solved,
            unsolved,
            min_correct,
            max_correct,
        } => {
            let args: Value = ArgsObject::default()
                .generate(&generate)
                .number("solved", &solved)
                .number("unsolved", &unsolved)
                .number("minCorrect", &min_correct)
                .number("maxCorrect", &max_correct)
                .value();
            generate_v1(&parse(&generate_v1_args_schema(), &args)?, context)
        }
        Command::GenerateV2 {
            generate,
            count,
            min_correct,
            min_incorrect,
            min_labelled,
            max_labelled,
        } => {
            let args: Value = ArgsObject::default()
                .generate(&generate)
                .number("count", &count)
                .number("minCorrect", &min_correct)
                .number("minIncorrect", &min_incorrect)
                .number("minLabelled", &min_labelled)
                .number("maxLabelled", &max_labelled)
                .value();
            generate_v2(&parse(&generate_v2_args_schema(), &args)?, context)
        }
        Command::Get { input } => {
            let args: Value = ArgsObject::default().input(&input).value();
            get(&parse(&get_args_schema(), &args)?, context)
                .await
                .map(|_| ())
        }
        Command::Labels { input, output } => {
            let args: Value = ArgsObject::default().input(&input).output(&output).value();
            labels(&parse(&labels_args_schema(), &args)?, context)
        }
        Command::Relocate {
            input,
            output,
            from,
            to,
        } => {
            let args: Value = ArgsObject::default()
                .input(&input)
                .output(&output)
                .text("from", &from)
                .text("to", &to)
                .value();
            relocate(&parse(&relocate_args_schema(), &args)?, context)
        }
        Command::Resize {
            input,
            output,
            size,
            square,
        } => {
            let args: Value = ArgsObject::default()
                .input(&input)
                .output(&output)
                .number("size", &size)
                .flag("square", square)
                .value();
            resize(&parse(&resize_args_schema(), &args)?, context)
        }
    }
}

#[tokio::main]
async fn main() {
    let cli: Cli = Cli::try_parse().unwrap_or_else(|error| {
        let _ = error.print();
        std::process::exit(if error.use_stderr() { 1 } else { 0 })
    });
    let mut context: Context = Context::default();
    if let Err(error) = run(cli.command, &mut context).await {
        println!("error {error}");
        std::process::exit(1);
    }
}
