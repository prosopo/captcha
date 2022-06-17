import {DispatchError} from "@polkadot/types/interfaces";

export class ProsopoEnvError extends Error {
  constructor(error: Error | string, context?: string, ...params: any[]) {
    const isError = error instanceof Error;
    super(isError ? error.message : error);
    this.name = context && `${ProsopoEnvError.name}@${context}` || ProsopoEnvError.name;
    if (isError) {
      this.cause = error;
    }
    // TODO: if env.debug
    console.error('\n********************* ERROR *********************\n');
    console.error(this.cause, this.stack, ...params);
  }
}

export class ProsopoContractError extends Error {
  constructor(error: DispatchError | string, context?: string, ...params: any[]) {
    if (typeof error === "string") {
      super(error)
    } else {
      const mod = error.asModule;
      const dispatchError = error.registry.findMetaError(mod);
      super(`${dispatchError.section}.${dispatchError.name}`)
    }

    this.name = context && `${ProsopoContractError.name}@${context}` || ProsopoContractError.name;
    console.error('\n********************* ERROR *********************\n');
    console.error(error, this.stack, ...params);
  }
}


