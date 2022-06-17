import {AxiosResponse} from "axios";

export class ProsopoApiError extends Error {
  constructor(error: AxiosResponse, context?: string, ...params: any[]) {

    super(`${error.data.message ? error.data.message : error.statusText}`)

    this.name = context && `${ProsopoApiError.name}@${context}` || ProsopoApiError.name;

    // TODO: if env.debug
    console.error('\n********************* ERROR *********************\n');
    console.error(this.cause, this.stack, ...params);
  }
}
