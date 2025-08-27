import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000';
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:5000';
    } else {
      return 'http://localhost:5000';
    }
  }
  return 'https://your-production-api.com';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.requestQueue = new Map();
    this.retryQueue = new Map();
    console.log(`API Base URL initialized: ${this.baseURL}`);
    console.log(`Platform: ${Platform.OS}`);
    console.log(`Development mode: ${__DEV__}`);
  }

  async getAuthHeaders() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `KlingoApp/${Platform.OS}`,
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      return headers;
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
    }
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before trying again.');
        } else if (response.status === 401) {
          // Clear stored tokens on authentication error
          await this.clearStorage();
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to perform this action.');
        } else if (response.status === 404) {
          throw new Error('Resource not found. Please check your request.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } else {
      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return { message: text };
    }
  }

  async request(endpoint, options = {}) {
    const requestId = `${options.method || 'GET'}_${endpoint}_${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Request deduplication for GET requests
    if (!options.method || options.method === 'GET') {
      const existingRequest = this.requestQueue.get(endpoint);
      if (existingRequest) {
        console.log('Using existing request for:', endpoint);
        return existingRequest;
      }
    }

    const requestPromise = this._makeRequest(endpoint, options, controller);
    
    if (!options.method || options.method === 'GET') {
      this.requestQueue.set(endpoint, requestPromise);
      
      requestPromise.finally(() => {
        this.requestQueue.delete(endpoint);
        clearTimeout(timeoutId);
      });
    }

    return requestPromise;
  }

  async _makeRequest(endpoint, options, controller, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getAuthHeaders();
      
      const config = {
        headers,
        signal: controller.signal,
        ...options,
      };

      console.log(`Making ${config.method || 'GET'} request to:`, url);
      
      if (config.body) {
        console.log('Request body:', typeof config.body === 'string' ? 'JSON String' : config.body);
      }
      
      const response = await fetch(url, config);
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      return await this.handleResponse(response);
      
    } catch (error) {
      console.error(`API Request Error (attempt ${retryCount + 1}):`, error);
      
      // Retry logic for network errors
      if (retryCount < maxRetries && this._shouldRetry(error)) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        console.log(`Retrying request in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this._makeRequest(endpoint, options, controller, retryCount + 1);
      }
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  _shouldRetry(error) {
    return error.name === 'AbortError' || 
           error.message.includes('Network request failed') ||
           error.message.includes('fetch') ||
           error.message.includes('timeout') ||
           (error.message.includes('Server error') && !error.message.includes('500'));
  }

  async testConnection() {
    try {
      console.log('Testing connection to server...');
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 5000,
      });
      
      const isConnected = response.ok;
      console.log(`Connection test result:`, isConnected);
      
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // ENHANCED PASSWORD RESET METHODS
  async forgotPassword(email) {
    console.log('Requesting password reset for:', email);
    try {
      if (!email || !email.trim()) {
        throw new Error('Email is required');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const result = await this.request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      
      console.log('Password reset request sent successfully');
      return result;
    } catch (error) {
      console.error('Password reset request failed:', error.message);
      throw error;
    }
  }

  async verifyResetToken(token) {
    console.log('Verifying password reset token...');
    try {
      if (!token) {
        throw new Error('Reset token is required');
      }

      const result = await this.request(`/api/auth/verify-reset-token/${token}`, {
        method: 'GET',
      });
      
      console.log('Reset token verified successfully');
      return result;
    } catch (error) {
      console.error('Reset token verification failed:', error.message);
      
      if (error.message.includes('expired')) {
        throw new Error('This password reset link has expired. Please request a new one.');
      } else if (error.message.includes('invalid')) {
        throw new Error('This password reset link is invalid. Please request a new one.');
      }
      
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    console.log('Resetting password with token...');
    try {
      if (!token) {
        throw new Error('Reset token is required');
      }

      if (!newPassword) {
        throw new Error('New password is required');
      }

      // Client-side password validation
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (newPassword.length > 50) {
        throw new Error('Password must be less than 50 characters');
      }

      const result = await this.request(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      console.log('Password reset successful');
      return result;
    } catch (error) {
      console.error('Password reset failed:', error.message);
      
      if (error.message.includes('expired')) {
        throw new Error('This password reset link has expired. Please request a new one.');
      } else if (error.message.includes('invalid')) {
        throw new Error('This password reset link is invalid. Please request a new one.');
      } else if (error.message.includes('same password')) {
        throw new Error('New password must be different from your current password.');
      } else if (error.message.includes('characters')) {
        throw new Error('Password must contain uppercase, lowercase letters, numbers, and special characters.');
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async resendResetEmail(email) {
    console.log('Resending password reset email for:', email);
    try {
      const result = await this.forgotPassword(email);
      console.log('Reset email resent successfully');
      return result;
    } catch (error) {
      console.error('Failed to resend reset email:', error.message);
      throw error;
    }
  }

  // AUTH METHODS
  async register(userData) {
    console.log('Registering new user...');
    try {
      const result = await this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      console.log('Registration successful');
      return result;
    } catch (error) {
      console.error('Registration failed:', error.message);
      throw error;
    }
  }

  async login(credentials) {
    console.log('Logging in user...');
    try {
      const result = await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      console.log('Login successful');
      return result;
    } catch (error) {
      console.error('Login failed:', error.message);
      throw error;
    }
  }

  async logout() {
    console.log('Logging out user...');
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'refreshToken']);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    console.log('Changing password for authenticated user...');
    try {
      const result = await this.request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      });
      console.log('Password changed successfully');
      return result;
    } catch (error) {
      console.error('Password change failed:', error.message);
      throw error;
    }
  }

  // USER METHODS
  async getUsers() {
    console.log('Fetching users...');
    try {
      const result = await this.request('/api/users');
      console.log('Users fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch users:', error.message);
      throw error;
    }
  }

  async getUser(userId) {
    console.log(`Fetching user ${userId}...`);
    try {
      const result = await this.request(`/api/users/${userId}`);
      console.log('User fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch user:', error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    console.log('Fetching current user profile...');
    try {
      const result = await this.request('/api/auth/me');
      console.log('Current user fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch current user:', error.message);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    console.log(`Updating user ${userId}...`);
    try {
      const result = await this.request(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      console.log('User updated successfully');
      return result;
    } catch (error) {
      console.error('Failed to update user:', error.message);
      throw error;
    }
  }

  async updateCurrentUser(userData) {
    console.log('Updating current user profile...');
    try {
      const result = await this.request('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      console.log('Profile updated successfully');
      return result;
    } catch (error) {
      console.error('Failed to update profile:', error.message);
      throw error;
    }
  }

  async updateUserStatus(userId, status) {
    console.log(`Updating user ${userId} status to ${status}...`);
    try {
      const result = await this.request(`/api/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      console.log('User status updated successfully');
      return result;
    } catch (error) {
      console.error('Failed to update user status:', error.message);
      throw error;
    }
  }

  async deleteUser(userId) {
    console.log(`Deleting user ${userId}...`);
    try {
      const result = await this.request(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      console.log('User deleted successfully');
      return result;
    } catch (error) {
      console.error('Failed to delete user:', error.message);
      throw error;
    }
  }

  // STATISTICS METHODS
  async getUserStats() {
    console.log('Fetching user statistics...');
    try {
      const result = await this.request('/api/stats/users');
      console.log('User stats fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch user stats:', error.message);
      throw error;
    }
  }

  async getDashboardStats() {
    console.log('Fetching dashboard statistics...');
    try {
      const result = await this.request('/api/stats/dashboard');
      console.log('Dashboard stats fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error.message);
      throw error;
    }
  }

  // HEALTH CHECK
  async healthCheck() {
    console.log('Performing health check...');
    try {
      const result = await this.request('/api/health');
      console.log('Health check successful');
      return result;
    } catch (error) {
      console.error('Health check failed:', error.message);
      throw error;
    }
  }

  // UPLOAD METHODS
  async uploadFile(file, endpoint = '/api/upload') {
    console.log('Uploading file...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = await AsyncStorage.getItem('userToken');
      const headers = {
        'Accept': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers,
      });

      const result = await this.handleResponse(response);
      console.log('File uploaded successfully');
      return result;
    } catch (error) {
      console.error('File upload failed:', error.message);
      throw error;
    }
  }

  // UTILITY METHODS
  async clearStorage() {
    console.log('Clearing local storage...');
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'refreshToken']);
      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async getStoredUserData() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  }

  isResetTokenExpired(expirationTime) {
    try {
      const expTime = new Date(expirationTime);
      const currentTime = new Date();
      return currentTime > expTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  formatPasswordResetError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('user not found') || message.includes('no account')) {
      return 'No account found with this email address. Please check your email or sign up.';
    } else if (message.includes('token') && message.includes('expired')) {
      return 'Password reset link has expired. Please request a new one.';
    } else if (message.includes('token') && message.includes('invalid')) {
      return 'Invalid password reset link. Please request a new one.';
    } else if (message.includes('password') && message.includes('weak')) {
      return 'Password is too weak. Please use a stronger password with uppercase, lowercase, numbers, and special characters.';
    } else if (message.includes('password') && message.includes('same')) {
      return 'New password must be different from your current password.';
    } else if (message.includes('rate limit') || message.includes('too many')) {
      return 'Too many requests. Please wait a few minutes before trying again.';
    } else if (message.includes('suspended') || message.includes('locked')) {
      return 'Your account has been suspended. Please contact support for assistance.';
    } else if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    } else if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (message.includes('server error') || message.includes('internal error')) {
      return 'Server error occurred. Please try again later.';
    } else {
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  validatePassword(password) {
    const errors = [];
    
    if (!password) {
      errors.push('Password is required');
      return errors;
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 50) {
      errors.push('Password must be less than 50 characters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password should contain at least one special character');
    }
    
    return errors;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.token) {
        await AsyncStorage.setItem('userToken', response.token);
        if (response.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.refreshToken);
        }
        return response.token;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearStorage();
      throw error;
    }
  }

  async checkNetworkConnectivity() {
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        timeout: 5000
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  formatUserData(userData) {
    return {
      id: userData.id || userData._id,
      name: userData.name || userData.fullName,
      fullName: userData.fullName || userData.name,
      email: userData.email,
      phone: userData.phone || '',
      location: userData.location || 'Not specified',
      status: userData.status || 'active',
      emailVerified: userData.emailVerified || false,
      deviceInfo: userData.deviceInfo || '',
      requestsCount: userData.requestsCount || 0,
      registeredAt: userData.registeredAt || userData.createdAt,
      lastLogin: userData.lastLogin || userData.updatedAt
    };
  }
}

export default new ApiService();