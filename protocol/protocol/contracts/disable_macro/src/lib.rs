extern crate proc_macro2;

use proc_macro2::{Delimiter, Group, Literal, TokenStream, TokenTree};

use quote::quote;

#[proc_macro_attribute]
pub fn disable(
    params: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    disable_impl(params.into(), input.into())
        .unwrap_or_else(|err| {
            let err = TokenTree::from(Literal::string(err));
            quote!(::core::compile_error! { #err })
        })
        .into()
}

fn disable_impl(params: TokenStream, input: TokenStream) -> Result<TokenStream, &'static str> {
    if params.into_iter().next().is_some() {
        return Err("unexpected attribute arguments");
    }

    let output = handle(input);

    Ok(output.into_iter().collect())
}

fn handle(input: TokenStream) -> TokenStream {
    let input = input.into_iter().peekable();
    let mut output = Vec::<TokenTree>::new();
    let mut found_fn = false;
    let mut found_return_start = false;
    let mut return_type_result = false;
    let mut inject_enable = false;
    for tt in input {
        match tt {
            TokenTree::Group(mut g) => {
                let span = g.span();
                let mut sub_ts = handle(g.stream());
                if inject_enable && g.delimiter() == Delimiter::Brace {
                    let mut inject = if return_type_result {
                        // return an error from the function instead of panicking
                        quote!(
                            return Err(Error::FunctionDisabled);
                        )
                    } else {
                        // function does not return a result type, so we panic
                        quote!(
                            panic!("Function disabled");
                        )
                    };
                    inject.extend(sub_ts);
                    sub_ts = inject;
                    found_fn = false;
                }
                g = Group::new(g.delimiter(), sub_ts);
                g.set_span(span);
                output.push(g.into());
            }
            TokenTree::Ident(i) => {
                if found_return_start {
                    return_type_result = i == "Result";
                    found_return_start = false;
                    inject_enable = true;
                }
                if i == "fn" {
                    found_fn = true;
                }
                output.push(i.into());
            }
            TokenTree::Punct(p) => {
                if found_fn && p.as_char() == '>' {
                    found_return_start = true;
                    found_fn = false;
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
