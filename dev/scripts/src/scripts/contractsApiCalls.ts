import * as $ from '@talismn/subshape-fork'
import { AbiMessageType, AbiMetaDataSpec, AbiType, AbiTypesSpec } from './artifacts.js'
import { at } from '@prosopo/util'
import { hexToU8a } from '@polkadot/util'
import metadata from '@polkadot/types-support/metadata/v15/substrate-types.json'
//        let call_request = CallRequest {
//             origin: account_id(&self.signer),
//             dest: self.contract.clone(),
//             value: self.value.denominate_balance(&self.token_metadata)?,
//             gas_limit: None,
//             storage_deposit_limit,
//             input_data: self.call_data.clone(),
//         };
//         state_call(&self.rpc, "ContractsApi_call", call_request).await

//origin//destination//value//storageDepositLimit//weight//inputData
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000002000000000000000000b0000f2052a010bff4f39278c0410c9834fee
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000380b0000f2052a010bff4f39278c04  10c9834fee
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000380b0000f2052a010bff4f39278c041410c9834fee
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b000000000000000000000000000000000  b0000f2052a010bff4f39278c04  10c9834fee
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000010b0000f2052a010bff4f39278c040010c9834fee
const calls = [
    {
        id: 9,
        jsonrpc: '2.0',
        method: 'state_call',
        params: [
            'ContractsApi_call',
            '0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000010b0000f2052a010bff4f39278c040010c9834fee',
        ],
    },
    {
        id: 10,
        jsonrpc: '2.0',
        method: 'state_call',
        params: [
            'ContractsApi_call',
            '0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000010b0000f2052a010bff4f39278c040090457c744476058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487e',
        ],
    },
    {
        id: 13,
        jsonrpc: '2.0',
        method: 'state_call',
        params: [
            'ContractsApi_call',
            '0xe659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000010b0000f2052a010bff4f39278c040090f96477c0e659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4e',
        ],
    },
]
const results = [
    {
        jsonrpc: '2.0',
        result: '0x0300ba5eb3de9a04000300ba5eb3129a05000100000000000000000000000000000000000000000000440000ca9a3b000000000000000000000000011c000000000000004248ed43551702000000010000000408e659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4ef0686a070000000000000000000000000000010000000402e659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00943577000000000000000000000000000001000000080601e659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b084ea8115d43a9007f2caa72147de923117e173c572b0ab941e9f725e9cd68dd55ede410c6ab96e50c86682c5ba94c6933ace0806eef419b0f45b02ab1eb62f83a00010000000600e659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4ef0686a07000000000000000000000000000000000000000000000000000000000000010000000000073a299a1101f21305000000000208060176058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b0865215d7655d086c272f7c16120928f1a38ba40a9ca6b00629a0eb43c788b1685ede410c6ab96e50c86682c5ba94c6933ace0806eef419b0f45b02ab1eb62f83a',
        id: 9,
    },
]
const contractAddress = 'c652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b'
const caller = '76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487e' // caller
export const $tyId = $.compact($.u32)
export const ContractAbi = `{"source":{"hash":"0xc3e9367adefe6f9a6eade416c5cdf92aec41e19b7f0a0e341a8a07a1ae51e2af","language":"ink! 4.3.0","compiler":"rustc 1.69.0","build_info":{"build_mode":"Debug","cargo_contract_version":"3.0.1","rust_toolchain":"stable-x86_64-unknown-linux-gnu","wasm_opt_settings":{"keep_debug_symbols":false,"optimization_passes":"Z"}}},"contract":{"name":"captcha","version":"0.2.17","authors":["Chris Taylor <chris@prosopo.io>","George Oastler <george@prosopo.io>","Vincenzo Ferrara","Siniša Čanak"]},"spec":{"constructors":[{"args":[],"default":false,"docs":["Constructor"],"label":"new","payable":true,"returnType":{"displayName":["ink_primitives","ConstructorResult"],"type":10},"selector":"0x9bae9d5e"},{"args":[],"default":false,"docs":[],"label":"new_panic","payable":false,"returnType":{"displayName":["ink_primitives","ConstructorResult"],"type":15},"selector":"0x794560e8"}],"docs":[],"environment":{"accountId":{"displayName":["AccountId"],"type":7},"balance":{"displayName":["Balance"],"type":0},"blockNumber":{"displayName":["BlockNumber"],"type":1},"chainExtension":{"displayName":["ChainExtension"],"type":65},"hash":{"displayName":["Hash"],"type":4},"maxEventTopics":4,"timestamp":{"displayName":["Timestamp"],"type":64}},"events":[],"lang_error":{"displayName":["ink","LangError"],"type":14},"messages":[{"args":[],"default":false,"docs":[" Get the git commit id from when this contract was built"],"label":"get_git_commit_id","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":16},"selector":"0x3685e994"},{"args":[],"default":false,"docs":[" the admin which can control this contract. set to author/instantiator by default"],"label":"get_admin","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":18},"selector":"0x57b8a8a7"},{"args":[],"default":false,"docs":[" Get all payee options"],"label":"get_payees","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":19},"selector":"0xf334a6d7"},{"args":[],"default":false,"docs":[" Get all dapp payee options"],"label":"get_dapp_payees","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":22},"selector":"0xcce851af"},{"args":[],"default":false,"docs":[" Get all status options"],"label":"get_statuses","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":25},"selector":"0xd39608f0"},{"args":[],"default":false,"docs":[" Get contract provider minimum stake default."],"label":"get_provider_stake_threshold","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":28},"selector":"0x3e7e8941"},{"args":[],"default":false,"docs":[" Get contract dapp minimum stake default."],"label":"get_dapp_stake_threshold","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":28},"selector":"0xc9834fee"},{"args":[],"default":false,"docs":[" the maximum fee a provider can charge for a commit"],"label":"get_max_provider_fee","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":29},"selector":"0xd799cf93"},{"args":[],"default":false,"docs":[" the minimum number of providers needed for the contract to function"],"label":"get_min_num_active_providers","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":30},"selector":"0xa200bea1"},{"args":[],"default":false,"docs":[" the time to complete a block, 6 seconds by default"],"label":"get_block_time","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":30},"selector":"0x8d3f151d"},{"args":[],"default":false,"docs":[" the max age of a commit for a user before it is removed from the history, in seconds"],"label":"get_max_user_history_age_seconds","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":29},"selector":"0xcab4fa0a"},{"args":[],"default":false,"docs":[" the max number of commits stored for a single user"],"label":"get_max_user_history_len","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":30},"selector":"0xfb715e71"},{"args":[],"default":false,"docs":[" the max age of a commit for a user before it is removed from the history, in blocks"],"label":"get_max_user_history_age_blocks","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":29},"selector":"0x6f3337c3"},{"args":[{"label":"url","type":{"displayName":["Vec"],"type":2}},{"label":"fee","type":{"displayName":["u32"],"type":1}},{"label":"payee","type":{"displayName":["Payee"],"type":21}}],"default":false,"docs":[" Register a provider, their url and fee"],"label":"provider_register","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0xc66f9a2a"},{"args":[{"label":"url","type":{"displayName":["Vec"],"type":2}},{"label":"fee","type":{"displayName":["u32"],"type":1}},{"label":"payee","type":{"displayName":["Payee"],"type":21}}],"default":false,"docs":[" Update an existing provider, their url, fee and deposit funds"],"label":"provider_update","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0xd2f70de8"},{"args":[],"default":false,"docs":[" De-activate a provider by setting their status to Deactivated"],"label":"provider_deactivate","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0xa65232da"},{"args":[],"default":false,"docs":[" Unstake and deactivate the provider's service, returning stake"],"label":"provider_deregister","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x5eff53cf"},{"args":[{"label":"account","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Get an existing provider"],"label":"get_provider","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":32},"selector":"0x457c7444"},{"args":[],"default":false,"docs":[" Fund a provider"],"label":"provider_fund","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x54ee83bb"},{"args":[{"label":"dataset_id","type":{"displayName":["Hash"],"type":4}},{"label":"dataset_id_content","type":{"displayName":["Hash"],"type":4}}],"default":false,"docs":[" Add a new data set"],"label":"provider_set_dataset","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0xb0e7ab99"},{"args":[{"label":"contract","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Get an existing dapp"],"label":"get_dapp","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":35},"selector":"0xf96477c0"},{"args":[{"label":"contract","type":{"displayName":["AccountId"],"type":7}},{"label":"payee","type":{"displayName":["DappPayee"],"type":24}}],"default":false,"docs":[" Register a dapp"],"label":"dapp_register","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x42b45efa"},{"args":[{"label":"contract","type":{"displayName":["AccountId"],"type":7}},{"label":"payee","type":{"displayName":["DappPayee"],"type":24}},{"label":"owner","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Update a dapp with new funds, setting status as appropriate"],"label":"dapp_update","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x5dbfa904"},{"args":[{"label":"contract","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Fund dapp account to pay for services, if the Dapp caller is registered in self.dapps"],"label":"dapp_fund","mutates":true,"payable":true,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x55da62a9"},{"args":[{"label":"contract","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Cancel services as a dapp, returning remaining tokens"],"label":"dapp_deregister","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0xdc7da4d5"},{"args":[{"label":"contract","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Deactivate a dapp, leaving stake intact"],"label":"dapp_deactivate","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x94718d6f"},{"args":[{"label":"user_account","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[],"label":"get_user_history_summary","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":38},"selector":"0x3be12ad6"},{"args":[{"label":"commit","type":{"displayName":["Commit"],"type":41}}],"default":false,"docs":[" Provider submits a captcha solution commitment"],"label":"provider_commit","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x57876316"},{"args":[{"label":"commits","type":{"displayName":["Vec"],"type":44}}],"default":false,"docs":[" Provider submits 0-many captcha solution commitments"],"label":"provider_commit_many","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0xc8d4b3b2"},{"args":[{"label":"user_account","type":{"displayName":["AccountId"],"type":7}},{"label":"threshold","type":{"displayName":["u8"],"type":3}}],"default":false,"docs":[" Checks if the user is a human (true) as they have a solution rate higher than a % threshold or a bot (false)"," Threshold is decided by the calling user"," Threshold is between 0-200, i.e. 0-100% in 0.5% increments. E.g. 100 = 50%, 200 = 100%, 0 = 0%, 50 = 25%, etc."],"label":"dapp_operator_is_human_user","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":45},"selector":"0xbe7b6ef9"},{"args":[{"label":"user_account","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Get the last correct captcha for a user"],"label":"dapp_operator_last_correct_captcha","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":48},"selector":"0xbe930f18"},{"args":[{"label":"user_account","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Get a dapp user",""," Returns an error if the user does not exist"],"label":"get_user","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":51},"selector":"0xa4ca534e"},{"args":[{"label":"commit_id","type":{"displayName":["Hash"],"type":4}}],"default":false,"docs":[" Get a solution commitment",""," Returns an error if the commitment does not exist"],"label":"get_commit","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":54},"selector":"0x5329f551"},{"args":[{"label":"provider_accounts","type":{"displayName":["Vec"],"type":8}}],"default":false,"docs":[" List providers given an array of account id",""," Returns empty if none were matched"],"label":"list_providers_by_accounts","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":56},"selector":"0x52f0d2cb"},{"args":[{"label":"statuses","type":{"displayName":["Vec"],"type":26}}],"default":false,"docs":[" List providers given an array of status",""," Returns empty if none were matched"],"label":"list_providers_by_status","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":56},"selector":"0x54b28ab4"},{"args":[{"label":"user_account","type":{"displayName":["AccountId"],"type":7}},{"label":"dapp_contract","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Get a random active provider",""," Returns error if no active provider is found"],"label":"get_random_active_provider","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":59},"selector":"0x4aee5bad"},{"args":[],"default":false,"docs":[" Get the AccountIds of all Providers ever registered",""," Returns {Vec<AccountId>}"],"label":"get_all_provider_accounts","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":62},"selector":"0x5052021f"},{"args":[{"label":"len","type":{"displayName":["u128"],"type":0}},{"label":"user_account","type":{"displayName":["AccountId"],"type":7}},{"label":"dapp_contract","type":{"displayName":["AccountId"],"type":7}}],"default":false,"docs":[" Get a random number from 0 to \`len\` - 1 inclusive. The user account is added to the seed for additional random entropy."],"label":"get_random_number","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":28},"selector":"0x2306aecd"},{"args":[],"default":false,"docs":[" Terminate this contract and return any/all funds in this contract to the destination"],"label":"terminate","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x476d839f"},{"args":[{"label":"amount","type":{"displayName":["Balance"],"type":0}}],"default":false,"docs":[" Withdraw some funds from the contract to the specified destination"],"label":"withdraw","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x410fcc9d"},{"args":[{"label":"code_hash","type":{"displayName":[],"type":5}}],"default":false,"docs":[" Set the code hash for this contract"],"label":"set_code_hash","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":10},"selector":"0x9e5c5758"}]},"storage":{"root":{"layout":{"struct":{"fields":[{"layout":{"root":{"layout":{"struct":{"fields":[{"layout":{"enum":{"dispatchKey":"0x31f906a7","name":"GovernanceStatus","variants":{"0":{"fields":[],"name":"Active"},"1":{"fields":[],"name":"Inactive"}}}},"name":"status"},{"layout":{"leaf":{"key":"0x31f906a7","ty":0}},"name":"balance"},{"layout":{"leaf":{"key":"0x31f906a7","ty":1}},"name":"fee"},{"layout":{"enum":{"dispatchKey":"0x31f906a7","name":"Payee","variants":{"0":{"fields":[],"name":"Provider"},"1":{"fields":[],"name":"Dapp"}}}},"name":"payee"},{"layout":{"leaf":{"key":"0x31f906a7","ty":2}},"name":"url"},{"layout":{"leaf":{"key":"0x31f906a7","ty":4}},"name":"dataset_id"},{"layout":{"leaf":{"key":"0x31f906a7","ty":4}},"name":"dataset_id_content"}],"name":"Provider"}},"root_key":"0x31f906a7"}},"name":"providers"},{"layout":{"root":{"layout":{"leaf":{"key":"0x25c2603c","ty":6}},"root_key":"0x25c2603c"}},"name":"provider_accounts"},{"layout":{"root":{"layout":{"leaf":{"key":"0xd1b08cc7","ty":7}},"root_key":"0xd1b08cc7"}},"name":"urls"},{"layout":{"root":{"layout":{"struct":{"fields":[{"layout":{"enum":{"dispatchKey":"0x14493d1d","name":"GovernanceStatus","variants":{"0":{"fields":[],"name":"Active"},"1":{"fields":[],"name":"Inactive"}}}},"name":"status"},{"layout":{"leaf":{"key":"0x14493d1d","ty":0}},"name":"balance"},{"layout":{"leaf":{"key":"0x14493d1d","ty":7}},"name":"owner"},{"layout":{"enum":{"dispatchKey":"0x14493d1d","name":"DappPayee","variants":{"0":{"fields":[],"name":"Provider"},"1":{"fields":[],"name":"Dapp"},"2":{"fields":[],"name":"Any"}}}},"name":"payee"}],"name":"Dapp"}},"root_key":"0x14493d1d"}},"name":"dapps"},{"layout":{"root":{"layout":{"leaf":{"key":"0x455ca62f","ty":6}},"root_key":"0x455ca62f"}},"name":"dapp_contracts"},{"layout":{"root":{"layout":{"struct":{"fields":[{"layout":{"leaf":{"key":"0x81a766df","ty":4}},"name":"id"},{"layout":{"leaf":{"key":"0x81a766df","ty":7}},"name":"user_account"},{"layout":{"leaf":{"key":"0x81a766df","ty":4}},"name":"dataset_id"},{"layout":{"enum":{"dispatchKey":"0x81a766df","name":"CaptchaStatus","variants":{"0":{"fields":[],"name":"Pending"},"1":{"fields":[],"name":"Approved"},"2":{"fields":[],"name":"Disapproved"}}}},"name":"status"},{"layout":{"leaf":{"key":"0x81a766df","ty":7}},"name":"dapp_contract"},{"layout":{"leaf":{"key":"0x81a766df","ty":7}},"name":"provider_account"},{"layout":{"leaf":{"key":"0x81a766df","ty":1}},"name":"requested_at"},{"layout":{"leaf":{"key":"0x81a766df","ty":1}},"name":"completed_at"},{"layout":{"array":{"layout":{"leaf":{"key":"0x81a766df","ty":3}},"len":64,"offset":"0x81a766df"}},"name":"user_signature"}],"name":"Commit"}},"root_key":"0x81a766df"}},"name":"commits"},{"layout":{"root":{"layout":{"struct":{"fields":[{"layout":{"leaf":{"key":"0x5a3119c3","ty":9}},"name":"history"}],"name":"User"}},"root_key":"0x5a3119c3"}},"name":"users"},{"layout":{"root":{"layout":{"leaf":{"key":"0x43f9649b","ty":6}},"root_key":"0x43f9649b"}},"name":"user_accounts"}],"name":"Captcha"}},"root_key":"0xabcdef01"}},"types":[{"id":0,"type":{"def":{"primitive":"u128"}}},{"id":1,"type":{"def":{"primitive":"u32"}}},{"id":2,"type":{"def":{"sequence":{"type":3}}}},{"id":3,"type":{"def":{"primitive":"u8"}}},{"id":4,"type":{"def":{"composite":{"fields":[{"type":5,"typeName":"[u8; 32]"}]}},"path":["ink_primitives","types","Hash"]}},{"id":5,"type":{"def":{"array":{"len":32,"type":3}}}},{"id":6,"type":{"def":{"composite":{"fields":[{"type":8}]}},"params":[{"name":"T","type":7}],"path":["BTreeSet"]}},{"id":7,"type":{"def":{"composite":{"fields":[{"type":5,"typeName":"[u8; 32]"}]}},"path":["ink_primitives","types","AccountId"]}},{"id":8,"type":{"def":{"sequence":{"type":7}}}},{"id":9,"type":{"def":{"sequence":{"type":4}}}},{"id":10,"type":{"def":{"variant":{"variants":[{"fields":[{"type":11}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":11},{"name":"E","type":14}],"path":["Result"]}},{"id":11,"type":{"def":{"variant":{"variants":[{"fields":[{"type":12}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":12},{"name":"E","type":13}],"path":["Result"]}},{"id":12,"type":{"def":{"tuple":[]}}},{"id":13,"type":{"def":{"variant":{"variants":[{"index":0,"name":"NotAuthorised"},{"index":1,"name":"TransferFailed"},{"index":2,"name":"SetCodeHashFailed"},{"index":3,"name":"InvalidDestination"},{"index":4,"name":"UnknownMessage"},{"index":5,"name":"ProviderAccountExists"},{"index":6,"name":"ProviderExists"},{"index":7,"name":"ProviderAccountDoesNotExist"},{"index":8,"name":"ProviderDoesNotExist"},{"index":9,"name":"ProviderInsufficientFunds"},{"index":10,"name":"ProviderInactive"},{"index":11,"name":"ProviderUrlUsed"},{"index":12,"name":"DappExists"},{"index":13,"name":"DappDoesNotExist"},{"index":14,"name":"DappInactive"},{"index":15,"name":"DappInsufficientFunds"},{"index":16,"name":"CaptchaDataDoesNotExist"},{"index":17,"name":"CommitDoesNotExist"},{"index":18,"name":"DappUserDoesNotExist"},{"index":19,"name":"NoActiveProviders"},{"index":20,"name":"DatasetIdSolutionsSame"},{"index":21,"name":"CodeNotFound"},{"index":22,"name":"Unknown"},{"index":23,"name":"InvalidContract"},{"index":24,"name":"InvalidPayee"},{"index":25,"name":"InvalidCaptchaStatus"},{"index":26,"name":"NoCorrectCaptcha"},{"index":27,"name":"NotEnoughActiveProviders"},{"index":28,"name":"ProviderFeeTooHigh"},{"index":29,"name":"CommitAlreadyExists"},{"index":30,"name":"NotAuthor"}]}},"path":["common","common","Error"]}},{"id":14,"type":{"def":{"variant":{"variants":[{"index":1,"name":"CouldNotReadInput"}]}},"path":["ink_primitives","LangError"]}},{"id":15,"type":{"def":{"variant":{"variants":[{"fields":[{"type":12}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":12},{"name":"E","type":14}],"path":["Result"]}},{"id":16,"type":{"def":{"variant":{"variants":[{"fields":[{"type":17}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":17},{"name":"E","type":14}],"path":["Result"]}},{"id":17,"type":{"def":{"array":{"len":20,"type":3}}}},{"id":18,"type":{"def":{"variant":{"variants":[{"fields":[{"type":7}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":7},{"name":"E","type":14}],"path":["Result"]}},{"id":19,"type":{"def":{"variant":{"variants":[{"fields":[{"type":20}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":20},{"name":"E","type":14}],"path":["Result"]}},{"id":20,"type":{"def":{"sequence":{"type":21}}}},{"id":21,"type":{"def":{"variant":{"variants":[{"index":0,"name":"Provider"},{"index":1,"name":"Dapp"}]}},"path":["captcha","captcha","Payee"]}},{"id":22,"type":{"def":{"variant":{"variants":[{"fields":[{"type":23}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":23},{"name":"E","type":14}],"path":["Result"]}},{"id":23,"type":{"def":{"sequence":{"type":24}}}},{"id":24,"type":{"def":{"variant":{"variants":[{"index":0,"name":"Provider"},{"index":1,"name":"Dapp"},{"index":2,"name":"Any"}]}},"path":["captcha","captcha","DappPayee"]}},{"id":25,"type":{"def":{"variant":{"variants":[{"fields":[{"type":26}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":26},{"name":"E","type":14}],"path":["Result"]}},{"id":26,"type":{"def":{"sequence":{"type":27}}}},{"id":27,"type":{"def":{"variant":{"variants":[{"index":0,"name":"Active"},{"index":1,"name":"Inactive"}]}},"path":["captcha","captcha","GovernanceStatus"]}},{"id":28,"type":{"def":{"variant":{"variants":[{"fields":[{"type":0}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":0},{"name":"E","type":14}],"path":["Result"]}},{"id":29,"type":{"def":{"variant":{"variants":[{"fields":[{"type":1}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":1},{"name":"E","type":14}],"path":["Result"]}},{"id":30,"type":{"def":{"variant":{"variants":[{"fields":[{"type":31}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":31},{"name":"E","type":14}],"path":["Result"]}},{"id":31,"type":{"def":{"primitive":"u16"}}},{"id":32,"type":{"def":{"variant":{"variants":[{"fields":[{"type":33}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":33},{"name":"E","type":14}],"path":["Result"]}},{"id":33,"type":{"def":{"variant":{"variants":[{"fields":[{"type":34}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":34},{"name":"E","type":13}],"path":["Result"]}},{"id":34,"type":{"def":{"composite":{"fields":[{"name":"status","type":27,"typeName":"GovernanceStatus"},{"name":"balance","type":0,"typeName":"Balance"},{"name":"fee","type":1,"typeName":"u32"},{"name":"payee","type":21,"typeName":"Payee"},{"name":"url","type":2,"typeName":"Vec<u8>"},{"name":"dataset_id","type":4,"typeName":"Hash"},{"name":"dataset_id_content","type":4,"typeName":"Hash"}]}},"path":["captcha","captcha","Provider"]}},{"id":35,"type":{"def":{"variant":{"variants":[{"fields":[{"type":36}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":36},{"name":"E","type":14}],"path":["Result"]}},{"id":36,"type":{"def":{"variant":{"variants":[{"fields":[{"type":37}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":37},{"name":"E","type":13}],"path":["Result"]}},{"id":37,"type":{"def":{"composite":{"fields":[{"name":"status","type":27,"typeName":"GovernanceStatus"},{"name":"balance","type":0,"typeName":"Balance"},{"name":"owner","type":7,"typeName":"AccountId"},{"name":"payee","type":24,"typeName":"DappPayee"}]}},"path":["captcha","captcha","Dapp"]}},{"id":38,"type":{"def":{"variant":{"variants":[{"fields":[{"type":39}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":39},{"name":"E","type":14}],"path":["Result"]}},{"id":39,"type":{"def":{"variant":{"variants":[{"fields":[{"type":40}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":40},{"name":"E","type":13}],"path":["Result"]}},{"id":40,"type":{"def":{"composite":{"fields":[{"name":"correct","type":31,"typeName":"u16"},{"name":"incorrect","type":31,"typeName":"u16"},{"name":"score","type":3,"typeName":"u8"}]}},"path":["captcha","captcha","UserHistorySummary"]}},{"id":41,"type":{"def":{"composite":{"fields":[{"name":"id","type":4,"typeName":"Hash"},{"name":"user_account","type":7,"typeName":"AccountId"},{"name":"dataset_id","type":4,"typeName":"Hash"},{"name":"status","type":42,"typeName":"CaptchaStatus"},{"name":"dapp_contract","type":7,"typeName":"AccountId"},{"name":"provider_account","type":7,"typeName":"AccountId"},{"name":"requested_at","type":1,"typeName":"BlockNumber"},{"name":"completed_at","type":1,"typeName":"BlockNumber"},{"name":"user_signature","type":43,"typeName":"[u8; 64]"}]}},"path":["captcha","captcha","Commit"]}},{"id":42,"type":{"def":{"variant":{"variants":[{"index":0,"name":"Pending"},{"index":1,"name":"Approved"},{"index":2,"name":"Disapproved"}]}},"path":["captcha","captcha","CaptchaStatus"]}},{"id":43,"type":{"def":{"array":{"len":64,"type":3}}}},{"id":44,"type":{"def":{"sequence":{"type":41}}}},{"id":45,"type":{"def":{"variant":{"variants":[{"fields":[{"type":46}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":46},{"name":"E","type":14}],"path":["Result"]}},{"id":46,"type":{"def":{"variant":{"variants":[{"fields":[{"type":47}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":47},{"name":"E","type":13}],"path":["Result"]}},{"id":47,"type":{"def":{"primitive":"bool"}}},{"id":48,"type":{"def":{"variant":{"variants":[{"fields":[{"type":49}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":49},{"name":"E","type":14}],"path":["Result"]}},{"id":49,"type":{"def":{"variant":{"variants":[{"fields":[{"type":50}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":50},{"name":"E","type":13}],"path":["Result"]}},{"id":50,"type":{"def":{"composite":{"fields":[{"name":"before","type":1,"typeName":"BlockNumber"},{"name":"dapp_contract","type":7,"typeName":"AccountId"}]}},"path":["captcha","captcha","LastCorrectCaptcha"]}},{"id":51,"type":{"def":{"variant":{"variants":[{"fields":[{"type":52}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":52},{"name":"E","type":14}],"path":["Result"]}},{"id":52,"type":{"def":{"variant":{"variants":[{"fields":[{"type":53}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":53},{"name":"E","type":13}],"path":["Result"]}},{"id":53,"type":{"def":{"composite":{"fields":[{"name":"history","type":9,"typeName":"Vec<Hash>"}]}},"path":["captcha","captcha","User"]}},{"id":54,"type":{"def":{"variant":{"variants":[{"fields":[{"type":55}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":55},{"name":"E","type":14}],"path":["Result"]}},{"id":55,"type":{"def":{"variant":{"variants":[{"fields":[{"type":41}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":41},{"name":"E","type":13}],"path":["Result"]}},{"id":56,"type":{"def":{"variant":{"variants":[{"fields":[{"type":57}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":57},{"name":"E","type":14}],"path":["Result"]}},{"id":57,"type":{"def":{"variant":{"variants":[{"fields":[{"type":58}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":58},{"name":"E","type":13}],"path":["Result"]}},{"id":58,"type":{"def":{"sequence":{"type":34}}}},{"id":59,"type":{"def":{"variant":{"variants":[{"fields":[{"type":60}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":60},{"name":"E","type":14}],"path":["Result"]}},{"id":60,"type":{"def":{"variant":{"variants":[{"fields":[{"type":61}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":61},{"name":"E","type":13}],"path":["Result"]}},{"id":61,"type":{"def":{"composite":{"fields":[{"name":"provider_account","type":7,"typeName":"AccountId"},{"name":"provider","type":34,"typeName":"Provider"},{"name":"block_number","type":1,"typeName":"BlockNumber"}]}},"path":["captcha","captcha","RandomProvider"]}},{"id":62,"type":{"def":{"variant":{"variants":[{"fields":[{"type":63}],"index":0,"name":"Ok"},{"fields":[{"type":14}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":63},{"name":"E","type":14}],"path":["Result"]}},{"id":63,"type":{"def":{"variant":{"variants":[{"fields":[{"type":8}],"index":0,"name":"Ok"},{"fields":[{"type":13}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":8},{"name":"E","type":13}],"path":["Result"]}},{"id":64,"type":{"def":{"primitive":"u64"}}},{"id":65,"type":{"def":{"variant":{}},"path":["ink_env","types","NoChainExtension"]}}],"version":"4"}`
const contractAbiParsed = AbiMetaDataSpec.parse(JSON.parse(ContractAbi))
export const $primitiveKind = $.literalUnion([
    'bool',
    'char',
    'str',
    'u8',
    'u16',
    'u32',
    'u64',
    'u128',
    'u256',
    'i8',
    'i16',
    'i32',
    'i64',
    'i128',
    'i256',
])
export const $sequence = $.variant('Sequence', $.field('typeParam', $tyId))
export const $sizedArray = $.variant('SizedArray', $.field('len', $.u32), $.field('typeParam', $tyId))
export const $tuple = $.variant('Tuple', $.field('fields', $.array($tyId)))
export const $primitive = $.variant('Primitive', $.field('kind', $primitiveKind))
export const $compact = $.variant('Compact', $.field('typeParam', $tyId))
export const $bitSequence = $.variant('BitSequence', $.field('bitOrderType', $tyId), $.field('bitStoreType', $tyId))

const typeNamesToEncoders: { [key: string]: $.AnyShape } = {
    bool: $.bool,
    str: $.str,
    u8: $.u8,
    u16: $.u16,
    u32: $.u32,
    u64: $.u64,
    u128: $.u128,
    u256: $.u256,
    i8: $.i8,
    i16: $.i16,
    i32: $.i32,
    i64: $.i64,
    i128: $.i128,
    i256: $.i256,
    //result: $.result,
}

const getDappStakeThresholdABI: AbiMessageType = {
    args: [],
    default: false,
    docs: [' Get contract dapp minimum stake default.'],
    label: 'get_dapp_stake_threshold',
    mutates: false,
    payable: false,
    returnType: {
        displayName: ['ink', 'MessageResult'],
        type: 28,
    },
    selector: '0xc9834fee',
}

class StrErr extends Error {
    constructor(readonly str: string) {
        super()
        this.stack = this.message = 'StrErr: ' + this.str
    }
}

const $strError = $.instance(StrErr, $.tuple($.str), (err: StrErr) => [err.str])

//  Type 28
//        {
//             "id": 28,
//             "type": {
//                 "def": {
//                     "variant": {
//                         "variants": [
//                             {
//                                 "fields": [
//                                     {
//                                         "type": 0
//                                     }
//                                 ],
//                                 "index": 0,
//                                 "name": "Ok"
//                             },
//                             {
//                                 "fields": [
//                                     {
//                                         "type": 14
//                                     }
//                                 ],
//                                 "index": 1,
//                                 "name": "Err"
//                             }
//                         ]
//                     }
//                 },
//                 "params": [
//                     {
//                         "name": "T",
//                         "type": 0
//                     },
//                     {
//                         "name": "E",
//                         "type": 14
//                     }
//                 ],
//                 "path": [
//                     "Result"
//                 ]
//             }
//         },

const ContractResult = {
    id: 892,
    type: {
        path: ['pallet_contracts_primitives', 'ContractResult'],
        params: [
            {
                name: 'R',
                type: 893,
            },
            {
                name: 'Balance',
                type: 6,
            },
            {
                name: 'EventRecord',
                type: 19,
            },
        ],
        def: {
            composite: {
                fields: [
                    {
                        name: 'gas_consumed',
                        type: 9,
                        typeName: 'Weight',
                        docs: [],
                    },
                    {
                        name: 'gas_required',
                        type: 9,
                        typeName: 'Weight',
                        docs: [],
                    },
                    {
                        name: 'storage_deposit',
                        type: 896,
                        typeName: 'StorageDeposit<Balance>',
                        docs: [],
                    },
                    {
                        name: 'debug_message',
                        type: 13,
                        typeName: 'Vec<u8>',
                        docs: [],
                    },
                    {
                        name: 'result',
                        type: 893,
                        typeName: 'R',
                        docs: [],
                    },
                    {
                        name: 'events',
                        type: 897,
                        typeName: 'Option<Vec<EventRecord>>',
                        docs: [],
                    },
                ],
            },
        },
        docs: [],
    },
}
const substrateMetadata = AbiTypesSpec.parse(metadata)
const contractResultType = substrateMetadata.find((record) => record.type.path?.includes('ContractResult'))

// Take an ABI type definition, like above, and generate a subshape for it
const getShapeFromType = (typeId: number, types: AbiType[]): $.AnyShape => {
    const abiType: AbiType | undefined = types.find((type) => type.id === typeId)
    console.log('looking for type', typeId, 'type of', typeof typeId, 'found', abiType)
    //console.log(contractAbiParsed.types)
    if (abiType === undefined) {
        throw new StrErr(`typeId ${typeId} not found`)
    }
    const inner = abiType.type
    if (inner.def.primitive && inner.def.primitive.toLowerCase() === 'u8') {
        return $.u8
    }
    if (inner.def.primitive && inner.def.primitive.toLowerCase() === 'u16') {
        return $.u16
    }
    if (inner.def.primitive && inner.def.primitive.toLowerCase() === 'u32') {
        return $.u32
    }
    if (inner.def.primitive && inner.def.primitive.toLowerCase() === 'u64') {
        return $.u64
    }
    if (inner.def.primitive && inner.def.primitive.toLowerCase() === 'u128') {
        return $.u128
    }
    if (inner.def.primitive && inner.def.primitive.toLowerCase() === 'bool') {
        return $.bool
    }
    if (inner.def.composite) {
        if (inner.def.composite.fields) {
            const fields: $.AnyShape[] = inner.def.composite.fields.map((field, index) => {
                const fieldShape = getShapeFromType(Number(field.type), types)
                if (field.name) {
                    return $.field(field.name ? field.name : `Field${index}`, fieldShape)
                } else {
                    return fieldShape
                }
            })
            return $.object(...fields)
        }
    }
    if (inner.def.variant) {
        if (inner.def.variant.variants && inner.def.variant.variants.length) {
            const variants = inner.def.variant.variants?.map((variant, index) => {
                if (variant.fields && variant.fields?.length) {
                    const variantShape = getShapeFromType(Number(at(variant.fields, 0).type), types)
                    if (variant.name) {
                        return $.field<string, $.AnyShape, $.AnyShape>(variant.name, variantShape as unknown as never)
                    } else {
                        return variantShape
                    }
                } else {
                    // This is like a value in an enum
                    //{
                    //     "index": 0,
                    //     "name": "Other",
                    //     "fields": []
                    // }
                    return $.u8
                }
            })
            return $.variant('Variant', ...variants).shape
        }
    }
    if (inner.def.sequence) {
        return $.array(getShapeFromType(Number(inner.def.sequence.type), types))
    }
    if (inner.def.array) return $sizedArray.shape
    if (inner.def.tuple) return $tuple.shape
    if (inner.def.compact) {
        return $.variant('Compact', getShapeFromType(inner.def.compact.type, types)).shape
    }
    if (inner.def.compact) return $compact.shape
    //if (inner.def.bitSequence) return $bitSequence.shape
    // Result<T,E>
    if (abiType.type.path && abiType.type.path.indexOf('Result') > -1) {
        if (abiType.type.params && abiType.type.params.length > 1 && abiType.type.params[0]) {
            return $.result(getShapeFromType(Number(abiType.type.params[0].type), types), $strError)
        }
    }

    throw new StrErr(`typeId ${typeId} not constructed: ${JSON.stringify(abiType, null, 4)}`)
}

if (contractResultType) {
    //console.log(substrateMetadata)
    const contractResultShape = getShapeFromType(contractResultType.id, substrateMetadata)
    console.log(contractResultShape)
    if (results && results[0] && results[0].result) {
        console.log(contractResultShape.decode(hexToU8a(results[0].result)))
    }
}
process.exit()
// const dappStakeThresholdReturnType = getShapeFromType(getDappStakeThresholdABI.returnType.type, contractAbiParsed.types)
//
// const encodedResult = $.result($.u128, $strError).encode(1000000000n)
// console.log('encodedResult', encodedResult)
// const api = new ApiPromise()
//
// console.log('dappStakeThresholdReturnType', dappStakeThresholdReturnType)
// if (results && results[0] && results[0].result) {
//     const pjsResult = api.registry.createType('Result<u128, Err>', encodedResult)
//     console.log(pjsResult.inspect())
//     console.log(dappStakeThresholdReturnType.decode(hexToU8a(results[0].result)))
// }
//
// type ContractCallResult = {
//     jsonrpc: '2.0'
//     result: string
//     id: number
// }
//
// const gasLimit = { refTime: 1280000000000n, proofSize: 4999999999999n }
// type WeightV2 = {
//     refTime: bigint
//     proofSize: bigint
// }
// type ContractArg = {
//     value: never
//     encoder: $.AnyVariant
// }
// const $weightV2 = $.variant(
//     'Struct',
//     $.object($.field('refTime', $.compact($.u64)), $.field('proofSize', $.compact($.u64)))
// )
//
// // Contract funcitons
//
// console.log(u8aToHex(compactAddLength(u8aConcat(getDappStakeThresholdABI.selector, ...[]))))
// function getCallRequest(
//     selector: Uint8Array,
//     origin: Uint8Array,
//     dest: Uint8Array,
//     value: number,
//     gasLimit: WeightV2,
//     args: ContractArg[]
// ) {
//     // construct the message for the contract call
//     // origin//destination//value//storageDepositLimit//weight//inputData
//     // inputData = compactAddLength(u8aConcat(fnSelector, ...args.toU8a))
//     const valueU8a = $.u64.encode(BigInt(value)) // 0 as 32 bytes hex string "0x
//     const storageDepositLimit = compactAddLength($.u64.encode(0n))
//     const inputData = compactAddLength(
//         u8aConcat(selector, ...args.map(({ value, encoder }) => encoder.shape.encode(value)))
//     )
//     const callRequest = u8aConcat(
//         origin,
//         dest,
//         valueU8a,
//         storageDepositLimit,
//         compactAddLength($weightV2.shape.encode(gasLimit)),
//         inputData
//     )
//     console.log(u8aToHex(callRequest))
//     return callRequest
// }
//
// const callRequest = getCallRequest(
//     hexToU8a(getDappStakeThresholdABI.selector),
//     hexToU8a(caller),
//     hexToU8a(contractAddress),
//     0,
//     gasLimit,
//     []
// )
//
// console.log('callRequest', callRequest)
