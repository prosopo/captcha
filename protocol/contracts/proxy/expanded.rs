#![feature(prelude_import)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
pub mod proxy {
    impl ::ink::env::ContractEnv for Proxy {
        type Env = ::ink::env::DefaultEnvironment;
    }
    type Environment = <Proxy as ::ink::env::ContractEnv>::Env;
    type AccountId =
        <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::AccountId;
    type Balance = <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::Balance;
    type Hash = <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::Hash;
    type Timestamp =
        <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::Timestamp;
    type BlockNumber =
        <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::BlockNumber;
    type ChainExtension =
        <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::ChainExtension;
    const MAX_EVENT_TOPICS: usize =
        <<Proxy as ::ink::env::ContractEnv>::Env as ::ink::env::Environment>::MAX_EVENT_TOPICS;
    const _: () = {
        struct Check {
            salt: (),
        }
    };
    #[cfg(not(feature = "__ink_dylint_Storage"))]
    pub struct Proxy {}
    const _: () = {
        impl<__ink_generic_salt: ::ink::storage::traits::StorageKey>
            ::ink::storage::traits::StorableHint<__ink_generic_salt> for Proxy
        {
            type Type = Proxy;
            type PreferredKey = ::ink::storage::traits::AutoKey;
        }
    };
    const _: () = {
        impl ::ink::storage::traits::StorageKey for Proxy {
            const KEY: ::ink::primitives::Key = <() as ::ink::storage::traits::StorageKey>::KEY;
        }
    };
    const _: () = {
        impl ::ink::storage::traits::Storable for Proxy {
            #[inline(always)]
            #[allow(non_camel_case_types)]
            fn decode<__ink_I: ::scale::Input>(
                __input: &mut __ink_I,
            ) -> ::core::result::Result<Self, ::scale::Error> {
                ::core::result::Result::Ok(Proxy {})
            }
            #[inline(always)]
            #[allow(non_camel_case_types)]
            fn encode<__ink_O: ::scale::Output + ?::core::marker::Sized>(
                &self,
                __dest: &mut __ink_O,
            ) {
                match self {
                    Proxy {} => {}
                }
            }
        }
    };
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl ::scale_info::TypeInfo for Proxy {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new("Proxy", "proxy::proxy"))
                    .type_params(::alloc::vec::Vec::new())
                    .composite(::scale_info::build::Fields::named())
            }
        }
    };
    const _: () = {
        impl ::ink::storage::traits::StorageLayout for Proxy {
            fn layout(__key: &::ink::primitives::Key) -> ::ink::metadata::layout::Layout {
                ::ink::metadata::layout::Layout::Struct(::ink::metadata::layout::StructLayout::new(
                    "Proxy",
                    [],
                ))
            }
        }
    };
    #[automatically_derived]
    impl ::core::default::Default for Proxy {
        #[inline]
        fn default() -> Proxy {
            Proxy {}
        }
    }
    const _: () = {
        impl ::ink::reflect::ContractName for Proxy {
            const NAME: &'static str = "Proxy";
        }
    };
    const _: () = {
        impl<'a> ::ink::codegen::Env for &'a Proxy {
            type EnvAccess = ::ink::EnvAccess<'a, <Proxy as ::ink::env::ContractEnv>::Env>;
            fn env(self) -> Self::EnvAccess {
                <<Self as ::ink::codegen::Env>::EnvAccess as ::core::default::Default>::default()
            }
        }
        impl<'a> ::ink::codegen::StaticEnv for Proxy {
            type EnvAccess = ::ink::EnvAccess<'static, <Proxy as ::ink::env::ContractEnv>::Env>;
            fn env() -> Self::EnvAccess {
                <<Self as ::ink::codegen::StaticEnv>::EnvAccess as ::core::default::Default>::default()
            }
        }
    };
    const _: () = {
        #[allow(unused_imports)]
        use ::ink::codegen::{Env as _, StaticEnv as _};
    };
    impl ::ink::reflect::DispatchableConstructorInfo<0x9BAE9D5E_u32> for Proxy {
        type Input = ();
        type Output = Result<Self, Error>;
        type Storage = Proxy;
        type Error = <::ink::reflect::ConstructorOutputValue<
            Result<Self, Error>,
        > as ::ink::reflect::ConstructorOutput<Proxy>>::Error;
        const IS_RESULT: ::core::primitive::bool = <::ink::reflect::ConstructorOutputValue<
            Result<Self, Error>,
        > as ::ink::reflect::ConstructorOutput<Proxy>>::IS_RESULT;
        const CALLABLE: fn(Self::Input) -> Self::Output = |_| Proxy::new();
        const PAYABLE: ::core::primitive::bool = false;
        const SELECTOR: [::core::primitive::u8; 4usize] = [0x9B_u8, 0xAE_u8, 0x9D_u8, 0x5E_u8];
        const LABEL: &'static ::core::primitive::str = "new";
    }
    impl ::ink::reflect::DispatchableConstructorInfo<0x794560E8_u32> for Proxy {
        type Input = ();
        type Output = Self;
        type Storage = Proxy;
        type Error =
            <::ink::reflect::ConstructorOutputValue<Self> as ::ink::reflect::ConstructorOutput<
                Proxy,
            >>::Error;
        const IS_RESULT: ::core::primitive::bool =
            <::ink::reflect::ConstructorOutputValue<Self> as ::ink::reflect::ConstructorOutput<
                Proxy,
            >>::IS_RESULT;
        const CALLABLE: fn(Self::Input) -> Self::Output = |_| Proxy::new_panic();
        const PAYABLE: ::core::primitive::bool = false;
        const SELECTOR: [::core::primitive::u8; 4usize] = [0x79_u8, 0x45_u8, 0x60_u8, 0xE8_u8];
        const LABEL: &'static ::core::primitive::str = "new_panic";
    }
    impl ::ink::reflect::DispatchableMessageInfo<0x45753C2B_u32> for Proxy {
        type Input = ();
        type Output = u32;
        type Storage = Proxy;
        const CALLABLE: fn(&mut Self::Storage, Self::Input) -> Self::Output =
            |storage, _| Proxy::forward(storage);
        const SELECTOR: [::core::primitive::u8; 4usize] = [0x45_u8, 0x75_u8, 0x3C_u8, 0x2B_u8];
        const PAYABLE: ::core::primitive::bool = true;
        const MUTATES: ::core::primitive::bool = false;
        const LABEL: &'static ::core::primitive::str = "forward";
    }
    impl ::ink::reflect::DispatchableMessageInfo<0x9BAE9D5E_u32> for Proxy {
        type Input = ProxyMessages;
        type Output = Result<ProxyReturnTypes, Error>;
        type Storage = Proxy;
        const CALLABLE: fn(&mut Self::Storage, Self::Input) -> Self::Output =
            |storage, __ink_binding_0| Proxy::handler(storage, __ink_binding_0);
        const SELECTOR: [::core::primitive::u8; 4usize] = [0x9B_u8, 0xAE_u8, 0x9D_u8, 0x5E_u8];
        const PAYABLE: ::core::primitive::bool = false;
        const MUTATES: ::core::primitive::bool = true;
        const LABEL: &'static ::core::primitive::str = "handler";
    }
    const _: () = {
        #[allow(non_camel_case_types)]
        pub enum __ink_ConstructorDecoder {
            Constructor0(
                <Proxy as ::ink::reflect::DispatchableConstructorInfo<0x9BAE9D5E_u32>>::Input,
            ),
            Constructor1(
                <Proxy as ::ink::reflect::DispatchableConstructorInfo<0x794560E8_u32>>::Input,
            ),
        }
        impl ::ink::reflect::DecodeDispatch for __ink_ConstructorDecoder {
            fn decode_dispatch<I>(
                input: &mut I,
            ) -> ::core::result::Result<Self, ::ink::reflect::DispatchError>
            where
                I: ::scale::Input,
            {
                const CONSTRUCTOR_0: [::core::primitive::u8; 4usize] = <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                    0x9BAE9D5E_u32,
                >>::SELECTOR;
                const CONSTRUCTOR_1: [::core::primitive::u8; 4usize] = <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                    0x794560E8_u32,
                >>::SELECTOR;
                match <[::core::primitive::u8; 4usize] as ::scale::Decode>::decode(input)
                    .map_err(|_| ::ink::reflect::DispatchError::InvalidSelector)?
                {
                    CONSTRUCTOR_0 => {
                        ::core::result::Result::Ok(Self::Constructor0(
                            <<Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                0x9BAE9D5E_u32,
                            >>::Input as ::scale::Decode>::decode(input)
                            .map_err(|_| ::ink::reflect::DispatchError::InvalidParameters)?,
                        ))
                    }
                    CONSTRUCTOR_1 => {
                        ::core::result::Result::Ok(Self::Constructor1(
                            <<Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                0x794560E8_u32,
                            >>::Input as ::scale::Decode>::decode(input)
                            .map_err(|_| ::ink::reflect::DispatchError::InvalidParameters)?,
                        ))
                    }
                    _invalid => {
                        ::core::result::Result::Err(::ink::reflect::DispatchError::UnknownSelector)
                    }
                }
            }
        }
        impl ::scale::Decode for __ink_ConstructorDecoder {
            fn decode<I>(input: &mut I) -> ::core::result::Result<Self, ::scale::Error>
            where
                I: ::scale::Input,
            {
                <Self as ::ink::reflect::DecodeDispatch>::decode_dispatch(input)
                    .map_err(::core::convert::Into::into)
            }
        }
        impl ::ink::reflect::ExecuteDispatchable for __ink_ConstructorDecoder {
            #[allow(clippy::nonminimal_bool)]
            fn execute_dispatchable(
                self,
            ) -> ::core::result::Result<(), ::ink::reflect::DispatchError> {
                match self {
                    Self::Constructor0(input) => {
                        if {
                            false
                                || {
                                    let constructor_0 = false;
                                    let constructor_0 =
                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                            0x9BAE9D5E_u32,
                                        >>::PAYABLE;
                                    constructor_0
                                }
                                || {
                                    let constructor_1 = false;
                                    let constructor_1 =
                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                            0x794560E8_u32,
                                        >>::PAYABLE;
                                    constructor_1
                                }
                        } && !<Proxy as ::ink::reflect::DispatchableConstructorInfo<
                            0x9BAE9D5E_u32,
                        >>::PAYABLE
                        {
                            ::ink::codegen::deny_payment::<<Proxy as ::ink::env::ContractEnv>::Env>(
                            )?;
                        }
                        let result: <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                            0x9BAE9D5E_u32,
                        >>::Output = <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                            0x9BAE9D5E_u32,
                        >>::CALLABLE(input);
                        let output_value = ::ink::reflect::ConstructorOutputValue::new(result);
                        let output_result = <::ink::reflect::ConstructorOutputValue<
                            <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                0x9BAE9D5E_u32,
                            >>::Output,
                        > as ::ink::reflect::ConstructorOutput<Proxy>>::as_result(
                            &output_value
                        );
                        if let ::core::result::Result::Ok(contract) = output_result.as_ref() {
                            ::ink::env::set_contract_storage::<::ink::primitives::Key, Proxy>(
                                &<Proxy as ::ink::storage::traits::StorageKey>::KEY,
                                contract,
                            );
                        }
                        ::ink::env::return_value::<
                            ::ink::ConstructorResult<
                                ::core::result::Result<
                                    (),
                                    &<::ink::reflect::ConstructorOutputValue<
                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                            0x9BAE9D5E_u32,
                                        >>::Output,
                                    > as ::ink::reflect::ConstructorOutput<Proxy>>::Error,
                                >,
                            >,
                        >(
                            ::ink::env::ReturnFlags::new_with_reverted(output_result.is_err()),
                            &::ink::ConstructorResult::Ok(output_result.map(|_| ())),
                        );
                    }
                    Self::Constructor1(input) => {
                        if {
                            false
                                || {
                                    let constructor_0 = false;
                                    let constructor_0 =
                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                            0x9BAE9D5E_u32,
                                        >>::PAYABLE;
                                    constructor_0
                                }
                                || {
                                    let constructor_1 = false;
                                    let constructor_1 =
                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                            0x794560E8_u32,
                                        >>::PAYABLE;
                                    constructor_1
                                }
                        } && !<Proxy as ::ink::reflect::DispatchableConstructorInfo<
                            0x794560E8_u32,
                        >>::PAYABLE
                        {
                            ::ink::codegen::deny_payment::<<Proxy as ::ink::env::ContractEnv>::Env>(
                            )?;
                        }
                        let result: <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                            0x794560E8_u32,
                        >>::Output = <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                            0x794560E8_u32,
                        >>::CALLABLE(input);
                        let output_value = ::ink::reflect::ConstructorOutputValue::new(result);
                        let output_result = <::ink::reflect::ConstructorOutputValue<
                            <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                0x794560E8_u32,
                            >>::Output,
                        > as ::ink::reflect::ConstructorOutput<Proxy>>::as_result(
                            &output_value
                        );
                        if let ::core::result::Result::Ok(contract) = output_result.as_ref() {
                            ::ink::env::set_contract_storage::<::ink::primitives::Key, Proxy>(
                                &<Proxy as ::ink::storage::traits::StorageKey>::KEY,
                                contract,
                            );
                        }
                        ::ink::env::return_value::<
                            ::ink::ConstructorResult<
                                ::core::result::Result<
                                    (),
                                    &<::ink::reflect::ConstructorOutputValue<
                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                            0x794560E8_u32,
                                        >>::Output,
                                    > as ::ink::reflect::ConstructorOutput<Proxy>>::Error,
                                >,
                            >,
                        >(
                            ::ink::env::ReturnFlags::new_with_reverted(output_result.is_err()),
                            &::ink::ConstructorResult::Ok(output_result.map(|_| ())),
                        );
                    }
                }
            }
        }
        impl ::ink::reflect::ContractConstructorDecoder for Proxy {
            type Type = __ink_ConstructorDecoder;
        }
    };
    const _: () = {
        #[allow(non_camel_case_types)]
        pub enum __ink_MessageDecoder {
            Message0(<Proxy as ::ink::reflect::DispatchableMessageInfo<0x45753C2B_u32>>::Input),
            Message1(<Proxy as ::ink::reflect::DispatchableMessageInfo<0x9BAE9D5E_u32>>::Input),
        }
        impl ::ink::reflect::DecodeDispatch for __ink_MessageDecoder {
            fn decode_dispatch<I>(
                input: &mut I,
            ) -> ::core::result::Result<Self, ::ink::reflect::DispatchError>
            where
                I: ::scale::Input,
            {
                const MESSAGE_0: [::core::primitive::u8; 4usize] =
                    <Proxy as ::ink::reflect::DispatchableMessageInfo<0x45753C2B_u32>>::SELECTOR;
                const MESSAGE_1: [::core::primitive::u8; 4usize] =
                    <Proxy as ::ink::reflect::DispatchableMessageInfo<0x9BAE9D5E_u32>>::SELECTOR;
                match <[::core::primitive::u8; 4usize] as ::scale::Decode>::decode(input)
                    .map_err(|_| ::ink::reflect::DispatchError::InvalidSelector)?
                {
                    MESSAGE_0 => {
                        ::core::result::Result::Ok(
                            Self::Message0(
                                <<Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x45753C2B_u32,
                                >>::Input as ::scale::Decode>::decode(
                                    input
                                )
                                .map_err(|_| ::ink::reflect::DispatchError::InvalidParameters)?,
                            ),
                        )
                    }
                    MESSAGE_1 => {
                        ::core::result::Result::Ok(
                            Self::Message1(
                                <<Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x9BAE9D5E_u32,
                                >>::Input as ::scale::Decode>::decode(
                                    input
                                )
                                .map_err(|_| ::ink::reflect::DispatchError::InvalidParameters)?,
                            ),
                        )
                    }
                    _invalid => {
                        ::core::result::Result::Ok(
                            Self::Message0(
                                <<Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x45753C2B_u32,
                                >>::Input as ::scale::Decode>::decode(
                                    input
                                )
                                .map_err(|_| ::ink::reflect::DispatchError::InvalidParameters)?,
                            ),
                        )
                    }
                }
            }
        }
        impl ::scale::Decode for __ink_MessageDecoder {
            fn decode<I>(input: &mut I) -> ::core::result::Result<Self, ::scale::Error>
            where
                I: ::scale::Input,
            {
                <Self as ::ink::reflect::DecodeDispatch>::decode_dispatch(input)
                    .map_err(::core::convert::Into::into)
            }
        }
        fn push_contract(contract: ::core::mem::ManuallyDrop<Proxy>, mutates: bool) {
            if mutates {
                ::ink::env::set_contract_storage::<::ink::primitives::Key, Proxy>(
                    &<Proxy as ::ink::storage::traits::StorageKey>::KEY,
                    &contract,
                );
            }
        }
        impl ::ink::reflect::ExecuteDispatchable for __ink_MessageDecoder {
            #[allow(clippy::nonminimal_bool, clippy::let_unit_value)]
            fn execute_dispatchable(
                self,
            ) -> ::core::result::Result<(), ::ink::reflect::DispatchError> {
                let key = <Proxy as ::ink::storage::traits::StorageKey>::KEY;
                let mut contract: ::core::mem::ManuallyDrop<Proxy> =
                    ::core::mem::ManuallyDrop::new(match ::ink::env::get_contract_storage(&key) {
                        ::core::result::Result::Ok(::core::option::Option::Some(value)) => value,
                        ::core::result::Result::Ok(::core::option::Option::None) => {
                            ::core::panicking::panic_fmt(format_args!("storage entry was empty"))
                        }
                        ::core::result::Result::Err(_) => ::core::panicking::panic_fmt(
                            format_args!("could not properly decode storage entry"),
                        ),
                    });
                match self {
                    Self::Message0(input) => {
                        if {
                            false
                                || {
                                    let message_0 = false;
                                    let message_0 =
                                        <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                            0x45753C2B_u32,
                                        >>::PAYABLE;
                                    message_0
                                }
                                || {
                                    let message_1 = false;
                                    let message_1 =
                                        <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                            0x9BAE9D5E_u32,
                                        >>::PAYABLE;
                                    message_1
                                }
                        } && !<Proxy as ::ink::reflect::DispatchableMessageInfo<
                            0x45753C2B_u32,
                        >>::PAYABLE
                        {
                            ::ink::codegen::deny_payment::<<Proxy as ::ink::env::ContractEnv>::Env>(
                            )?;
                        }
                        let result: <Proxy as ::ink::reflect::DispatchableMessageInfo<
                            0x45753C2B_u32,
                        >>::Output = <Proxy as ::ink::reflect::DispatchableMessageInfo<
                            0x45753C2B_u32,
                        >>::CALLABLE(&mut contract, input);
                        let is_reverted = {
                            #[allow(unused_imports)]
                            use ::ink::result_info::IsResultTypeFallback as _;
                            ::ink::result_info::IsResultType::<
                                <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x45753C2B_u32,
                                >>::Output,
                            >::VALUE
                        } && {
                            #[allow(unused_imports)]
                            use ::ink::result_info::IsResultErrFallback as _;
                            ::ink::result_info::IsResultErr(&result).value()
                        };
                        if !is_reverted {
                            push_contract(
                                contract,
                                <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x45753C2B_u32,
                                >>::MUTATES,
                            );
                        }
                        ::ink::env::return_value::<
                            ::ink::MessageResult<
                                <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x45753C2B_u32,
                                >>::Output,
                            >,
                        >(
                            ::ink::env::ReturnFlags::new_with_reverted(is_reverted),
                            &::ink::MessageResult::Ok(result),
                        )
                    }
                    Self::Message1(input) => {
                        if {
                            false
                                || {
                                    let message_0 = false;
                                    let message_0 =
                                        <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                            0x45753C2B_u32,
                                        >>::PAYABLE;
                                    message_0
                                }
                                || {
                                    let message_1 = false;
                                    let message_1 =
                                        <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                            0x9BAE9D5E_u32,
                                        >>::PAYABLE;
                                    message_1
                                }
                        } && !<Proxy as ::ink::reflect::DispatchableMessageInfo<
                            0x9BAE9D5E_u32,
                        >>::PAYABLE
                        {
                            ::ink::codegen::deny_payment::<<Proxy as ::ink::env::ContractEnv>::Env>(
                            )?;
                        }
                        let result: <Proxy as ::ink::reflect::DispatchableMessageInfo<
                            0x9BAE9D5E_u32,
                        >>::Output = <Proxy as ::ink::reflect::DispatchableMessageInfo<
                            0x9BAE9D5E_u32,
                        >>::CALLABLE(&mut contract, input);
                        let is_reverted = {
                            #[allow(unused_imports)]
                            use ::ink::result_info::IsResultTypeFallback as _;
                            ::ink::result_info::IsResultType::<
                                <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x9BAE9D5E_u32,
                                >>::Output,
                            >::VALUE
                        } && {
                            #[allow(unused_imports)]
                            use ::ink::result_info::IsResultErrFallback as _;
                            ::ink::result_info::IsResultErr(&result).value()
                        };
                        if !is_reverted {
                            push_contract(
                                contract,
                                <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x9BAE9D5E_u32,
                                >>::MUTATES,
                            );
                        }
                        ::ink::env::return_value::<
                            ::ink::MessageResult<
                                <Proxy as ::ink::reflect::DispatchableMessageInfo<
                                    0x9BAE9D5E_u32,
                                >>::Output,
                            >,
                        >(
                            ::ink::env::ReturnFlags::new_with_reverted(is_reverted),
                            &::ink::MessageResult::Ok(result),
                        )
                    }
                };
            }
        }
        impl ::ink::reflect::ContractMessageDecoder for Proxy {
            type Type = __ink_MessageDecoder;
        }
    };
    const _: () = {
        use ::ink::codegen::{Env as _, StaticEnv as _};
        const _: ::ink::codegen::utils::IsSameType<Proxy> =
            ::ink::codegen::utils::IsSameType::<Proxy>::new();
        impl Proxy {
            #[cfg(not(feature = "__ink_dylint_Constructor"))]
            pub fn new() -> Result<Self, Error> {
                let result = Self::new_unguarded();
                let author = get_admin();
                let caller = Self::env().caller();
                if caller != author {
                    return Err(Error::NotAuthor);
                }
                Ok(result)
            }
            #[cfg(not(feature = "__ink_dylint_Constructor"))]
            pub fn new_panic() -> Self {
                let result = Self::new();
                if let Err(e) = result {
                    ::core::panicking::panic_fmt(format_args!("{0:?}", e));
                }
                result.unwrap()
            }
            /// Fallback message for a contract call that doesn't match any
            /// of the other message selectors.
            ///
            /// # Note:
            ///
            /// - We allow payable messages here and would forward any optionally supplied
            ///   value as well.
            /// - If the self receiver were `forward(&mut self)` here, this would not
            ///   have any effect whatsoever on the contract we forward to.
            pub fn forward(&self) -> u32 {
                ink::env::call::build_call::<ink::env::DefaultEnvironment>()
                    .call(self.get_destination())
                    .transferred_value(self.env().transferred_value())
                    .gas_limit(0)
                    .call_flags(
                        ink::env::CallFlags::default()
                            .set_forward_input(true)
                            .set_tail_call(true),
                    )
                    .try_invoke()
                    .unwrap_or_else(|env_err| {
                        ::core::panicking::panic_fmt(format_args!(
                            "cross-contract call to {0:?} failed due to {1:?}",
                            self.get_destination(),
                            env_err,
                        ))
                    })
                    .unwrap_or_else(|lang_err| {
                        ::core::panicking::panic_fmt(format_args!(
                            "cross-contract call to {0:?} failed due to {1:?}",
                            self.get_destination(),
                            lang_err,
                        ))
                    });
                ::core::panicking::panic_fmt(format_args!(
                    "internal error: entered unreachable code: {0}",
                    format_args!("the forwarded call will never return since `tail_call` was set",),
                ));
            }
            /// One other message allowed to handle messages.
            /// Fails to compile unless `IIP2_WILDCARD_COMPLEMENT_SELECTOR` is used.
            pub fn handler(&mut self, msg: ProxyMessages) -> Result<ProxyReturnTypes, Error> {
                match msg {
                    ProxyMessages::GetGitCommitId => {
                        Ok(ProxyReturnTypes::U8x20(get_git_commit_id()))
                    }
                    ProxyMessages::GetAdmin => Ok(ProxyReturnTypes::AccountId(get_admin())),
                    ProxyMessages::GetDestination => {
                        Ok(ProxyReturnTypes::AccountId(self.get_destination()))
                    }
                    ProxyMessages::ProxyWithdraw(amount) => {
                        self.withdraw(amount).map(|_| ProxyReturnTypes::Void)
                    }
                    ProxyMessages::ProxyTerminate => {
                        self.terminate().map(|_| ProxyReturnTypes::Void)
                    }
                    ProxyMessages::ProxySetCodeHash(code_hash) => self
                        .set_code_hash(code_hash)
                        .map(|_| ProxyReturnTypes::Void),
                }
            }
            fn new_unguarded() -> Self {
                Self {}
            }
            fn get_destination(&self) -> AccountId {
                AccountId::from([
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0, 0,
                ])
            }
            fn withdraw(&mut self, amount: Balance) -> Result<ProxyReturnTypes, Error> {
                let caller = self.env().caller();
                check_is_admin(caller)?;
                match self.env().transfer(caller, amount) {
                    Ok(()) => Ok(ProxyReturnTypes::Void),
                    Err(_) => Err(Error::TransferFailed),
                }
            }
            fn terminate(&mut self) -> Result<ProxyReturnTypes, Error> {
                let caller = self.env().caller();
                check_is_admin(caller)?;
                self.env().terminate_contract(caller);
            }
            /// Modifies the code which is used to execute calls to this contract address (`AccountId`).
            /// We use this to upgrade the contract logic. The caller must be an operator.
            /// `true` is returned on successful upgrade, `false` otherwise
            /// Errors are returned if the caller is not an admin, if the code hash is the callers
            /// account_id, if the code is not found, and for any other unknown ink errors
            fn set_code_hash(&mut self, code_hash: [u8; 32]) -> Result<(), Error> {
                let caller = self.env().caller();
                check_is_admin(caller)?;
                match ink::env::set_code_hash(&code_hash) {
                    Ok(()) => Ok(()),
                    Err(ink::env::Error::CodeNotFound) => {
                        ::ink_env::debug_message(&{
                            let res = ::alloc::fmt::format(format_args!("{0}\n", {
                                let res = ::alloc::fmt::format(
                                                format_args!(
                                                    "ERROR:\n    type: {0:?}\n    block: {1:?}\n    caller: {2:?}\n",
                                                    Error::CodeNotFound,
                                                    self.env().block_number(),
                                                    self.env().caller(),
                                                ),
                                            );
                                res
                            },));
                            res
                        });
                        Err(Error::CodeNotFound)
                    }
                    Err(_) => {
                        ::ink_env::debug_message(&{
                            let res = ::alloc::fmt::format(format_args!("{0}\n", {
                                let res = ::alloc::fmt::format(
                                                format_args!(
                                                    "ERROR:\n    type: {0:?}\n    block: {1:?}\n    caller: {2:?}\n",
                                                    Error::SetCodeHashFailed,
                                                    self.env().block_number(),
                                                    self.env().caller(),
                                                ),
                                            );
                                res
                            },));
                            res
                        });
                        Err(Error::SetCodeHashFailed)
                    }
                }
            }
        }
        const _: () = {
            ::ink::codegen::utils::consume_type::<::ink::codegen::DispatchOutput<u32>>();
            ::ink::codegen::utils::consume_type::<::ink::codegen::DispatchInput<ProxyMessages>>();
            ::ink::codegen::utils::consume_type::<
                ::ink::codegen::DispatchOutput<Result<ProxyReturnTypes, Error>>,
            >();
        };
    };
    const _: () = {
        /// The ink! smart contract's call builder.
        ///
        /// Implements the underlying on-chain calling of the ink! smart contract
        /// messages and trait implementations in a type safe way.
        #[repr(transparent)]
        pub struct CallBuilder {
            account_id: AccountId,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for CallBuilder {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field1_finish(
                    f,
                    "CallBuilder",
                    "account_id",
                    &&self.account_id,
                )
            }
        }
        #[allow(deprecated)]
        const _: () = {
            #[automatically_derived]
            impl ::scale::Encode for CallBuilder {
                fn encode_to<__CodecOutputEdqy: ::scale::Output + ?::core::marker::Sized>(
                    &self,
                    __codec_dest_edqy: &mut __CodecOutputEdqy,
                ) {
                    ::scale::Encode::encode_to(&&self.account_id, __codec_dest_edqy)
                }
                fn encode(&self) -> ::scale::alloc::vec::Vec<::core::primitive::u8> {
                    ::scale::Encode::encode(&&self.account_id)
                }
                fn using_encoded<R, F: ::core::ops::FnOnce(&[::core::primitive::u8]) -> R>(
                    &self,
                    f: F,
                ) -> R {
                    ::scale::Encode::using_encoded(&&self.account_id, f)
                }
            }
            #[automatically_derived]
            impl ::scale::EncodeLike for CallBuilder {}
        };
        #[allow(deprecated)]
        const _: () = {
            #[automatically_derived]
            impl ::scale::Decode for CallBuilder {
                fn decode<__CodecInputEdqy: ::scale::Input>(
                    __codec_input_edqy: &mut __CodecInputEdqy,
                ) -> ::core::result::Result<Self, ::scale::Error> {
                    ::core::result::Result::Ok(CallBuilder {
                        account_id: {
                            let __codec_res_edqy =
                                <AccountId as ::scale::Decode>::decode(__codec_input_edqy);
                            match __codec_res_edqy {
                                ::core::result::Result::Err(e) => {
                                    return ::core::result::Result::Err(
                                        e.chain("Could not decode `CallBuilder::account_id`"),
                                    );
                                }
                                ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                            }
                        },
                    })
                }
            }
        };
        #[automatically_derived]
        impl ::core::hash::Hash for CallBuilder {
            fn hash<__H: ::core::hash::Hasher>(&self, state: &mut __H) -> () {
                ::core::hash::Hash::hash(&self.account_id, state)
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for CallBuilder {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for CallBuilder {
            #[inline]
            fn eq(&self, other: &CallBuilder) -> bool {
                self.account_id == other.account_id
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralEq for CallBuilder {}
        #[automatically_derived]
        impl ::core::cmp::Eq for CallBuilder {
            #[inline]
            #[doc(hidden)]
            #[no_coverage]
            fn assert_receiver_is_total_eq(&self) -> () {
                let _: ::core::cmp::AssertParamIsEq<AccountId>;
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for CallBuilder {
            #[inline]
            fn clone(&self) -> CallBuilder {
                CallBuilder {
                    account_id: ::core::clone::Clone::clone(&self.account_id),
                }
            }
        }
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            impl ::scale_info::TypeInfo for CallBuilder {
                type Identity = Self;
                fn type_info() -> ::scale_info::Type {
                    ::scale_info::Type::builder()
                        .path(::scale_info::Path::new("CallBuilder", "proxy::proxy"))
                        .type_params(::alloc::vec::Vec::new())
                        .docs(&[
                            "The ink! smart contract's call builder.",
                            "",
                            "Implements the underlying on-chain calling of the ink! smart contract",
                            "messages and trait implementations in a type safe way.",
                        ])
                        .composite(::scale_info::build::Fields::named().field(|f| {
                            f.ty::<AccountId>()
                                .name("account_id")
                                .type_name("AccountId")
                        }))
                }
            }
        };
        const _: () = {
            impl ::ink::storage::traits::StorageLayout for CallBuilder {
                fn layout(__key: &::ink::primitives::Key) -> ::ink::metadata::layout::Layout {
                    ::ink::metadata::layout::Layout::Struct(
                        ::ink::metadata::layout::StructLayout::new(
                            "CallBuilder",
                            [::ink::metadata::layout::FieldLayout::new(
                                "account_id",
                                <AccountId as ::ink::storage::traits::StorageLayout>::layout(__key),
                            )],
                        ),
                    )
                }
            }
        };
        const _: () = {
            impl ::ink::codegen::ContractCallBuilder for Proxy {
                type Type = CallBuilder;
            }
            impl ::ink::env::ContractEnv for CallBuilder {
                type Env = <Proxy as ::ink::env::ContractEnv>::Env;
            }
        };
        impl ::ink::env::call::FromAccountId<Environment> for CallBuilder {
            #[inline]
            fn from_account_id(account_id: AccountId) -> Self {
                Self { account_id }
            }
        }
        impl ::ink::ToAccountId<Environment> for CallBuilder {
            #[inline]
            fn to_account_id(&self) -> AccountId {
                <AccountId as ::core::clone::Clone>::clone(&self.account_id)
            }
        }
        impl ::core::convert::AsRef<AccountId> for CallBuilder {
            fn as_ref(&self) -> &AccountId {
                &self.account_id
            }
        }
        impl ::core::convert::AsMut<AccountId> for CallBuilder {
            fn as_mut(&mut self) -> &mut AccountId {
                &mut self.account_id
            }
        }
        impl CallBuilder {
            /// Fallback message for a contract call that doesn't match any
            /// of the other message selectors.
            ///
            /// # Note:
            ///
            /// - We allow payable messages here and would forward any optionally supplied
            ///   value as well.
            /// - If the self receiver were `forward(&mut self)` here, this would not
            ///   have any effect whatsoever on the contract we forward to.
            #[allow(clippy::type_complexity)]
            #[inline]
            pub fn forward(
                &self,
            ) -> ::ink::env::call::CallBuilder<
                Environment,
                ::ink::env::call::utils::Set<::ink::env::call::Call<Environment>>,
                ::ink::env::call::utils::Set<
                    ::ink::env::call::ExecutionInput<::ink::env::call::utils::EmptyArgumentList>,
                >,
                ::ink::env::call::utils::Set<::ink::env::call::utils::ReturnType<u32>>,
            > {
                ::ink::env::call::build_call::<Environment>()
                    .call(::ink::ToAccountId::to_account_id(self))
                    .exec_input(::ink::env::call::ExecutionInput::new(
                        ::ink::env::call::Selector::new([0x45_u8, 0x75_u8, 0x3C_u8, 0x2B_u8]),
                    ))
                    .returns::<u32>()
            }
            /// One other message allowed to handle messages.
            /// Fails to compile unless `IIP2_WILDCARD_COMPLEMENT_SELECTOR` is used.
            #[allow(clippy::type_complexity)]
            #[inline]
            pub fn handler(
                &mut self,
                __ink_binding_0: ProxyMessages,
            ) -> ::ink::env::call::CallBuilder<
                Environment,
                ::ink::env::call::utils::Set<::ink::env::call::Call<Environment>>,
                ::ink::env::call::utils::Set<
                    ::ink::env::call::ExecutionInput<
                        ::ink::env::call::utils::ArgumentList<
                            ::ink::env::call::utils::Argument<ProxyMessages>,
                            ::ink::env::call::utils::EmptyArgumentList,
                        >,
                    >,
                >,
                ::ink::env::call::utils::Set<
                    ::ink::env::call::utils::ReturnType<Result<ProxyReturnTypes, Error>>,
                >,
            > {
                ::ink::env::call::build_call::<Environment>()
                    .call(::ink::ToAccountId::to_account_id(self))
                    .exec_input(
                        ::ink::env::call::ExecutionInput::new(::ink::env::call::Selector::new([
                            0x9B_u8, 0xAE_u8, 0x9D_u8, 0x5E_u8,
                        ]))
                        .push_arg(__ink_binding_0),
                    )
                    .returns::<Result<ProxyReturnTypes, Error>>()
            }
        }
    };
    pub struct ProxyRef {
        inner: <Proxy as ::ink::codegen::ContractCallBuilder>::Type,
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for ProxyRef {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            ::core::fmt::Formatter::debug_struct_field1_finish(f, "ProxyRef", "inner", &&self.inner)
        }
    }
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl ::scale::Encode for ProxyRef {
            fn encode_to<__CodecOutputEdqy: ::scale::Output + ?::core::marker::Sized>(
                &self,
                __codec_dest_edqy: &mut __CodecOutputEdqy,
            ) {
                ::scale::Encode::encode_to(&&self.inner, __codec_dest_edqy)
            }
            fn encode(&self) -> ::scale::alloc::vec::Vec<::core::primitive::u8> {
                ::scale::Encode::encode(&&self.inner)
            }
            fn using_encoded<R, F: ::core::ops::FnOnce(&[::core::primitive::u8]) -> R>(
                &self,
                f: F,
            ) -> R {
                ::scale::Encode::using_encoded(&&self.inner, f)
            }
        }
        #[automatically_derived]
        impl ::scale::EncodeLike for ProxyRef {}
    };
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl ::scale::Decode for ProxyRef {
            fn decode<__CodecInputEdqy: ::scale::Input>(
                __codec_input_edqy: &mut __CodecInputEdqy,
            ) -> ::core::result::Result<Self, ::scale::Error> {
                ::core::result::Result::Ok(ProxyRef {
                    inner: {
                        let __codec_res_edqy = <<Proxy as ::ink::codegen::ContractCallBuilder>::Type as ::scale::Decode>::decode(
                            __codec_input_edqy,
                        );
                        match __codec_res_edqy {
                            ::core::result::Result::Err(e) => {
                                return ::core::result::Result::Err(
                                    e.chain("Could not decode `ProxyRef::inner`"),
                                );
                            }
                            ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                        }
                    },
                })
            }
        }
    };
    #[automatically_derived]
    impl ::core::hash::Hash for ProxyRef {
        fn hash<__H: ::core::hash::Hasher>(&self, state: &mut __H) -> () {
            ::core::hash::Hash::hash(&self.inner, state)
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralPartialEq for ProxyRef {}
    #[automatically_derived]
    impl ::core::cmp::PartialEq for ProxyRef {
        #[inline]
        fn eq(&self, other: &ProxyRef) -> bool {
            self.inner == other.inner
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralEq for ProxyRef {}
    #[automatically_derived]
    impl ::core::cmp::Eq for ProxyRef {
        #[inline]
        #[doc(hidden)]
        #[no_coverage]
        fn assert_receiver_is_total_eq(&self) -> () {
            let _: ::core::cmp::AssertParamIsEq<
                <Proxy as ::ink::codegen::ContractCallBuilder>::Type,
            >;
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for ProxyRef {
        #[inline]
        fn clone(&self) -> ProxyRef {
            ProxyRef {
                inner: ::core::clone::Clone::clone(&self.inner),
            }
        }
    }
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl ::scale_info::TypeInfo for ProxyRef {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new("ProxyRef", "proxy::proxy"))
                    .type_params(::alloc::vec::Vec::new())
                    .composite(::scale_info::build::Fields::named().field(|f| {
                        f.ty::<<Proxy as ::ink::codegen::ContractCallBuilder>::Type>()
                            .name("inner")
                            .type_name("<Proxy as::ink::codegen::ContractCallBuilder>::Type")
                    }))
            }
        }
    };
    const _: () = {
        impl ::ink::storage::traits::StorageLayout for ProxyRef {
            fn layout(__key: &::ink::primitives::Key) -> ::ink::metadata::layout::Layout {
                ::ink::metadata::layout::Layout::Struct(
                    ::ink::metadata::layout::StructLayout::new(
                        "ProxyRef",
                        [
                            ::ink::metadata::layout::FieldLayout::new(
                                "inner",
                                <<Proxy as ::ink::codegen::ContractCallBuilder>::Type as ::ink::storage::traits::StorageLayout>::layout(
                                    __key,
                                ),
                            ),
                        ],
                    ),
                )
            }
        }
    };
    const _: () = {
        impl ::ink::env::ContractReference for Proxy {
            type Type = ProxyRef;
        }
        impl ::ink::env::call::ConstructorReturnType<ProxyRef> for Proxy {
            type Output = ProxyRef;
            type Error = ();
            fn ok(value: ProxyRef) -> Self::Output {
                value
            }
        }
        impl<E> ::ink::env::call::ConstructorReturnType<ProxyRef> for ::core::result::Result<Proxy, E>
        where
            E: ::scale::Decode,
        {
            const IS_RESULT: bool = true;
            type Output = ::core::result::Result<ProxyRef, E>;
            type Error = E;
            fn ok(value: ProxyRef) -> Self::Output {
                ::core::result::Result::Ok(value)
            }
            fn err(err: Self::Error) -> ::core::option::Option<Self::Output> {
                ::core::option::Option::Some(::core::result::Result::Err(err))
            }
        }
        impl ::ink::env::ContractEnv for ProxyRef {
            type Env = <Proxy as ::ink::env::ContractEnv>::Env;
        }
    };
    impl ProxyRef {
        #[inline]
        #[allow(clippy::type_complexity)]
        pub fn new() -> ::ink::env::call::CreateBuilder<
            Environment,
            Self,
            ::ink::env::call::utils::Unset<Hash>,
            ::ink::env::call::utils::Unset<u64>,
            ::ink::env::call::utils::Unset<Balance>,
            ::ink::env::call::utils::Set<
                ::ink::env::call::ExecutionInput<::ink::env::call::utils::EmptyArgumentList>,
            >,
            ::ink::env::call::utils::Unset<::ink::env::call::state::Salt>,
            ::ink::env::call::utils::Set<::ink::env::call::utils::ReturnType<Result<Self, Error>>>,
        > {
            ::ink::env::call::build_create::<Self>()
                .exec_input(::ink::env::call::ExecutionInput::new(
                    ::ink::env::call::Selector::new([0x9B_u8, 0xAE_u8, 0x9D_u8, 0x5E_u8]),
                ))
                .returns::<Result<Self, Error>>()
        }
        #[inline]
        #[allow(clippy::type_complexity)]
        pub fn new_panic() -> ::ink::env::call::CreateBuilder<
            Environment,
            Self,
            ::ink::env::call::utils::Unset<Hash>,
            ::ink::env::call::utils::Unset<u64>,
            ::ink::env::call::utils::Unset<Balance>,
            ::ink::env::call::utils::Set<
                ::ink::env::call::ExecutionInput<::ink::env::call::utils::EmptyArgumentList>,
            >,
            ::ink::env::call::utils::Unset<::ink::env::call::state::Salt>,
            ::ink::env::call::utils::Set<::ink::env::call::utils::ReturnType<Self>>,
        > {
            ::ink::env::call::build_create::<Self>()
                .exec_input(::ink::env::call::ExecutionInput::new(
                    ::ink::env::call::Selector::new([0x79_u8, 0x45_u8, 0x60_u8, 0xE8_u8]),
                ))
                .returns::<Self>()
        }
        /// Fallback message for a contract call that doesn't match any
        /// of the other message selectors.
        ///
        /// # Note:
        ///
        /// - We allow payable messages here and would forward any optionally supplied
        ///   value as well.
        /// - If the self receiver were `forward(&mut self)` here, this would not
        ///   have any effect whatsoever on the contract we forward to.
        #[inline]
        pub fn forward(&self) -> u32 {
            self.try_forward().unwrap_or_else(|error| {
                ::core::panicking::panic_fmt(format_args!(
                    "encountered error while calling {0}::{1}: {2:?}",
                    "Proxy", "forward", error,
                ))
            })
        }
        /// Fallback message for a contract call that doesn't match any
        /// of the other message selectors.
        ///
        /// # Note:
        ///
        /// - We allow payable messages here and would forward any optionally supplied
        ///   value as well.
        /// - If the self receiver were `forward(&mut self)` here, this would not
        ///   have any effect whatsoever on the contract we forward to.
        #[inline]
        pub fn try_forward(&self) -> ::ink::MessageResult<u32> {
            <Self as ::ink::codegen::TraitCallBuilder>::call(self)
                .forward()
                .try_invoke()
                .unwrap_or_else(|error| {
                    ::core::panicking::panic_fmt(format_args!(
                        "encountered error while calling {0}::{1}: {2:?}",
                        "Proxy", "forward", error,
                    ))
                })
        }
        /// One other message allowed to handle messages.
        /// Fails to compile unless `IIP2_WILDCARD_COMPLEMENT_SELECTOR` is used.
        #[inline]
        pub fn handler(&mut self, msg: ProxyMessages) -> Result<ProxyReturnTypes, Error> {
            self.try_handler(msg).unwrap_or_else(|error| {
                ::core::panicking::panic_fmt(format_args!(
                    "encountered error while calling {0}::{1}: {2:?}",
                    "Proxy", "handler", error,
                ))
            })
        }
        /// One other message allowed to handle messages.
        /// Fails to compile unless `IIP2_WILDCARD_COMPLEMENT_SELECTOR` is used.
        #[inline]
        pub fn try_handler(
            &mut self,
            msg: ProxyMessages,
        ) -> ::ink::MessageResult<Result<ProxyReturnTypes, Error>> {
            <Self as ::ink::codegen::TraitCallBuilder>::call_mut(self)
                .handler(msg)
                .try_invoke()
                .unwrap_or_else(|error| {
                    ::core::panicking::panic_fmt(format_args!(
                        "encountered error while calling {0}::{1}: {2:?}",
                        "Proxy", "handler", error,
                    ))
                })
        }
    }
    const _: () = {
        impl ::ink::codegen::TraitCallBuilder for ProxyRef {
            type Builder = <Proxy as ::ink::codegen::ContractCallBuilder>::Type;
            #[inline]
            fn call(&self) -> &Self::Builder {
                &self.inner
            }
            #[inline]
            fn call_mut(&mut self) -> &mut Self::Builder {
                &mut self.inner
            }
        }
    };
    impl ::ink::env::call::FromAccountId<Environment> for ProxyRef {
        #[inline]
        fn from_account_id(account_id: AccountId) -> Self {
            Self {
                inner: <<Proxy as ::ink::codegen::ContractCallBuilder>::Type as ::ink::env::call::FromAccountId<
                    Environment,
                >>::from_account_id(account_id),
            }
        }
    }
    impl ::ink::ToAccountId<Environment> for ProxyRef {
        #[inline]
        fn to_account_id(&self) -> AccountId {
            <<Proxy as ::ink::codegen::ContractCallBuilder>::Type as ::ink::ToAccountId<
                Environment,
            >>::to_account_id(&self.inner)
        }
    }
    impl ::core::convert::AsRef<AccountId> for ProxyRef {
        fn as_ref(&self) -> &AccountId {
            <_ as ::core::convert::AsRef<AccountId>>::as_ref(&self.inner)
        }
    }
    impl ::core::convert::AsMut<AccountId> for ProxyRef {
        fn as_mut(&mut self) -> &mut AccountId {
            <_ as ::core::convert::AsMut<AccountId>>::as_mut(&mut self.inner)
        }
    }
    #[cfg(feature = "std")]
    #[cfg(not(feature = "ink-as-dependency"))]
    const _: () = {
        #[no_mangle]
        pub fn __ink_generate_metadata() -> ::ink::metadata::InkProject {
            let layout =
                ::ink::metadata::layout::Layout::Root(::ink::metadata::layout::RootLayout::new(
                    <::ink::metadata::layout::LayoutKey as ::core::convert::From<
                        ::ink::primitives::Key,
                    >>::from(<Proxy as ::ink::storage::traits::StorageKey>::KEY),
                    <Proxy as ::ink::storage::traits::StorageLayout>::layout(
                        &<Proxy as ::ink::storage::traits::StorageKey>::KEY,
                    ),
                ));
            ::ink::metadata::layout::ValidateLayout::validate(&layout).unwrap_or_else(|error| {
                ::core::panicking::panic_fmt(format_args!(
                    "metadata ink! generation failed: {0}",
                    error
                ))
            });
            ::ink::metadata::InkProject::new(
                layout,
                ::ink::metadata::ContractSpec::new()
                    .constructors([
                        ::ink::metadata::ConstructorSpec::from_label("new")
                            .selector([0x9B_u8, 0xAE_u8, 0x9D_u8, 0x5E_u8])
                            .args([])
                            .payable(false)
                            .default(false)
                            .returns(
                                ::ink::metadata::ReturnTypeSpec::new(
                                    if <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                        2611912030u32,
                                    >>::IS_RESULT {
                                        ::core::option::Option::Some(
                                            ::ink::metadata::TypeSpec::with_name_str::<
                                                ::ink::ConstructorResult<
                                                    ::core::result::Result<
                                                        (),
                                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                                            2611912030u32,
                                                        >>::Error,
                                                    >,
                                                >,
                                            >("ink_primitives::ConstructorResult"),
                                        )
                                    } else {
                                        ::core::option::Option::Some(
                                            ::ink::metadata::TypeSpec::with_name_str::<
                                                ::ink::ConstructorResult<()>,
                                            >("ink_primitives::ConstructorResult"),
                                        )
                                    },
                                ),
                            )
                            .docs([])
                            .done(),
                        ::ink::metadata::ConstructorSpec::from_label("new_panic")
                            .selector([0x79_u8, 0x45_u8, 0x60_u8, 0xE8_u8])
                            .args([])
                            .payable(false)
                            .default(false)
                            .returns(
                                ::ink::metadata::ReturnTypeSpec::new(
                                    if <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                        2034589928u32,
                                    >>::IS_RESULT {
                                        ::core::option::Option::Some(
                                            ::ink::metadata::TypeSpec::with_name_str::<
                                                ::ink::ConstructorResult<
                                                    ::core::result::Result<
                                                        (),
                                                        <Proxy as ::ink::reflect::DispatchableConstructorInfo<
                                                            2034589928u32,
                                                        >>::Error,
                                                    >,
                                                >,
                                            >("ink_primitives::ConstructorResult"),
                                        )
                                    } else {
                                        ::core::option::Option::Some(
                                            ::ink::metadata::TypeSpec::with_name_str::<
                                                ::ink::ConstructorResult<()>,
                                            >("ink_primitives::ConstructorResult"),
                                        )
                                    },
                                ),
                            )
                            .docs([])
                            .done(),
                    ])
                    .messages([
                        ::ink::metadata::MessageSpec::from_label("forward")
                            .selector([0x45_u8, 0x75_u8, 0x3C_u8, 0x2B_u8])
                            .args([])
                            .returns(
                                ::ink::metadata::ReturnTypeSpec::new(
                                    ::ink::metadata::TypeSpec::with_name_segs::<
                                        ::ink::MessageResult<u32>,
                                        _,
                                    >(
                                        ::core::iter::Iterator::map(
                                            ::core::iter::IntoIterator::into_iter([
                                                "ink",
                                                "MessageResult",
                                            ]),
                                            ::core::convert::AsRef::as_ref,
                                        ),
                                    ),
                                ),
                            )
                            .mutates(false)
                            .payable(true)
                            .default(false)
                            .docs([
                                " Fallback message for a contract call that doesn't match any",
                                " of the other message selectors.",
                                "",
                                " # Note:",
                                "",
                                " - We allow payable messages here and would forward any optionally supplied",
                                "   value as well.",
                                " - If the self receiver were `forward(&mut self)` here, this would not",
                                "   have any effect whatsoever on the contract we forward to.",
                            ])
                            .done(),
                        ::ink::metadata::MessageSpec::from_label("handler")
                            .selector([0x9B_u8, 0xAE_u8, 0x9D_u8, 0x5E_u8])
                            .args([
                                ::ink::metadata::MessageParamSpec::new("msg")
                                    .of_type(
                                        ::ink::metadata::TypeSpec::with_name_segs::<
                                            ProxyMessages,
                                            _,
                                        >(
                                            ::core::iter::Iterator::map(
                                                ::core::iter::IntoIterator::into_iter(["ProxyMessages"]),
                                                ::core::convert::AsRef::as_ref,
                                            ),
                                        ),
                                    )
                                    .done(),
                            ])
                            .returns(
                                ::ink::metadata::ReturnTypeSpec::new(
                                    ::ink::metadata::TypeSpec::with_name_segs::<
                                        ::ink::MessageResult<Result<ProxyReturnTypes, Error>>,
                                        _,
                                    >(
                                        ::core::iter::Iterator::map(
                                            ::core::iter::IntoIterator::into_iter([
                                                "ink",
                                                "MessageResult",
                                            ]),
                                            ::core::convert::AsRef::as_ref,
                                        ),
                                    ),
                                ),
                            )
                            .mutates(true)
                            .payable(false)
                            .default(false)
                            .docs([
                                " One other message allowed to handle messages.",
                                " Fails to compile unless `IIP2_WILDCARD_COMPLEMENT_SELECTOR` is used.",
                            ])
                            .done(),
                    ])
                    .events([])
                    .docs([])
                    .lang_error(
                        ::ink::metadata::TypeSpec::with_name_segs::<
                            ::ink::LangError,
                            _,
                        >(
                            ::core::iter::Iterator::map(
                                ::core::iter::IntoIterator::into_iter(["ink", "LangError"]),
                                ::core::convert::AsRef::as_ref,
                            ),
                        ),
                    )
                    .environment(
                        ::ink::metadata::EnvironmentSpec::new()
                            .account_id(
                                ::ink::metadata::TypeSpec::with_name_segs::<
                                    AccountId,
                                    _,
                                >(
                                    ::core::iter::Iterator::map(
                                        ::core::iter::IntoIterator::into_iter(["AccountId"]),
                                        ::core::convert::AsRef::as_ref,
                                    ),
                                ),
                            )
                            .balance(
                                ::ink::metadata::TypeSpec::with_name_segs::<
                                    Balance,
                                    _,
                                >(
                                    ::core::iter::Iterator::map(
                                        ::core::iter::IntoIterator::into_iter(["Balance"]),
                                        ::core::convert::AsRef::as_ref,
                                    ),
                                ),
                            )
                            .hash(
                                ::ink::metadata::TypeSpec::with_name_segs::<
                                    Hash,
                                    _,
                                >(
                                    ::core::iter::Iterator::map(
                                        ::core::iter::IntoIterator::into_iter(["Hash"]),
                                        ::core::convert::AsRef::as_ref,
                                    ),
                                ),
                            )
                            .timestamp(
                                ::ink::metadata::TypeSpec::with_name_segs::<
                                    Timestamp,
                                    _,
                                >(
                                    ::core::iter::Iterator::map(
                                        ::core::iter::IntoIterator::into_iter(["Timestamp"]),
                                        ::core::convert::AsRef::as_ref,
                                    ),
                                ),
                            )
                            .block_number(
                                ::ink::metadata::TypeSpec::with_name_segs::<
                                    BlockNumber,
                                    _,
                                >(
                                    ::core::iter::Iterator::map(
                                        ::core::iter::IntoIterator::into_iter(["BlockNumber"]),
                                        ::core::convert::AsRef::as_ref,
                                    ),
                                ),
                            )
                            .chain_extension(
                                ::ink::metadata::TypeSpec::with_name_segs::<
                                    ChainExtension,
                                    _,
                                >(
                                    ::core::iter::Iterator::map(
                                        ::core::iter::IntoIterator::into_iter(["ChainExtension"]),
                                        ::core::convert::AsRef::as_ref,
                                    ),
                                ),
                            )
                            .max_event_topics(MAX_EVENT_TOPICS)
                            .done(),
                    )
                    .done(),
            )
        }
    };
    use common::common::check_is_admin;
    use common::common::config::*;
    use common::common::Error;
    use common::err;
    #[allow(unused_imports)]
    use ink::env::debug_println as debug;
    #[allow(unused_imports)]
    use ink::storage::traits::StorageLayout;
    pub enum ProxyMessages {
        GetGitCommitId,
        GetAdmin,
        GetDestination,
        ProxyWithdraw(Amount),
        ProxyTerminate,
        ProxySetCodeHash([u8; 32]),
    }
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl ::scale_info::TypeInfo for ProxyMessages {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new("ProxyMessages", "proxy::proxy"))
                    .type_params(::alloc::vec::Vec::new())
                    .variant(
                        ::scale_info::build::Variants::new()
                            .variant("GetGitCommitId", |v| {
                                v.index(0usize as ::core::primitive::u8)
                            })
                            .variant("GetAdmin", |v| v.index(1usize as ::core::primitive::u8))
                            .variant("GetDestination", |v| {
                                v.index(2usize as ::core::primitive::u8)
                            })
                            .variant("ProxyWithdraw", |v| {
                                v.index(3usize as ::core::primitive::u8).fields(
                                    ::scale_info::build::Fields::unnamed()
                                        .field(|f| f.ty::<Amount>().type_name("Amount")),
                                )
                            })
                            .variant("ProxyTerminate", |v| {
                                v.index(4usize as ::core::primitive::u8)
                            })
                            .variant("ProxySetCodeHash", |v| {
                                v.index(5usize as ::core::primitive::u8).fields(
                                    ::scale_info::build::Fields::unnamed()
                                        .field(|f| f.ty::<[u8; 32]>().type_name("[u8; 32]")),
                                )
                            }),
                    )
            }
        }
    };
    #[automatically_derived]
    impl ::core::marker::StructuralPartialEq for ProxyMessages {}
    #[automatically_derived]
    impl ::core::cmp::PartialEq for ProxyMessages {
        #[inline]
        fn eq(&self, other: &ProxyMessages) -> bool {
            let __self_tag = ::core::intrinsics::discriminant_value(self);
            let __arg1_tag = ::core::intrinsics::discriminant_value(other);
            __self_tag == __arg1_tag
                && match (self, other) {
                    (
                        ProxyMessages::ProxyWithdraw(__self_0),
                        ProxyMessages::ProxyWithdraw(__arg1_0),
                    ) => *__self_0 == *__arg1_0,
                    (
                        ProxyMessages::ProxySetCodeHash(__self_0),
                        ProxyMessages::ProxySetCodeHash(__arg1_0),
                    ) => *__self_0 == *__arg1_0,
                    _ => true,
                }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for ProxyMessages {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ProxyMessages::GetGitCommitId => {
                    ::core::fmt::Formatter::write_str(f, "GetGitCommitId")
                }
                ProxyMessages::GetAdmin => ::core::fmt::Formatter::write_str(f, "GetAdmin"),
                ProxyMessages::GetDestination => {
                    ::core::fmt::Formatter::write_str(f, "GetDestination")
                }
                ProxyMessages::ProxyWithdraw(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(f, "ProxyWithdraw", &__self_0)
                }
                ProxyMessages::ProxyTerminate => {
                    ::core::fmt::Formatter::write_str(f, "ProxyTerminate")
                }
                ProxyMessages::ProxySetCodeHash(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ProxySetCodeHash",
                        &__self_0,
                    )
                }
            }
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralEq for ProxyMessages {}
    #[automatically_derived]
    impl ::core::cmp::Eq for ProxyMessages {
        #[inline]
        #[doc(hidden)]
        #[no_coverage]
        fn assert_receiver_is_total_eq(&self) -> () {
            let _: ::core::cmp::AssertParamIsEq<Amount>;
            let _: ::core::cmp::AssertParamIsEq<[u8; 32]>;
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for ProxyMessages {
        #[inline]
        fn clone(&self) -> ProxyMessages {
            let _: ::core::clone::AssertParamIsClone<Amount>;
            let _: ::core::clone::AssertParamIsClone<[u8; 32]>;
            *self
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for ProxyMessages {}
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl ::scale::Encode for ProxyMessages {
            fn encode_to<__CodecOutputEdqy: ::scale::Output + ?::core::marker::Sized>(
                &self,
                __codec_dest_edqy: &mut __CodecOutputEdqy,
            ) {
                match *self {
                    ProxyMessages::GetGitCommitId => {
                        __codec_dest_edqy.push_byte(0usize as ::core::primitive::u8);
                    }
                    ProxyMessages::GetAdmin => {
                        __codec_dest_edqy.push_byte(1usize as ::core::primitive::u8);
                    }
                    ProxyMessages::GetDestination => {
                        __codec_dest_edqy.push_byte(2usize as ::core::primitive::u8);
                    }
                    ProxyMessages::ProxyWithdraw(ref aa) => {
                        __codec_dest_edqy.push_byte(3usize as ::core::primitive::u8);
                        ::scale::Encode::encode_to(aa, __codec_dest_edqy);
                    }
                    ProxyMessages::ProxyTerminate => {
                        __codec_dest_edqy.push_byte(4usize as ::core::primitive::u8);
                    }
                    ProxyMessages::ProxySetCodeHash(ref aa) => {
                        __codec_dest_edqy.push_byte(5usize as ::core::primitive::u8);
                        ::scale::Encode::encode_to(aa, __codec_dest_edqy);
                    }
                    _ => {}
                }
            }
        }
        #[automatically_derived]
        impl ::scale::EncodeLike for ProxyMessages {}
    };
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl ::scale::Decode for ProxyMessages {
            fn decode<__CodecInputEdqy: ::scale::Input>(
                __codec_input_edqy: &mut __CodecInputEdqy,
            ) -> ::core::result::Result<Self, ::scale::Error> {
                match __codec_input_edqy.read_byte().map_err(|e| {
                    e.chain("Could not decode `ProxyMessages`, failed to read variant byte")
                })? {
                    __codec_x_edqy if __codec_x_edqy == 0usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyMessages::GetGitCommitId)
                    }
                    __codec_x_edqy if __codec_x_edqy == 1usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyMessages::GetAdmin)
                    }
                    __codec_x_edqy if __codec_x_edqy == 2usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyMessages::GetDestination)
                    }
                    __codec_x_edqy if __codec_x_edqy == 3usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyMessages::ProxyWithdraw({
                            let __codec_res_edqy =
                                <Amount as ::scale::Decode>::decode(__codec_input_edqy);
                            match __codec_res_edqy {
                                ::core::result::Result::Err(e) => {
                                    return ::core::result::Result::Err(e.chain(
                                        "Could not decode `ProxyMessages::ProxyWithdraw.0`",
                                    ));
                                }
                                ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                            }
                        }))
                    }
                    __codec_x_edqy if __codec_x_edqy == 4usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyMessages::ProxyTerminate)
                    }
                    __codec_x_edqy if __codec_x_edqy == 5usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyMessages::ProxySetCodeHash({
                            let __codec_res_edqy =
                                <[u8; 32] as ::scale::Decode>::decode(__codec_input_edqy);
                            match __codec_res_edqy {
                                ::core::result::Result::Err(e) => {
                                    return ::core::result::Result::Err(e.chain(
                                        "Could not decode `ProxyMessages::ProxySetCodeHash.0`",
                                    ));
                                }
                                ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                            }
                        }))
                    }
                    _ => ::core::result::Result::Err(<_ as ::core::convert::Into<_>>::into(
                        "Could not decode `ProxyMessages`, variant doesn't exist",
                    )),
                }
            }
        }
    };
    pub enum ProxyReturnTypes {
        U8x32([u8; 32]),
        U8x20([u8; 20]),
        AccountId(AccountId),
        Void,
    }
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl ::scale_info::TypeInfo for ProxyReturnTypes {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new("ProxyReturnTypes", "proxy::proxy"))
                    .type_params(::alloc::vec::Vec::new())
                    .variant(
                        ::scale_info::build::Variants::new()
                            .variant("U8x32", |v| {
                                v.index(0usize as ::core::primitive::u8).fields(
                                    ::scale_info::build::Fields::unnamed()
                                        .field(|f| f.ty::<[u8; 32]>().type_name("[u8; 32]")),
                                )
                            })
                            .variant("U8x20", |v| {
                                v.index(1usize as ::core::primitive::u8).fields(
                                    ::scale_info::build::Fields::unnamed()
                                        .field(|f| f.ty::<[u8; 20]>().type_name("[u8; 20]")),
                                )
                            })
                            .variant("AccountId", |v| {
                                v.index(2usize as ::core::primitive::u8).fields(
                                    ::scale_info::build::Fields::unnamed()
                                        .field(|f| f.ty::<AccountId>().type_name("AccountId")),
                                )
                            })
                            .variant("Void", |v| v.index(3usize as ::core::primitive::u8)),
                    )
            }
        }
    };
    #[automatically_derived]
    impl ::core::marker::StructuralPartialEq for ProxyReturnTypes {}
    #[automatically_derived]
    impl ::core::cmp::PartialEq for ProxyReturnTypes {
        #[inline]
        fn eq(&self, other: &ProxyReturnTypes) -> bool {
            let __self_tag = ::core::intrinsics::discriminant_value(self);
            let __arg1_tag = ::core::intrinsics::discriminant_value(other);
            __self_tag == __arg1_tag
                && match (self, other) {
                    (ProxyReturnTypes::U8x32(__self_0), ProxyReturnTypes::U8x32(__arg1_0)) => {
                        *__self_0 == *__arg1_0
                    }
                    (ProxyReturnTypes::U8x20(__self_0), ProxyReturnTypes::U8x20(__arg1_0)) => {
                        *__self_0 == *__arg1_0
                    }
                    (
                        ProxyReturnTypes::AccountId(__self_0),
                        ProxyReturnTypes::AccountId(__arg1_0),
                    ) => *__self_0 == *__arg1_0,
                    _ => true,
                }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for ProxyReturnTypes {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ProxyReturnTypes::U8x32(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(f, "U8x32", &__self_0)
                }
                ProxyReturnTypes::U8x20(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(f, "U8x20", &__self_0)
                }
                ProxyReturnTypes::AccountId(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(f, "AccountId", &__self_0)
                }
                ProxyReturnTypes::Void => ::core::fmt::Formatter::write_str(f, "Void"),
            }
        }
    }
    #[automatically_derived]
    impl ::core::marker::StructuralEq for ProxyReturnTypes {}
    #[automatically_derived]
    impl ::core::cmp::Eq for ProxyReturnTypes {
        #[inline]
        #[doc(hidden)]
        #[no_coverage]
        fn assert_receiver_is_total_eq(&self) -> () {
            let _: ::core::cmp::AssertParamIsEq<[u8; 32]>;
            let _: ::core::cmp::AssertParamIsEq<[u8; 20]>;
            let _: ::core::cmp::AssertParamIsEq<AccountId>;
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for ProxyReturnTypes {
        #[inline]
        fn clone(&self) -> ProxyReturnTypes {
            let _: ::core::clone::AssertParamIsClone<[u8; 32]>;
            let _: ::core::clone::AssertParamIsClone<[u8; 20]>;
            let _: ::core::clone::AssertParamIsClone<AccountId>;
            *self
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for ProxyReturnTypes {}
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl ::scale::Encode for ProxyReturnTypes {
            fn encode_to<__CodecOutputEdqy: ::scale::Output + ?::core::marker::Sized>(
                &self,
                __codec_dest_edqy: &mut __CodecOutputEdqy,
            ) {
                match *self {
                    ProxyReturnTypes::U8x32(ref aa) => {
                        __codec_dest_edqy.push_byte(0usize as ::core::primitive::u8);
                        ::scale::Encode::encode_to(aa, __codec_dest_edqy);
                    }
                    ProxyReturnTypes::U8x20(ref aa) => {
                        __codec_dest_edqy.push_byte(1usize as ::core::primitive::u8);
                        ::scale::Encode::encode_to(aa, __codec_dest_edqy);
                    }
                    ProxyReturnTypes::AccountId(ref aa) => {
                        __codec_dest_edqy.push_byte(2usize as ::core::primitive::u8);
                        ::scale::Encode::encode_to(aa, __codec_dest_edqy);
                    }
                    ProxyReturnTypes::Void => {
                        __codec_dest_edqy.push_byte(3usize as ::core::primitive::u8);
                    }
                    _ => {}
                }
            }
        }
        #[automatically_derived]
        impl ::scale::EncodeLike for ProxyReturnTypes {}
    };
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl ::scale::Decode for ProxyReturnTypes {
            fn decode<__CodecInputEdqy: ::scale::Input>(
                __codec_input_edqy: &mut __CodecInputEdqy,
            ) -> ::core::result::Result<Self, ::scale::Error> {
                match __codec_input_edqy.read_byte().map_err(|e| {
                    e.chain("Could not decode `ProxyReturnTypes`, failed to read variant byte")
                })? {
                    __codec_x_edqy if __codec_x_edqy == 0usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyReturnTypes::U8x32({
                            let __codec_res_edqy =
                                <[u8; 32] as ::scale::Decode>::decode(__codec_input_edqy);
                            match __codec_res_edqy {
                                ::core::result::Result::Err(e) => {
                                    return ::core::result::Result::Err(
                                        e.chain("Could not decode `ProxyReturnTypes::U8x32.0`"),
                                    );
                                }
                                ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                            }
                        }))
                    }
                    __codec_x_edqy if __codec_x_edqy == 1usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyReturnTypes::U8x20({
                            let __codec_res_edqy =
                                <[u8; 20] as ::scale::Decode>::decode(__codec_input_edqy);
                            match __codec_res_edqy {
                                ::core::result::Result::Err(e) => {
                                    return ::core::result::Result::Err(
                                        e.chain("Could not decode `ProxyReturnTypes::U8x20.0`"),
                                    );
                                }
                                ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                            }
                        }))
                    }
                    __codec_x_edqy if __codec_x_edqy == 2usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyReturnTypes::AccountId({
                            let __codec_res_edqy =
                                <AccountId as ::scale::Decode>::decode(__codec_input_edqy);
                            match __codec_res_edqy {
                                ::core::result::Result::Err(e) => {
                                    return ::core::result::Result::Err(e.chain(
                                        "Could not decode `ProxyReturnTypes::AccountId.0`",
                                    ));
                                }
                                ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                            }
                        }))
                    }
                    __codec_x_edqy if __codec_x_edqy == 3usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(ProxyReturnTypes::Void)
                    }
                    _ => ::core::result::Result::Err(<_ as ::core::convert::Into<_>>::into(
                        "Could not decode `ProxyReturnTypes`, variant doesn't exist",
                    )),
                }
            }
        }
    };
    pub type Amount = Balance;
}
