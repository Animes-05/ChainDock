const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthHeader(): Record<string, string> {
    const token = sessionStorage.getItem('chaindock_token') || localStorage.getItem('chaindock_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T; status: number }> {
    const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string>),
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.data && !(options.data instanceof FormData)) {
      config.body = JSON.stringify(options.data);
    } else if (options.data instanceof FormData) {
      delete headers['Content-Type'];
      config.body = options.data;
    }

    try {
      const response = await fetch(url, config);
      if (response.status === 401) {
        // Optional session expiration handling
        console.warn('Unauthorized request - session may have expired.');
      }
      
      const contentType = response.headers.get('content-type');
      let data: T;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      return { data, status: response.status };
    } catch (error) {
      // Network or offline error: let caller handle or fallback
      throw error;
    }
  }

  get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  post<T>(endpoint: string, data?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'POST', data, headers });
  }

  patch<T>(endpoint: string, data?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'PATCH', data, headers });
  }

  delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const api = new ApiClient();
