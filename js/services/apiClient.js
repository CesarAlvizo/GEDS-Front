import { CONFIG } from '../config.js';

class ApiClient {
  constructor() {
    this.baseUrl = CONFIG.API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers)
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      if (response.status === 401) {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        window.location.assign('/login.html');
        throw new Error('Sesión expirada o no autorizada');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor (${response.status})`);
      }
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[API ERROR] ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();


