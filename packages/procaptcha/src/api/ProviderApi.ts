import HttpClientBase from "./HttpClientBase";
import Storage from "../modules/storage";
import { ProsopoCaptchaConfig, ProsopoRandomProviderResponse, GetCaptchaResponse, CaptchaSolution, CaptchaSolutionResponse } from '../types';

export class ProviderApi extends HttpClientBase {

  protected config: ProsopoCaptchaConfig;

  constructor(config: ProsopoCaptchaConfig) {
    super(config['providerApi.baseURL'], config['providerApi.prefix']);
    this.config = config;
  }

  public getProviders(): Promise<{accounts: string[]}> {
    return this.axios.get(`/providers`);
  }

  public getContractAddress(): Promise<{contractAddress: string}> {
    return this.axios.get(`/contract_address`);
  }

  public getCaptchaChallenge(randomProvider: ProsopoRandomProviderResponse) : Promise<GetCaptchaResponse> {
    let { provider, blockNumber } = randomProvider;
    blockNumber = blockNumber.replace(/,/g, ''); // TODO: middleware schema parser/validator.
    return this.axios.get(`/provider/captcha/${provider.captchaDatasetId}/${provider.serviceOrigin}/${this.config['dappAccount']}/${blockNumber}`);
  }

  public submitCaptchaSolution(blockHash: string, captchas: CaptchaSolution[], requestHash: string, txHash: string, userAccount: string) : Promise<CaptchaSolutionResponse> {
    return this.axios.post(`/provider/solution`, {blockHash, captchas, requestHash, txHash, userAccount, dappAccount: this.config['dappAccount']});
  }

}

export default ProviderApi;
