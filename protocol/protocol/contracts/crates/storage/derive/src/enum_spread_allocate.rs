use proc_macro2::TokenStream as TokenStream2;
use quote::quote;
use synstructure::VariantInfo;

pub fn enum_spread_allocate_derive(mut s: synstructure::Structure) -> TokenStream2 {
    s.bind_with(|_| synstructure::BindStyle::Move)
        .add_bounds(synstructure::AddBounds::Generics)
        .underscore_const(true);
    match s.ast().data {
        syn::Data::Enum(_) => derive_enum_struct(s),
        syn::Data::Struct(_) => {
            panic!("cannot derive `EnumSpreadAllocate` for `union` types, use `SpreadAllocate` instead")
        }
        syn::Data::Union(_) => {
            panic!("cannot derive `EnumSpreadAllocate` for `union` types")
        }
    }
}

/// Derives `ink_storage`'s `SpreadAllocate` trait for the given `enum`.
fn derive_enum_struct(s: synstructure::Structure) -> TokenStream2 {
    let default_index = search_variants_for_default(s.variants());
    let variant = &s.variants()[default_index];
    let allocate_body = allocate_body(variant);
    s.gen_impl(quote! {
        gen impl ::ink_storage::traits::SpreadAllocate for @Self
            where Self:Default {
                fn allocate_spread(__key_ptr: &mut ::ink_primitives::KeyPtr) -> Self {
                    #allocate_body
            }
        }
    })
}

fn allocate_body(variant: &VariantInfo) -> TokenStream2 {
    variant.construct(|field, _index| {
        let ty = &field.ty;
        quote! {
            <#ty as ::ink_storage::traits::SpreadAllocate>::allocate_spread(__key_ptr)
        }
    })
}

fn search_variants_for_default(variants: &[VariantInfo]) -> usize {
    for (index, variant) in variants.iter().enumerate() {
        for attr in variant.ast().attrs {
            for segment in &attr.path.segments {
                if segment.ident == "default" {
                    return index;
                }
            }
        }
    }
    panic!("can only derive `SpreadAllocate` for `enum` types that implement `Default`")
}
