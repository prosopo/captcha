// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/errors';

import type { ApiTypes, AugmentedError } from '@polkadot/api-base/types';

export type __AugmentedError<ApiType extends ApiTypes> = AugmentedError<ApiType>;

declare module '@polkadot/api-base/types/errors' {
  interface AugmentedErrors<ApiType extends ApiTypes> {
    authorship: {
      /**
       * The uncle is genesis.
       **/
      GenesisUncle: AugmentedError<ApiType>;
      /**
       * The uncle parent not in the chain.
       **/
      InvalidUncleParent: AugmentedError<ApiType>;
      /**
       * The uncle isn't recent enough to be included.
       **/
      OldUncle: AugmentedError<ApiType>;
      /**
       * The uncle is too high in chain.
       **/
      TooHighUncle: AugmentedError<ApiType>;
      /**
       * Too many uncles.
       **/
      TooManyUncles: AugmentedError<ApiType>;
      /**
       * The uncle is already included.
       **/
      UncleAlreadyIncluded: AugmentedError<ApiType>;
      /**
       * Uncles already set in the block.
       **/
      UnclesAlreadySet: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    balances: {
      /**
       * Beneficiary account must pre-exist
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * A vesting schedule already exists for this account
       **/
      ExistingVestingSchedule: AugmentedError<ApiType>;
      /**
       * Balance too low to send value
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account
       **/
      KeepAlive: AugmentedError<ApiType>;
      /**
       * Account liquidity restrictions prevent withdrawal
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Number of named reserves exceed MaxReserves
       **/
      TooManyReserves: AugmentedError<ApiType>;
      /**
       * Vesting balance too high to send value
       **/
      VestingBalance: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    contracts: {
      /**
       * Code removal was denied because the code is still in use by at least one contract.
       **/
      CodeInUse: AugmentedError<ApiType>;
      /**
       * No code could be found at the supplied code hash.
       **/
      CodeNotFound: AugmentedError<ApiType>;
      /**
       * The contract's code was found to be invalid during validation or instrumentation.
       * A more detailed error can be found on the node console if debug messages are enabled
       * or in the debug buffer which is returned to RPC clients.
       **/
      CodeRejected: AugmentedError<ApiType>;
      /**
       * The code supplied to `instantiate_with_code` exceeds the limit specified in the
       * current schedule.
       **/
      CodeTooLarge: AugmentedError<ApiType>;
      /**
       * No contract was found at the specified address.
       **/
      ContractNotFound: AugmentedError<ApiType>;
      /**
       * The contract ran to completion but decided to revert its storage changes.
       * Please note that this error is only returned from extrinsics. When called directly
       * or via RPC an `Ok` will be returned. In this case the caller needs to inspect the flags
       * to determine whether a reversion has taken place.
       **/
      ContractReverted: AugmentedError<ApiType>;
      /**
       * Contract trapped during execution.
       **/
      ContractTrapped: AugmentedError<ApiType>;
      /**
       * The debug message specified to `seal_debug_message` does contain invalid UTF-8.
       **/
      DebugMessageInvalidUTF8: AugmentedError<ApiType>;
      /**
       * Input passed to a contract API function failed to decode as expected type.
       **/
      DecodingFailed: AugmentedError<ApiType>;
      /**
       * Removal of a contract failed because the deletion queue is full.
       * 
       * This can happen when calling `seal_terminate`.
       * The queue is filled by deleting contracts and emptied by a fixed amount each block.
       * Trying again during another block is the only way to resolve this issue.
       **/
      DeletionQueueFull: AugmentedError<ApiType>;
      /**
       * A contract with the same AccountId already exists.
       **/
      DuplicateContract: AugmentedError<ApiType>;
      /**
       * The topics passed to `seal_deposit_events` contains at least one duplicate.
       **/
      DuplicateTopics: AugmentedError<ApiType>;
      /**
       * `seal_call` forwarded this contracts input. It therefore is no longer available.
       **/
      InputForwarded: AugmentedError<ApiType>;
      /**
       * Invalid combination of flags supplied to `seal_call` or `seal_delegate_call`.
       **/
      InvalidCallFlags: AugmentedError<ApiType>;
      /**
       * A new schedule must have a greater version than the current one.
       **/
      InvalidScheduleVersion: AugmentedError<ApiType>;
      /**
       * Performing a call was denied because the calling depth reached the limit
       * of what is specified in the schedule.
       **/
      MaxCallDepthReached: AugmentedError<ApiType>;
      /**
       * The chain does not provide a chain extension. Calling the chain extension results
       * in this error. Note that this usually  shouldn't happen as deploying such contracts
       * is rejected.
       **/
      NoChainExtension: AugmentedError<ApiType>;
      /**
       * A buffer outside of sandbox memory was passed to a contract API function.
       **/
      OutOfBounds: AugmentedError<ApiType>;
      /**
       * The executed contract exhausted its gas limit.
       **/
      OutOfGas: AugmentedError<ApiType>;
      /**
       * The output buffer supplied to a contract API call was too small.
       **/
      OutputBufferTooSmall: AugmentedError<ApiType>;
      /**
       * The subject passed to `seal_random` exceeds the limit.
       **/
      RandomSubjectTooLong: AugmentedError<ApiType>;
      /**
       * A call tried to invoke a contract that is flagged as non-reentrant.
       **/
      ReentranceDenied: AugmentedError<ApiType>;
      /**
       * More storage was created than allowed by the storage deposit limit.
       **/
      StorageDepositLimitExhausted: AugmentedError<ApiType>;
      /**
       * Origin doesn't have enough balance to pay the required storage deposits.
       **/
      StorageDepositNotEnoughFunds: AugmentedError<ApiType>;
      /**
       * A contract self destructed in its constructor.
       * 
       * This can be triggered by a call to `seal_terminate`.
       **/
      TerminatedInConstructor: AugmentedError<ApiType>;
      /**
       * Termination of a contract is not allowed while the contract is already
       * on the call stack. Can be triggered by `seal_terminate`.
       **/
      TerminatedWhileReentrant: AugmentedError<ApiType>;
      /**
       * The amount of topics passed to `seal_deposit_events` exceeds the limit.
       **/
      TooManyTopics: AugmentedError<ApiType>;
      /**
       * Performing the requested transfer failed. Probably because there isn't enough
       * free balance in the sender's account.
       **/
      TransferFailed: AugmentedError<ApiType>;
      /**
       * The size defined in `T::MaxValueSize` was exceeded.
       **/
      ValueTooLarge: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    sudo: {
      /**
       * Sender must be the Sudo account
       **/
      RequireSudo: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
    system: {
      /**
       * The origin filter prevent the call to be dispatched.
       **/
      CallFiltered: AugmentedError<ApiType>;
      /**
       * Failed to extract the runtime version from the new runtime.
       * 
       * Either calling `Core_version` or decoding `RuntimeVersion` failed.
       **/
      FailedToExtractRuntimeVersion: AugmentedError<ApiType>;
      /**
       * The name of specification does not match between the current runtime
       * and the new runtime.
       **/
      InvalidSpecName: AugmentedError<ApiType>;
      /**
       * Suicide called when the account has non-default composite data.
       **/
      NonDefaultComposite: AugmentedError<ApiType>;
      /**
       * There is a non-zero reference count preventing the account from being purged.
       **/
      NonZeroRefCount: AugmentedError<ApiType>;
      /**
       * The specification version is not allowed to decrease between the current runtime
       * and the new runtime.
       **/
      SpecVersionNeedsToIncrease: AugmentedError<ApiType>;
      /**
       * Generic error
       **/
      [key: string]: AugmentedError<ApiType>;
    };
  } // AugmentedErrors
} // declare module
