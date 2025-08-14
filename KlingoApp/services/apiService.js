import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const API_BASE_URL = 'http://localhost:5000'; // Change this to your server URL
// For physical device testing, use your computer's IP: http://192.168.1.100:5000
// For production, use your deployed server URL

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  async getAuthHeaders() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  // Generic request method
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getAuthHeaders();
      
      const config = {
        headers,
        ...options,
      };

      console.log('Making request to:', url);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Auth methods
  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // User methods
  async getUsers() {
    return this.request('/api/users');
  }

  async getUser(userId) {
    return this.request(`/api/users/${userId}`);
  }

  async updateUser(userId, userData) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserStatus(userId, status) {
    return this.request(`/api/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteUser(userId) {
    return this.request(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  async getUserStats() {
    return this.request('/api/stats/users');
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

export default new ApiService();