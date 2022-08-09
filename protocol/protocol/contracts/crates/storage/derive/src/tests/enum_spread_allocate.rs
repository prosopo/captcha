use crate::enum_spread_allocate_derive;
use syn::parse_quote;
use synstructure::quote;

#[test]
#[should_panic(
    expected = "can only derive `SpreadAllocate` for `enum` types that implement `Default`"
)]
fn enum_without_default_fails() {
    let parsed = &parse_quote! { #[derive(Default)]
        //enum Enum { A, B, #[default] C }
        enum Enum { A, B, C }
    };

    let mut s = synstructure::Structure::new(parsed);

    s.add_where_predicate(syn::parse_quote!(Self: Default));

    enum_spread_allocate_derive(s);
}

#[test]
fn enum_with_default_works() {
    let parsed = &parse_quote! { #[derive(Default)]
        enum Enum { A, B, #[default] C }
    };

    let s = synstructure::Structure::new(parsed);
    let result = enum_spread_allocate_derive(s);
    assert_eq!(
        result.to_string(),
        quote! {
            const _ : () = {
                impl::ink_storage::traits::SpreadAllocate for Enum
                where Self : Default {
                    fn allocate_spread (__key_ptr : & mut :: ink_primitives :: KeyPtr) -> Self {
                        Enum :: C
                    }
                }
            };
        }
        .to_string()
    );
}
