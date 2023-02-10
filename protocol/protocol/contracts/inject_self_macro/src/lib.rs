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
    // parse::Nothing for `params`.
    if let Some(_) = params.into_iter().next() {
        return Err("unexpected attribute arguments".into());
    }

    let input2 = handle(input.clone());

    // let mut ts = TokenStream::new();
    // ts.extend(input2.clone());
    // let output = ts.to_string();
    // println!("output:\n{}\n", output);

    Ok(input2.into_iter().collect())
}

fn handle(input: TokenStream) -> TokenStream {

    let mut input = input.into_iter().peekable();
    let mut output = Vec::<TokenTree>::new();
    let mut found_fn = false;
    while let Some(tt) = input.next() {
        match tt {
            TokenTree::Group(g) => {
                let mut sub_ts = handle(g.stream());
                if found_fn {
                    if g.delimiter() == Delimiter::Brace {
                        let inject = quote!(
                            macro_rules! get_self {
                                () => {
                                    self
                                }
                            }
                        );
                        let mut inject_ts = TokenStream::new();
                        inject_ts.extend(inject);
                        inject_ts.extend(sub_ts);
                        sub_ts = inject_ts;

                        found_fn = false;
                    }
                }
                output.push(TokenTree::Group(Group::new(
                    g.delimiter(),
                    sub_ts,
                )));
            }
            TokenTree::Ident(i) => {
                if i.to_string() == "fn" {
                    found_fn = true;
                }
                output.push(TokenTree::Ident(i));
            }
            _ => output.push(tt),
        }
    }

    let mut ts = TokenStream::new();
    ts.extend(output);
    ts
}
