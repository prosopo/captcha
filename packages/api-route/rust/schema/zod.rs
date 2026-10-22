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

//! The zod source of a schema, for the TypeScript generated from the Rust (MIGRATION.md §5).
//!
//! Every node prints as the zod call it models, except the ones holding a Rust closure (a
//! regex, a refinement, a transform, a preprocessor, `custom`) and native enums, which have no
//! TS spelling of their own. Those are given one with [`Schema::ts_expression`], naming the
//! hand-written TS that does the same; printing one without it is an error, not a guess.

use super::js::number_to_js_string;
use super::{ArrayLimit, Node, NumberCheck, ObjectDef, Schema, StringCheck, UnknownKeys};
use prosopo_logger::json_stringify;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

/// How a schema is written in the generated module, beyond its tree.
#[derive(Clone)]
pub(crate) enum TsForm {
    /// A schema the module exports under this name, documented with the doc comment, and
    /// referred to by name wherever it is reused.
    Named(String, String),
    /// TS source, `{0}`, `{1}`, ... standing for the printed arguments, and the bindings it needs
    /// as `(name, module)`.
    Expression {
        template: String,
        args: Vec<TsArg>,
        imports: Vec<(String, String)>,
    },
}

/// An argument of a [`TsForm::Expression`].
#[derive(Clone)]
pub enum TsArg {
    Schema(Schema),
    Number(f64),
}

/// A schema that cannot be printed, and where.
#[derive(Debug, Clone, PartialEq)]
pub struct ZodError(pub String);

impl std::fmt::Display for ZodError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for ZodError {}

impl Schema {
    /// This schema is exported from the generated module as `name`.
    pub fn ts_named(&self, name: impl Into<String>) -> Schema {
        self.ts_documented(name, "")
    }

    /// This schema is exported from the generated module as `name`, with `doc` as its JSDoc.
    pub fn ts_documented(&self, name: impl Into<String>, doc: impl Into<String>) -> Schema {
        Schema::new(Node::Ts(self.clone(), TsForm::Named(name.into(), doc.into())))
    }

    /// This schema is written as `template` in TS, with `{i}` replaced by `args[i]` printed and
    /// `imports` (`(name, module)`) brought into the module.
    pub fn ts_expression(&self, template: impl Into<String>, args: Vec<TsArg>, imports: Vec<(&str, &str)>) -> Schema {
        let form: TsForm = TsForm::Expression {
            template: template.into(),
            args,
            imports: imports.into_iter().map(|(name, module)| (name.to_string(), module.to_string())).collect(),
        };
        Schema::new(Node::Ts(self.clone(), form))
    }
}

/// A generated module of named zod schemas, each written after the ones it refers to.
#[derive(Default)]
pub struct ZodModule {
    imports: BTreeMap<String, BTreeSet<String>>,
    definitions: Vec<(String, String, String)>,
    defined: BTreeSet<String>,
    /// Lists one item per line, as biome writes an entry too long for one.
    break_lists: bool,
}

/// biome's line width, a tab counting as its indent width of two.
const LINE_WIDTH: usize = 80;

fn width(line: &str) -> usize {
    line.chars().map(|c| if c == '\t' { 2 } else { 1 }).sum()
}

fn key(name: &str) -> String {
    let mut chars = name.chars();
    let identifier: bool = chars.next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_' || c == '$')
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$');
    if identifier {
        name.to_string()
    } else {
        json_stringify(&Value::from(name), 0)
    }
}

fn text(value: &str) -> String {
    json_stringify(&Value::from(value), 0)
}

fn number(value: f64) -> String {
    number_to_js_string(value)
}

/// A doc comment as JSDoc, one line per line; nothing for none.
fn jsdoc(doc: &str) -> String {
    match doc.lines().collect::<Vec<&str>>().as_slice() {
        [] => String::new(),
        [line] => format!("/** {line} */\n"),
        lines => format!("/**\n{} */\n", lines.iter().map(|line| if line.is_empty() { " *\n".to_string() } else { format!(" * {line}\n") }).collect::<String>()),
    }
}

/// A check's arguments: its own, then its message.
fn call(name: &str, args: &[String], message: &Option<String>) -> String {
    let mut all: Vec<String> = args.to_vec();
    if let Some(message) = message {
        all.push(text(message));
    }
    format!(".{name}({})", all.join(", "))
}

impl ZodModule {
    pub fn new() -> ZodModule {
        ZodModule::default()
    }

    /// Adds `schema`, which must be named with [`Schema::ts_named`], and every named schema it
    /// refers to.
    pub fn export(&mut self, schema: &Schema) -> Result<(), ZodError> {
        let Node::Ts(inner, TsForm::Named(name, doc)) = &*schema.0 else {
            return Err(ZodError("only a named schema can be exported".to_string()));
        };
        if self.defined.contains(name) {
            return Ok(());
        }
        self.defined.insert(name.clone());
        let named = |error: ZodError| ZodError(format!("{name}: {}", error.0));
        let mut body: String = self.print(inner, 0).map_err(named)?;
        let first_line: String = format!("export const {name} = {};", body.lines().next().unwrap_or_default());
        if width(&first_line) > LINE_WIDTH && first_line.contains("([") {
            self.break_lists = true;
            let broken: Result<String, ZodError> = self.print(inner, 0);
            self.break_lists = false;
            body = broken.map_err(named)?;
        }
        self.definitions.push((name.clone(), doc.clone(), body));
        Ok(())
    }

    fn import(&mut self, name: &str, module: &str) {
        self.imports.entry(module.to_string()).or_default().insert(name.to_string());
    }

    fn print_string(&self, checks: &[StringCheck], coerce: bool) -> Result<String, ZodError> {
        let mut out: String = if coerce { "z.coerce.string()".to_string() } else { "z.string()".to_string() };
        for check in checks {
            out.push_str(&match check {
                StringCheck::Min(value, message) => call("min", &[value.to_string()], message),
                StringCheck::Max(value, message) => call("max", &[value.to_string()], message),
                StringCheck::Length(value, message) => call("length", &[value.to_string()], message),
                StringCheck::Email(message) => call("email", &[], message),
                StringCheck::Url(message) => call("url", &[], message),
                StringCheck::StartsWith(prefix, message) => call("startsWith", &[text(prefix)], message),
                StringCheck::EndsWith(suffix, message) => call("endsWith", &[text(suffix)], message),
                StringCheck::Includes(part, position, message) => {
                    let mut options: Vec<String> = Vec::new();
                    if let Some(message) = message {
                        options.push(format!("message: {}", text(message)));
                    }
                    if let Some(position) = position {
                        options.push(format!("position: {position}"));
                    }
                    if options.is_empty() {
                        format!(".includes({})", text(part))
                    } else {
                        format!(".includes({}, {{ {} }})", text(part), options.join(", "))
                    }
                }
                StringCheck::Trim => ".trim()".to_string(),
                StringCheck::ToLowerCase => ".toLowerCase()".to_string(),
                StringCheck::Regex(..) => return Err(ZodError("a regex check needs its TS".to_string())),
            });
        }
        Ok(out)
    }

    fn print_number(&self, checks: &[NumberCheck], coerce: bool) -> String {
        let mut out: String = if coerce { "z.coerce.number()".to_string() } else { "z.number()".to_string() };
        for check in checks {
            out.push_str(&match check {
                NumberCheck::Int(message) => call("int", &[], message),
                NumberCheck::Min(value, true, message) => call("min", &[number(*value)], message),
                NumberCheck::Min(value, false, message) => call("gt", &[number(*value)], message),
                NumberCheck::Max(value, true, message) => call("max", &[number(*value)], message),
                NumberCheck::Max(value, false, message) => call("lt", &[number(*value)], message),
                NumberCheck::Finite(message) => call("finite", &[], message),
            });
        }
        out
    }

    /// The items of a list, between its brackets.
    fn print_list(&mut self, items: &[Schema], indent: usize) -> Result<String, ZodError> {
        if !self.break_lists {
            let printed: Vec<String> = items.iter().map(|item| self.print(item, indent)).collect::<Result<_, _>>()?;
            return Ok(printed.join(", "));
        }
        self.break_lists = false;
        let pad: String = "\t".repeat(indent + 1);
        let printed: Result<Vec<String>, ZodError> = items.iter().map(|item| self.print(item, indent + 1)).collect();
        self.break_lists = true;
        Ok(format!("\n{}\n{}", printed?.iter().map(|item| format!("{pad}{item},")).collect::<Vec<String>>().join("\n"), "\t".repeat(indent)))
    }

    fn print_values(&self, values: &[Value], indent: usize) -> String {
        let printed: Vec<String> = values.iter().map(|value| json_stringify(value, 0)).collect();
        if !self.break_lists {
            return printed.join(", ");
        }
        let pad: String = "\t".repeat(indent + 1);
        format!("\n{}\n{}", printed.iter().map(|item| format!("{pad}{item},")).collect::<Vec<String>>().join("\n"), "\t".repeat(indent))
    }

    /// An object entry, its lists broken when the line would be too long.
    fn print_entry(&mut self, name: &str, schema: &Schema, indent: usize) -> Result<String, ZodError> {
        let pad: String = "\t".repeat(indent);
        let line: String = format!("{pad}{}: {},", key(name), self.print(schema, indent)?);
        if width(&line) <= LINE_WIDTH || !line.contains("([") {
            return Ok(line);
        }
        self.break_lists = true;
        let broken: Result<String, ZodError> = self.print(schema, indent);
        self.break_lists = false;
        Ok(format!("{pad}{}: {},", key(name), broken?))
    }

    fn print_object(&mut self, def: &ObjectDef, indent: usize) -> Result<String, ZodError> {
        let mut out: String = if def.shape.is_empty() { "z.object({".to_string() } else { "z.object({\n".to_string() };
        for (name, schema) in &def.shape {
            out.push_str(&self.print_entry(name, schema, indent + 1)?);
            out.push('\n');
        }
        if !def.shape.is_empty() {
            out.push_str(&"\t".repeat(indent));
        }
        out.push_str("})");
        match def.unknown_keys {
            UnknownKeys::Strip => {}
            UnknownKeys::Strict => out.push_str(".strict()"),
            UnknownKeys::Passthrough => out.push_str(".passthrough()"),
        }
        if let Some(catchall) = &def.catchall {
            out.push_str(&format!(".catchall({})", self.print(catchall, indent)?));
        }
        Ok(out)
    }

    fn print_array(&mut self, item: &Schema, limits: [(&str, &Option<ArrayLimit>); 3], indent: usize) -> Result<String, ZodError> {
        let mut out: String = format!("z.array({})", self.print(item, indent)?);
        for (name, limit) in limits {
            if let Some(limit) = limit {
                out.push_str(&call(name, &[limit.value.to_string()], &limit.message));
            }
        }
        Ok(out)
    }

    fn print_expression(&mut self, template: &str, args: &[TsArg], imports: &[(String, String)], indent: usize) -> Result<String, ZodError> {
        for (name, module) in imports {
            self.import(name, module);
        }
        let mut out: String = template.to_string();
        for (index, arg) in args.iter().enumerate() {
            let printed: String = match arg {
                TsArg::Schema(schema) => self.print(schema, indent)?,
                TsArg::Number(value) => number(*value),
            };
            out = out.replace(&format!("{{{index}}}"), &printed);
        }
        Ok(out)
    }

    fn print(&mut self, schema: &Schema, indent: usize) -> Result<String, ZodError> {
        Ok(match &*schema.0 {
            Node::Ts(_, TsForm::Named(name, _)) => {
                self.export(schema)?;
                name.clone()
            }
            Node::Ts(_, TsForm::Expression { template, args, imports }) => self.print_expression(template, args, imports, indent)?,
            Node::String { checks, coerce } => self.print_string(checks, *coerce)?,
            Node::Number { checks, coerce } => self.print_number(checks, *coerce),
            Node::Boolean => "z.boolean()".to_string(),
            Node::BigInt { coerce: false } => "z.bigint()".to_string(),
            Node::BigInt { coerce: true } => "z.coerce.bigint()".to_string(),
            Node::Undefined => "z.undefined()".to_string(),
            Node::Any => "z.any()".to_string(),
            Node::Literal(value) => format!("z.literal({})", json_stringify(value, 0)),
            Node::Enum(values) => format!("z.enum([{}])", self.print_values(values, indent)),
            Node::NativeEnum(_) => return Err(ZodError("a native enum needs its TS name".to_string())),
            Node::Object(def) => self.print_object(def, indent)?,
            Node::Array { item, min, max, exact } => self.print_array(item, [("min", min), ("max", max), ("length", exact)], indent)?,
            Node::Tuple(items) => format!("z.tuple([{}])", self.print_list(items, indent)?),
            Node::Record(keys, values) => format!("z.record({}, {})", self.print(keys, indent)?, self.print(values, indent)?),
            Node::Union(items) => format!("z.union([{}])", self.print_list(items, indent)?),
            Node::Intersection(left, right) => format!("{}.and({})", self.print(left, indent)?, self.print(right, indent)?),
            Node::Optional(inner) => format!("{}.optional()", self.print(inner, indent)?),
            Node::Nullable(inner) => format!("{}.nullable()", self.print(inner, indent)?),
            Node::Default(inner, value) => format!("{}.default({})", self.print(inner, indent)?, json_stringify(&value(), 0)),
            Node::Pipeline(input, output) => format!("{}.pipe({})", self.print(input, indent)?, self.print(output, indent)?),
            Node::Refinement(..) | Node::Transform(..) | Node::Preprocess(..) => return Err(ZodError("a refinement, transform or preprocessor needs its TS".to_string())),
        })
    }

    /// The module: zod and the other bindings imported, then each schema exported as `const`.
    pub fn render(&self) -> String {
        let mut out: String = String::from("import { z } from \"zod\";\n");
        for (module, names) in &self.imports {
            out.push_str(&format!("import {{ {} }} from {};\n", names.iter().cloned().collect::<Vec<String>>().join(", "), text(module)));
        }
        for (name, doc, body) in &self.definitions {
            out.push('\n');
            out.push_str(&jsdoc(doc));
            out.push_str(&format!("export const {name} = {body};\n"));
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::super::{array, custom, literal, number as number_schema, object, string, union};
    use super::*;

    fn rendered(schema: &Schema) -> Result<String, ZodError> {
        let mut module: ZodModule = ZodModule::new();
        module.export(schema)?;
        Ok(module.render())
    }

    #[test]
    fn prints_the_tree_as_zod() {
        let event: Schema = object(vec![("kind", union(vec![literal("play"), literal("key")])), ("t", number_schema().int().min(0.0).max(9.0).optional())]).ts_named("EventSchema");
        let body: Schema = object(vec![
            ("procaptcha-response", string().max(64.0).starts_with("0x")),
            ("events", array(event.clone()).max(3.0)),
            ("again", event),
        ])
        .strict()
        .ts_named("BodySchema");
        assert_eq!(
            rendered(&body),
            Ok("import { z } from \"zod\";\n\
                \nexport const EventSchema = z.object({\n\
                \tkind: z.union([z.literal(\"play\"), z.literal(\"key\")]),\n\
                \tt: z.number().int().min(0).max(9).optional(),\n\
                });\n\
                \nexport const BodySchema = z.object({\n\
                \t\"procaptcha-response\": z.string().max(64).startsWith(\"0x\"),\n\
                \tevents: z.array(EventSchema).max(3),\n\
                \tagain: EventSchema,\n\
                }).strict();\n"
                .to_string())
        );
    }

    #[test]
    fn prints_an_expression_for_what_the_tree_cannot_say() {
        let challenge: Schema = custom(|_| true).ts_expression("PowChallengeIdSchema", Vec::new(), vec![("PowChallengeIdSchema", "../datasets/captcha.js")]);
        let bounded: Schema = array(string()).ts_expression("boundedArray({0}, {1})", vec![TsArg::Schema(string()), TsArg::Number(5.0)], vec![("boundedArray", "../api/sanitise.js")]);
        let body: Schema = object(vec![("challenge", challenge), ("list", bounded.optional())]).ts_named("Body");
        assert_eq!(
            rendered(&body),
            Ok("import { z } from \"zod\";\n\
                import { boundedArray } from \"../api/sanitise.js\";\n\
                import { PowChallengeIdSchema } from \"../datasets/captcha.js\";\n\
                \nexport const Body = z.object({\n\
                \tchallenge: PowChallengeIdSchema,\n\
                \tlist: boundedArray(z.string(), 5).optional(),\n\
                });\n"
                .to_string())
        );
    }

    #[test]
    fn breaks_a_list_too_long_for_its_line_as_biome_does() {
        let kinds: Schema = union(vec![literal("play"), literal("pause"), literal("replay"), literal("key")]);
        let event: Schema = object(vec![("kind", kinds.clone()), ("short", union(vec![literal("a"), literal("b")]))]).ts_named("Event");
        assert_eq!(
            rendered(&event),
            Ok("import { z } from \"zod\";\n\
                \nexport const Event = z.object({\n\
                \tkind: z.union([\n\
                \t\tz.literal(\"play\"),\n\
                \t\tz.literal(\"pause\"),\n\
                \t\tz.literal(\"replay\"),\n\
                \t\tz.literal(\"key\"),\n\
                \t]),\n\
                \tshort: z.union([z.literal(\"a\"), z.literal(\"b\")]),\n\
                });\n"
                .to_string())
        );
    }

    #[test]
    fn breaks_an_export_too_long_for_its_line() {
        let environments: Schema = super::super::string_enum(&["development", "staging", "production"]).ts_named("EnvironmentTypesSchema");
        assert_eq!(
            rendered(&environments),
            Ok("import { z } from \"zod\";\n\
                \nexport const EnvironmentTypesSchema = z.enum([\n\
                \t\"development\",\n\
                \t\"staging\",\n\
                \t\"production\",\n\
                ]);\n"
                .to_string())
        );
    }

    #[test]
    fn documents_a_named_schema() {
        let one: Schema = string().ts_documented("One", "A line.");
        let two: Schema = object(vec![("one", one)]).ts_documented("Two", "First.\nSecond.");
        assert_eq!(
            rendered(&two),
            Ok("import { z } from \"zod\";\n\
                \n/** A line. */\nexport const One = z.string();\n\
                \n/**\n * First.\n * Second.\n */\nexport const Two = z.object({\n\tone: One,\n});\n"
                .to_string())
        );
    }

    #[test]
    fn refuses_to_guess_at_a_closure() {
        let body: Schema = object(vec![("check", custom(|_| true))]).ts_named("Body");
        assert_eq!(rendered(&body), Err(ZodError("Body: a refinement, transform or preprocessor needs its TS".to_string())));
        assert_eq!(rendered(&string()), Err(ZodError("only a named schema can be exported".to_string())));
    }

    #[test]
    fn a_name_does_not_change_what_parses() {
        let named: Schema = object(vec![("a", string())]).ts_named("A");
        assert_eq!(named.safe_parse(Some(&serde_json::json!({ "a": "x", "b": 1 }))), object(vec![("a", string())]).safe_parse(Some(&serde_json::json!({ "a": "x", "b": 1 }))));
        assert_eq!(named.extend(vec![("b", number_schema())]).shape().len(), 2);
    }
}
