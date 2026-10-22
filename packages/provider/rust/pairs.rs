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

//! pairs.ts: the coordinate pairs an image solution's salts carry, and whether the selections
//! look scripted.

use prosopo_types::datasets::InputMethod;
use prosopo_util_crypto::js::js_number_to_string;
use std::collections::HashSet;

/// `constructPairList`: consecutive numbers as pairs; an odd count is refused.
pub fn construct_pair_list(list: &[f64]) -> Result<Vec<[f64; 2]>, String> {
    if list.len() % 2 != 0 {
        return Err("Invalid pairs length".to_string());
    }
    Ok(list.chunks(2).map(|pair| [pair[0], pair[1]]).collect())
}

/// What `peelCheckboxPrefix` gives: the checkbox's click, when the first captcha's salt starts
/// with one, and every captcha's coordinates without it.
#[derive(Debug, Clone, PartialEq)]
pub struct Peeled {
    pub checkbox: Option<[f64; 2]>,
    pub flat: Vec<Vec<f64>>,
}

/// `peelCheckboxPrefix`: the first salt carries the checkbox click when it holds one pair more
/// than its captcha has selections.
pub fn peel_checkbox_prefix(flat: &[Vec<f64>], solution_lengths: &[usize]) -> Peeled {
    match (flat.first(), solution_lengths.first()) {
        (Some(first), Some(length)) if first.len() == 2 * length + 2 => {
            let mut stripped: Vec<Vec<f64>> = vec![first[2..].to_vec()];
            stripped.extend(flat[1..].iter().cloned());
            Peeled { checkbox: Some([first[0], first[1]]), flat: stripped }
        }
        _ => Peeled { checkbox: None, flat: flat.to_vec() },
    }
}

/// `resolveInputMethods`: each captcha's declared methods, pointer throughout where it declared
/// none, or `None` when a captcha declared a different number than it has pairs.
pub fn resolve_input_methods(flat: &[Vec<f64>], declared: &[Option<Vec<InputMethod>>]) -> Option<Vec<Vec<InputMethod>>> {
    let mut resolved: Vec<Vec<InputMethod>> = Vec::new();
    for (index, list) in flat.iter().enumerate() {
        let pair_count: usize = list.len() / 2;
        match declared.get(index).and_then(Option::as_ref) {
            None => resolved.push(vec![InputMethod::Pointer; pair_count]),
            Some(methods) if list.len() % 2 == 0 && methods.len() == pair_count => resolved.push(methods.clone()),
            Some(_) => return None,
        }
    }
    Some(resolved)
}

/// `peelCheckboxInputMethod`: the checkbox's method as its own list, as its coordinates are.
pub fn peel_checkbox_input_method(methods: Vec<Vec<InputMethod>>) -> Vec<Vec<InputMethod>> {
    match methods.split_first() {
        Some((first, rest)) if !first.is_empty() => {
            let mut out: Vec<Vec<InputMethod>> = vec![first[..1].to_vec(), first[1..].to_vec()];
            out.extend(rest.iter().cloned());
            out
        }
        _ => methods,
    }
}

fn is_keyboard(input_methods: Option<&[Vec<InputMethod>]>, list_index: usize, pair_index: usize) -> bool {
    input_methods.and_then(|methods| methods.get(list_index)).and_then(|list| list.get(pair_index)) == Some(&InputMethod::Keyboard)
}

/// `keyboardSelectionHasPosition`: a keyboard selection, which has no position, carries one.
pub fn keyboard_selection_has_position(pairs_lists: &[Vec<[f64; 2]>], input_methods: &[Vec<InputMethod>]) -> bool {
    pairs_lists.iter().enumerate().any(|(list_index, pairs)| {
        pairs.iter().enumerate().any(|(pair_index, [x, y])| is_keyboard(Some(input_methods), list_index, pair_index) && (*x != 0.0 || *y != 0.0))
    })
}

/// `containsIdenticalPairs`: a pointer position repeats anywhere across the lists.
pub fn contains_identical_pairs(pairs_lists: &[Vec<[f64; 2]>], input_methods: Option<&[Vec<InputMethod>]>) -> bool {
    let mut seen: HashSet<String> = HashSet::new();
    for (list_index, pairs) in pairs_lists.iter().enumerate() {
        for (pair_index, [x, y]) in pairs.iter().enumerate() {
            if is_keyboard(input_methods, list_index, pair_index) {
                continue;
            }
            if !seen.insert(format!("{},{}", js_number_to_string(*x), js_number_to_string(*y))) {
                return true;
            }
        }
    }
    false
}

/// `selectionsLookScripted`.
pub fn selections_look_scripted(pairs_lists: &[Vec<[f64; 2]>], input_methods: Option<&[Vec<InputMethod>]>) -> bool {
    match input_methods {
        None => true,
        Some(methods) => keyboard_selection_has_position(pairs_lists, methods) || contains_identical_pairs(pairs_lists, Some(methods)),
    }
}

#[cfg(test)]
mod tests {
    //! Against pairs-vectors.json, which equivalence/generate-pairs.ts writes from the TS.
    use super::*;
    use serde_json::{json, Value};

    fn chain(flat: &[Vec<f64>], lengths: &[usize], declared: &[Option<Vec<InputMethod>>]) -> Result<Value, String> {
        let peeled: Peeled = peel_checkbox_prefix(flat, lengths);
        let mut pairs: Vec<Vec<[f64; 2]>> = Vec::new();
        if let Some(checkbox) = peeled.checkbox {
            pairs.push(vec![checkbox]);
        }
        for list in &peeled.flat {
            pairs.push(construct_pair_list(list)?);
        }
        let raw: Option<Vec<Vec<InputMethod>>> = resolve_input_methods(flat, declared);
        let methods: Option<Vec<Vec<InputMethod>>> = match raw {
            Some(raw) if peeled.checkbox.is_some() => Some(peel_checkbox_input_method(raw)),
            other => other,
        };
        Ok(json!({
            "checkbox": peeled.checkbox,
            "pairs": pairs,
            "inputMethods": methods.as_ref().map(|methods| methods.iter().map(|list| list.iter().map(|method| method.as_str()).collect::<Vec<_>>()).collect::<Vec<_>>()),
            "keyboardHasPosition": methods.as_ref().map(|methods| keyboard_selection_has_position(&pairs, methods)),
            "identicalWithMethods": contains_identical_pairs(&pairs, methods.as_deref()),
            "identical": contains_identical_pairs(&pairs, None),
            "scripted": selections_look_scripted(&pairs, methods.as_deref()),
        }))
    }

    /// Numbers compared by value, so `1` and `1.0` agree.
    fn numeric(value: &Value) -> Value {
        match value {
            Value::Number(number) => json!(number.as_f64()),
            Value::Array(items) => Value::Array(items.iter().map(numeric).collect()),
            Value::Object(fields) => Value::Object(fields.iter().map(|(key, value)| (key.clone(), numeric(value))).collect()),
            other => other.clone(),
        }
    }

    #[test]
    fn equivalence_pairs() {
        let vectors: Value = serde_json::from_str(include_str!("equivalence/pairs-vectors.json")).expect("pairs-vectors.json parses");
        let chains: &Vec<Value> = vectors["chains"].as_array().expect("chains");
        assert!(chains.len() > 400);
        for case in chains {
            let flat: Vec<Vec<f64>> = serde_json::from_value(case["flat"].clone()).expect("flat");
            let lengths: Vec<usize> = serde_json::from_value(case["lengths"].clone()).expect("lengths");
            let declared: Vec<Option<Vec<InputMethod>>> = serde_json::from_value(case["declared"].clone()).expect("declared");
            let actual: Value = match chain(&flat, &lengths, &declared) {
                Ok(result) => json!({ "ok": result }),
                Err(message) => json!({ "thrown": message }),
            };
            assert_eq!(numeric(&actual), numeric(&case["result"]), "{case}");
        }
    }
}
