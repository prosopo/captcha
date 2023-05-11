extern crate proc_macro2;

use proc_macro2::{Delimiter, Group, Literal, TokenStream, TokenTree};

use quote::quote;

#[proc_macro_attribute]
pub fn named_functions(
    params: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    named_impl(params.into(), input.into())
        .unwrap_or_else(|err| {
            let err = TokenTree::from(Literal::string(err));
            quote!(::core::compile_error! { #err })
        })
        .into()
}

fn named_impl(params: TokenStream, input: TokenStream) -> Result<TokenStream, &'static str> {
    if params.into_iter().next().is_some() {
        return Err("unexpected attribute arguments");
    }

    let output = handle(input);

    Ok(output.into_iter().collect())
}

#[derive(PartialEq, Debug, Eq, Clone, Copy)]
enum State {
    Fn,
    FnName,
    Dash,
    Arrow,
    Body,
}

fn handle(input: TokenStream) -> TokenStream {
    let input = input.into_iter().peekable();
    let mut output = Vec::<TokenTree>::new();
    let mut state = State::Fn;
    let mut fname: String = "unknown".to_string();
    for tt in input {
        match tt {
            TokenTree::Group(mut g) => {
                let span = g.span();
                let mut sub_ts = handle(g.stream());
                // the group following the arrow with the curly delimiter will be the body of the func
                if state == State::Body && g.delimiter() == Delimiter::Brace {
                    let mut inject = quote!(
                        macro_rules! function_name {() => (
                            #fname
                        )}
                    );
                    inject.extend(sub_ts);
                    sub_ts = inject;
                    state = State::Fn;
                }
                g = Group::new(g.delimiter(), sub_ts);
                g.set_span(span);
                output.push(g.into());
            }
            TokenTree::Ident(i) => {
                if i == "fn" {
                    // found the "fn" keyword
                    // now look for the fn name
                    state = State::FnName;
                } else if state == State::FnName {
                    // if already found the "fn" , the func name should follow
                    fname = i.to_string();
                    // look for the dash and ">" after the params
                    state = State::Dash;
                }
                output.push(i.into());
            }
            TokenTree::Punct(p) => {
                if state == State::Dash {
                    if p.to_string() == "-" {
                        // found the dash
                        // look for the arrow next
                        state = State::Arrow;
                    }
                } else if state == State::Arrow {
                    if p.to_string() == ">" {
                        // found the arrow
                        // look for the body next
                        state = State::Body;
                    } else {
                        // if the arrow is not found, it's a standalone dash. Keep looking.
                        state = State::Dash;
                    }
                }
                output.push(p.into());
            }
            _ => output.push(tt),
        }
    }

    let mut ts = TokenStream::new();
    ts.extend(output);
    ts
}
