import HttpClientBase from "./HttpClientBase";
import Storage from "../modules/storage";

export class ProviderApi extends HttpClientBase {

  protected config: ProsopoConfig;

  constructor(config: ProsopoConfig) {
    super(config['providerApi.baseURL'], config['providerApi.prefix']);
    this.config = config;
  }

  /**
   * 
   * @deprecated use ProsopoContract$getRandomProvider instead.
   */
  public getRandomProvider() {
    const userAccount = Storage.getAccount();
    return this.axios.get(`/random_provider/${userAccount}`);
  }

  public getProviders(): Promise<{accounts: string[]}> {
    return this.axios.get(`/providers`);
  }

  public getContractAddress(): Promise<{contractAddress: string}> {
    return this.axios.get(`/contract_address`);
  }

  public getCaptchaChallenge(randomProvider: ProsopoRandomProviderResponse) : Promise<ProsopoCaptchaResponse> {
    let { provider, blockNumber } = randomProvider;
    blockNumber = blockNumber.replace(/,/g, ''); // TODO: middleware schema parser/validator.
    return this.axios.get(`/provider/captcha/${provider.captchaDatasetId}/${provider.serviceOrigin}/${this.config['dappAccount']}/${blockNumber}`);
  }

  public submitCaptchaSolution(blockHash: string, captchas: CaptchaSolution[], requestHash: string, txHash: string, userAccount: string) : Promise<CaptchaSolutionResponse> {
    return this.axios.post(`/provider/solution`, {blockHash, captchas, requestHash, txHash, userAccount, dappAccount: this.config['dappAccount']});
  }

}

export default ProviderApi;
