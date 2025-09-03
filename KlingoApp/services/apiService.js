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
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
      
      if (retryCount < maxRetries && this._shouldRetry(error)) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
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

  // ===== NEW: CLEANUP REQUEST METHODS =====

  async submitCleanupRequest(requestData) {
    console.log('Submitting cleanup request:', requestData);
    try {
      // Validate required fields
      if (!requestData.problemType) {
        throw new Error('Problem type is required');
      }
      if (!requestData.severity) {
        throw new Error('Severity level is required');
      }
      if (!requestData.description || !requestData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!requestData.contactInfo?.phone || !requestData.contactInfo.phone.trim()) {
        throw new Error('Contact phone number is required');
      }

      // Validate location based on problem type
      if (requestData.problemType === 'other') {
        if (!requestData.otherDetails?.specificLocation || !requestData.otherDetails.specificLocation.trim()) {
          throw new Error('Specific location is required for other request types');
        }
        if (!requestData.otherDetails?.customProblemType || !requestData.otherDetails.customProblemType.trim()) {
          throw new Error('Custom problem type is required for other requests');
        }
      } else {
        if (!requestData.location || !requestData.location.trim()) {
          throw new Error('Location is required');
        }
      }

      const result = await this.request('/api/cleanup-requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      console.log('Cleanup request submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('Submit cleanup request failed:', error.message);
      throw error;
    }
  }

  async getCleanupRequests(filters = {}) {
    console.log('Fetching cleanup requests with filters:', filters);
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/cleanup-requests?${queryString}` : '/api/cleanup-requests';
      
      const result = await this.request(endpoint);
      console.log('Cleanup requests fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch cleanup requests:', error.message);
      throw error;
    }
  }

  async getCleanupRequest(requestId) {
    console.log(`Fetching cleanup request ${requestId}...`);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}`);
      console.log('Cleanup request fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch cleanup request:', error.message);
      throw error;
    }
  }

  async updateCleanupRequestStatus(requestId, statusData) {
    console.log(`Updating cleanup request ${requestId} status:`, statusData);
    try {
      if (!statusData.status) {
        throw new Error('Status is required');
      }

      if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(statusData.status)) {
        throw new Error('Invalid status value');
      }

      const result = await this.request(`/api/cleanup-requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData),
      });
      
      console.log('Cleanup request status updated successfully');
      return result;
    } catch (error) {
      console.error('Failed to update cleanup request status:', error.message);
      throw error;
    }
  }

  async updateCleanupRequest(requestId, updateData) {
    console.log(`Updating cleanup request ${requestId}:`, updateData);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      
      console.log('Cleanup request updated successfully');
      return result;
    } catch (error) {
      console.error('Failed to update cleanup request:', error.message);
      throw error;
    }
  }

  async deleteCleanupRequest(requestId) {
    console.log(`Deleting cleanup request ${requestId}...`);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}`, {
        method: 'DELETE',
      });
      
      console.log('Cleanup request deleted successfully');
      return result;
    } catch (error) {
      console.error('Failed to delete cleanup request:', error.message);
      throw error;
    }
  }

  async getCleanupRequestStats() {
    console.log('Fetching cleanup request statistics...');
    try {
      const result = await this.request('/api/cleanup-requests/stats/summary');
      console.log('Cleanup request stats fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch cleanup request stats:', error.message);
      throw error;
    }
  }

  // ===== PASSWORD RESET METHODS =====

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
      }
      
      throw error;
    }
  }

  // ===== AUTH METHODS =====

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

  // ===== USER METHODS =====

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

  // ===== STATISTICS METHODS =====

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

  // ===== UTILITY METHODS =====

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

  // ===== VALIDATION METHODS =====

  validateCleanupRequest(requestData) {
    const errors = [];

    if (!requestData.problemType) {
      errors.push('Problem type is required');
    }

    if (!requestData.severity) {
      errors.push('Severity level is required');
    }

    if (!requestData.description || !requestData.description.trim()) {
      errors.push('Description is required');
    }

    if (!requestData.contactInfo?.phone || !requestData.contactInfo.phone.trim()) {
      errors.push('Contact phone number is required');
    }

    // Validate based on problem type
    if (requestData.problemType === 'other') {
      if (!requestData.otherDetails?.customProblemType || !requestData.otherDetails.customProblemType.trim()) {
        errors.push('Custom problem type is required for other requests');
      }
      if (!requestData.otherDetails?.specificLocation || !requestData.otherDetails.specificLocation.trim()) {
        errors.push('Specific location is required for other requests');
      }
      if (!requestData.otherDetails?.preferredDate) {
        errors.push('Preferred date is required for other requests');
      }
      if (!requestData.otherDetails?.preferredTime) {
        errors.push('Preferred time is required for other requests');
      }
    } else {
      if (!requestData.location || !requestData.location.trim()) {
        errors.push('Location is required');
      }
    }

    return errors;
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

  validatePhoneNumber(phone) {
    if (!phone || !phone.trim()) {
      return 'Phone number is required';
    }
    
    // Basic phone validation - adjust regex based on your requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }
    
    return null;
  }

  // ===== HELPER METHODS =====

  formatCleanupRequestData(formData) {
    const formatted = {
      problemType: formData.problemType,
      severity: formData.severity,
      description: formData.description.trim(),
      contactInfo: {
        name: formData.contactInfo?.name?.trim() || 'Anonymous',
        phone: formData.contactInfo?.phone?.trim(),
        email: formData.contactInfo?.email?.trim() || ''
      },
      photos: formData.photos || []
    };

    if (formData.problemType === 'other') {
      formatted.otherDetails = {
        customProblemType: formData.otherDetails?.customProblemType?.trim() || '',
        preferredDate: formData.otherDetails?.preferredDate || '',
        preferredTime: formData.otherDetails?.preferredTime || '',
        specificLocation: formData.otherDetails?.specificLocation?.trim() || ''
      };
      formatted.location = formatted.otherDetails.specificLocation;
    } else {
      formatted.location = formData.location?.trim() || '';
    }

    return formatted;
  }

  formatErrorMessage(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    } else if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (message.includes('server error') || message.includes('internal error')) {
      return 'Server error occurred. Please try again later.';
    } else if (message.includes('rate limit') || message.includes('too many')) {
      return 'Too many requests. Please wait a few minutes before trying again.';
    } else if (message.includes('validation') || message.includes('required')) {
      return error.message; // Return the original validation message
    } else if (message.includes('not found')) {
      return 'The requested resource was not found.';
    } else if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Please log in to continue.';
    } else if (message.includes('forbidden') || message.includes('permission')) {
      return 'You don\'t have permission to perform this action.';
    } else {
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
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

  formatCleanupRequestForDisplay(request) {
    return {
      id: request.id,
      problemType: request.problemType,
      problemLabel: request.problemLabel,
      location: request.location,
      severity: request.severity,
      priority: request.priority || request.severity,
      description: request.description,
      contactInfo: request.contactInfo,
      photos: request.photos || [],
      otherDetails: request.otherDetails || {},
      status: request.status,
      assignedTo: request.assignedTo || '',
      adminNotes: request.adminNotes || '',
      estimatedCompletion: request.estimatedCompletion,
      actualCompletion: request.actualCompletion,
      submittedAt: request.submittedAt,
      updatedAt: request.updatedAt,
      user: request.user
    };
  }

  // ===== HEALTH CHECK =====

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
}

export default new ApiService();