extern crate proc_macro2;

use proc_macro2::{
    Delimiter,
    Group,
    Literal,
    TokenStream,
    TokenTree,
};

use quote::{quote};

#[proc_macro_attribute] 
pub fn inject_self (
    params: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    inject_impl(params.into(), input.into())
        .unwrap_or_else(|err| {
            let err = TokenTree::from(Literal::string(err));
            quote!(
                ::core::compile_error! { #err }
            )
        })
        .into()
}

fn inject_impl (
    params: TokenStream,
    input: TokenStream,
) -> Result<TokenStream, &'static str>
{
    if let Some(_) = params.into_iter().next() {
        return Err("unexpected attribute arguments".into());
    }

    let output = handle(input.clone());

    Ok(output.into_iter().collect())
}

fn handle(input: TokenStream) -> TokenStream {

    let mut input = input.into_iter().peekable();
    let mut output = Vec::<TokenTree>::new();
    let mut found_fn = false;
    while let Some(tt) = input.next() {
        match tt {
            TokenTree::Group(mut g) => {
                
                let span = g.span();
                let mut sub_ts = handle(g.stream());
                if found_fn {
                    if g.delimiter() == Delimiter::Brace {
                        let mut inject = quote!(
                            macro_rules! get_self {
                                () => {
                                    &self
                                }
                            }
                        );
                        inject.extend(sub_ts);
                        sub_ts = inject;
                        found_fn = false;
                    }
                }
                g = Group::new(g.delimiter(), sub_ts);
                g.set_span(span);
                output.push(g.into());
            }
            TokenTree::Ident(i) => {
                if i.to_string() == "fn" {
                    found_fn = true;                    
                }
                output.push(i.into());
            }
            _ => output.push(tt),
        }
    }

    let mut ts = TokenStream::new();
    ts.extend(output);
    ts
}
