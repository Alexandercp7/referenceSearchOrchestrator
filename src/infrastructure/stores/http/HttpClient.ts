import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class HttpClient {
  private readonly http: AxiosInstance;

  constructor(config: AxiosRequestConfig = {}) {
    this.http = axios.create(config);
  }

  async getText(url: string, config?: AxiosRequestConfig): Promise<string> {
    const { data } = await this.http.get<string>(url, {
      responseType: 'text',
      ...config,
    });
    return data;
  }
}
