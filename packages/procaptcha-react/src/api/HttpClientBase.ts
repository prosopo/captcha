import axios, { AxiosInstance, AxiosResponse } from "axios";

class HttpClientBase {

  protected readonly axios: AxiosInstance;

  constructor(baseURL: string, prefix = "") {
    baseURL = baseURL + prefix;
    this.axios = axios.create({ baseURL });
    this.axios.interceptors.response.use(this.responseHandler, this.errorHandler);
  }

  protected responseHandler = (response: AxiosResponse) => {
    console.log("API REQUEST", response.request);
    return response.data;
  }

  protected errorHandler = (error: any) => Promise.reject(error.response);

}

export default HttpClientBase;
