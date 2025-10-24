import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000';
    } else if (Platform.OS === 'ios') {
      // Replace with your actual computer's IP address
      return 'http://192.168.1.100:5000'; 
    } else {
      return 'http://192.168.1.100:5000';
    }
  }
  return 'https://your-production-api.com';
};

const API_BASE_URL = getApiBaseUrl();

// Enhanced error messages for better user experience
const USER_FRIENDLY_MESSAGES = {
  NETWORK_ERROR: 'No internet connection. Please check your network and try again.',
  SERVER_ERROR: 'We\'re experiencing some technical difficulties. Please try again in a moment.',
  TIMEOUT_ERROR: 'This is taking longer than usual. Please try again.',
  AUTH_ERROR: 'Your session has expired. Please sign in again.',
  PERMISSION_ERROR: 'You don\'t have access to this feature.',
  NOT_FOUND: 'We couldn\'t find what you\'re looking for.',
  RATE_LIMIT: 'Slow down there! Please wait a moment before trying again.',
  VALIDATION_ERROR: 'Please check your information and try again.',
  UNKNOWN_ERROR: 'Something unexpected happened. Please try again.',
  
  // Login specific messages
  LOGIN_INVALID_CREDENTIALS: 'Welcome back! We just need to verify your details. Please double-check your email and password.',
  LOGIN_EMAIL_NOT_FOUND: 'Welcome! We don\'t recognize that email address. Would you like to create an account instead?',
  LOGIN_WRONG_PASSWORD: 'Welcome back! That password isn\'t quite right. Please give it another try.',
  LOGIN_ACCOUNT_LOCKED: 'Welcome! Your account is temporarily secured for safety. Our support team will help you get back in quickly.',
  LOGIN_ACCOUNT_DISABLED: 'Welcome! There\'s a small issue with your account. Our support team is here to help resolve this.',
  LOGIN_TOO_MANY_ATTEMPTS: 'Welcome back! You\'ve been trying hard to get in. Take a quick break and we\'ll let you try again in a few minutes.',
  LOGIN_NETWORK_ISSUE: 'Welcome! We\'re having trouble connecting right now. Please check your internet and try again.',
  
  // Registration specific messages
  REGISTER_EMAIL_EXISTS: 'Looks like you already have an account! Try signing in instead.',
  REGISTER_WEAK_PASSWORD: 'Let\'s make your password stronger! Try adding more characters, numbers, or symbols.',
  REGISTER_INVALID_EMAIL: 'That email doesn\'t look quite right. Mind checking it?',
  REGISTER_TERMS_NOT_ACCEPTED: 'Just need you to accept our terms and conditions to continue.',
  
  // Success messages
  LOGIN_SUCCESS: '🎉 Welcome back! Great to see you again.',
  REGISTER_SUCCESS: '🎉 Welcome aboard! Your account is all set up.',
  LOGOUT_SUCCESS: 'You\'ve been signed out safely. See you soon!',
  REQUEST_SUBMITTED: '✅ All done! Your request has been submitted.',
  UPDATE_SUCCESS: '✅ Perfect! Your information has been updated.',
  DELETE_SUCCESS: '✅ Successfully deleted.',
  
  // Connection messages
  CONNECTION_RESTORED: '🌐 You\'re back online! Everything should work normally now.',
  CONNECTION_LOST: '📱 Connection seems spotty. Some features might not work properly.',
};

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.requestQueue = new Map();
    this.retryQueue = new Map();
    this.isOnline = true;
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
        throw this.createDetailedError(response.status, data);
      }
      
      return data;
    } else {
      const text = await response.text();
      
      if (!response.ok) {
        throw this.createDetailedError(response.status, { message: text });
      }
      
      return { message: text };
    }
  }

  createDetailedError(status, data) {
    const error = new Error();
    error.status = status;
    error.data = data;
    
    switch (status) {
      case 400:
        if (data.field && data.message) {
          error.message = data.message;
          error.userMessage = data.message;
        } else {
          error.message = data.message || 'Invalid request data';
          error.userMessage = USER_FRIENDLY_MESSAGES.VALIDATION_ERROR;
        }
        break;
        
      case 401:
        if (data.code === 'INVALID_CREDENTIALS' || data.code === 'LOGIN_FAILED') {
          error.message = 'Invalid credentials';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_INVALID_CREDENTIALS;
          error.suggestions = ['Double-check your email address', 'Make sure your password is correct', 'Try the "Forgot Password" option'];
        } else if (data.code === 'EMAIL_NOT_FOUND') {
          error.message = 'Email not found';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_EMAIL_NOT_FOUND;
          error.suggestions = ['Check if you typed your email correctly', 'Try creating a new account'];
        } else if (data.code === 'WRONG_PASSWORD') {
          error.message = 'Wrong password';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_WRONG_PASSWORD;
          error.suggestions = ['Double-check your password', 'Use "Forgot Password" if needed'];
        } else if (data.code === 'TOKEN_EXPIRED') {
          error.message = 'Token expired';
          error.userMessage = USER_FRIENDLY_MESSAGES.AUTH_ERROR;
        } else {
          error.message = 'Authentication required';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_INVALID_CREDENTIALS;
          error.suggestions = ['Check your email and password', 'Try signing in again'];
        }
        this.clearStorage();
        break;
        
      case 403:
        if (data.code === 'ACCOUNT_LOCKED') {
          error.message = 'Account locked';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_ACCOUNT_LOCKED;
          error.suggestions = ['Contact our support team for help'];
        } else if (data.code === 'ACCOUNT_DISABLED') {
          error.message = 'Account disabled';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_ACCOUNT_DISABLED;
          error.suggestions = ['Reach out to our support team'];
        } else {
          error.message = 'Access denied';
          error.userMessage = USER_FRIENDLY_MESSAGES.PERMISSION_ERROR;
        }
        break;
        
      case 404:
        error.message = 'Resource not found';
        error.userMessage = USER_FRIENDLY_MESSAGES.NOT_FOUND;
        error.suggestions = ['Try refreshing the page', 'Check if the link is correct'];
        break;
        
      case 409:
        if (data.code === 'EMAIL_EXISTS') {
          error.message = 'Email already exists';
          error.userMessage = USER_FRIENDLY_MESSAGES.REGISTER_EMAIL_EXISTS;
          error.suggestions = ['Try signing in instead', 'Use a different email address'];
        } else {
          error.message = data.message || 'Conflict occurred';
          error.userMessage = data.message || USER_FRIENDLY_MESSAGES.VALIDATION_ERROR;
        }
        break;
        
      case 422:
        error.message = data.message || 'Validation failed';
        error.userMessage = data.message || USER_FRIENDLY_MESSAGES.VALIDATION_ERROR;
        error.validationErrors = data.errors || [];
        break;
        
      case 429:
        if (data.code === 'LOGIN_ATTEMPTS_EXCEEDED') {
          error.message = 'Too many login attempts';
          error.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_TOO_MANY_ATTEMPTS;
          error.suggestions = ['Wait a few minutes', 'Take a short break and try again'];
        } else {
          error.message = 'Rate limit exceeded';
          error.userMessage = USER_FRIENDLY_MESSAGES.RATE_LIMIT;
          error.suggestions = ['Wait a moment', 'Try again in a few seconds'];
        }
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        error.message = 'Server error';
        error.userMessage = USER_FRIENDLY_MESSAGES.SERVER_ERROR;
        error.suggestions = ['Try again in a moment', 'Check back in a few minutes'];
        break;
        
      default:
        error.message = data.message || `HTTP ${status}`;
        error.userMessage = USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR;
        error.suggestions = ['Try again', 'Contact support if this continues'];
    }
    
    return error;
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
      
      if (!this.isOnline) {
        this.isOnline = true;
        console.log(USER_FRIENDLY_MESSAGES.CONNECTION_RESTORED);
      }
      
      return await this.handleResponse(response);
      
    } catch (error) {
      console.error(`API Request Error (attempt ${retryCount + 1}):`, error);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error();
        timeoutError.message = 'Request timeout';
        timeoutError.userMessage = USER_FRIENDLY_MESSAGES.TIMEOUT_ERROR;
        throw timeoutError;
      }
      
      if (this._isNetworkError(error)) {
        this.isOnline = false;
        const networkError = new Error();
        networkError.message = 'Network error';
        networkError.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_NETWORK_ISSUE;
        networkError.suggestions = ['Check your internet connection', 'Try connecting to WiFi', 'Move to a better signal area'];
        
        if (retryCount < maxRetries && this._shouldRetry(error)) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Retrying request in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return this._makeRequest(endpoint, options, controller, retryCount + 1);
        }
        
        throw networkError;
      }
      
      if (error.userMessage) {
        throw error;
      }
      
      const genericError = new Error();
      genericError.message = error.message || 'Unknown error';
      genericError.userMessage = USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR;
      throw genericError;
    }
  }

  _isNetworkError(error) {
    return error.name === 'AbortError' || 
           error.message.includes('Network request failed') ||
           error.message.includes('fetch') ||
           error.message.includes('timeout') ||
           error.message.includes('connection');
  }

  _shouldRetry(error) {
    return this._isNetworkError(error) && !error.userMessage;
  }

  async testConnection() {
    try {
      console.log('Testing connection to server...');
      console.log('Testing URL:', `${this.baseURL}/api/health`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const isConnected = response.ok;
      console.log(`Connection test result:`, isConnected);
      
      if (isConnected) {
        const data = await response.json();
        console.log('Server response:', data);
      }
      
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // ===== AUTH METHODS =====

  async register(userData) {
    console.log('Registering new user...');
    try {
      const validationError = this.validateRegistrationData(userData);
      if (validationError) {
        const error = new Error(validationError.message);
        error.userMessage = validationError.userMessage;
        throw error;
      }

      const result = await this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      console.log('Registration successful');
      
      if (result.token) {
        await AsyncStorage.setItem('userToken', result.token);
      }
      if (result.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
      }
      
      result.userMessage = USER_FRIENDLY_MESSAGES.REGISTER_SUCCESS;
      
      return result;
    } catch (error) {
      console.error('Registration failed:', error);
      const registrationError = new Error(error.message);
      registrationError.userMessage = error.userMessage || USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR;
      registrationError.validationErrors = error.validationErrors;
      throw registrationError;
    }
  }

  async login(credentials) {
    console.log('Logging in user...');
    try {
      const validationError = this.validateLoginCredentials(credentials);
      if (validationError) {
        const error = new Error(validationError.message);
        error.userMessage = validationError.userMessage;
        throw error;
      }

      const result = await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      console.log('Login successful');
      
      if (result.token) {
        await AsyncStorage.setItem('userToken', result.token);
      }
      if (result.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
      }
      
      result.userMessage = USER_FRIENDLY_MESSAGES.LOGIN_SUCCESS;
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      const loginError = new Error(error.message);
      loginError.userMessage = error.userMessage || USER_FRIENDLY_MESSAGES.LOGIN_INVALID_CREDENTIALS;
      throw loginError;
    }
  }

  async logout() {
    console.log('Logging out user...');
    try {
      try {
        await this.request('/api/auth/logout', { method: 'POST' });
      } catch (serverError) {
        console.log('Server logout failed, but continuing with local logout');
      }
      
      await AsyncStorage.multiRemove(['userToken', 'userData', 'refreshToken']);
      console.log('Logout successful');
      
      return { userMessage: USER_FRIENDLY_MESSAGES.LOGOUT_SUCCESS };
    } catch (error) {
      console.error('Logout error:', error);
      const logoutError = new Error('Logout failed');
      logoutError.userMessage = 'There was an issue signing you out. Please try again.';
      throw logoutError;
    }
  }

  // ===== VALIDATION METHODS =====

  validateLoginCredentials(credentials) {
    if (!credentials.email || !credentials.email.trim()) {
      return {
        message: 'Email is required',
        userMessage: 'Please enter your email address.'
      };
    }

    if (!credentials.password || !credentials.password.trim()) {
      return {
        message: 'Password is required',
        userMessage: 'Please enter your password.'
      };
    }

    const emailError = this.validateEmail(credentials.email);
    if (emailError) {
      return {
        message: emailError,
        userMessage: emailError
      };
    }

    return null;
  }

  validateRegistrationData(userData) {
    if (!userData.email || !userData.email.trim()) {
      return {
        message: 'Email is required',
        userMessage: 'Please enter your email address.'
      };
    }

    if (!userData.password || !userData.password.trim()) {
      return {
        message: 'Password is required',
        userMessage: 'Please enter a password.'
      };
    }

    if (userData.password.length < 8) {
      return {
        message: 'Password too short',
        userMessage: USER_FRIENDLY_MESSAGES.REGISTER_WEAK_PASSWORD
      };
    }

    if (userData.confirmPassword && userData.password !== userData.confirmPassword) {
      return {
        message: 'Passwords do not match',
        userMessage: USER_FRIENDLY_MESSAGES.PASSWORD_MISMATCH
      };
    }

    const emailError = this.validateEmail(userData.email);
    if (emailError) {
      return {
        message: emailError,
        userMessage: emailError
      };
    }

    return null;
  }

  validateCleanupRequest(requestData) {
    const errors = [];

    if (!requestData.problemType) {
      errors.push('Please select a problem type.');
    }

    if (!requestData.severity) {
      errors.push('Please select a severity level.');
    }

    if (!requestData.description || !requestData.description.trim()) {
      errors.push('Please provide a description of the problem.');
    } else if (requestData.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long.');
    }

    if (!requestData.contactInfo?.phone || !requestData.contactInfo.phone.trim()) {
      errors.push('Please provide your phone number.');
    } else {
      const phoneError = this.validatePhoneNumber(requestData.contactInfo.phone);
      if (phoneError) {
        errors.push(phoneError);
      }
    }

    if (requestData.problemType === 'other') {
      if (!requestData.otherDetails?.customProblemType || !requestData.otherDetails.customProblemType.trim()) {
        errors.push('Please specify the type of problem for other requests.');
      }
      if (!requestData.otherDetails?.specificLocation || !requestData.otherDetails.specificLocation.trim()) {
        errors.push('Please provide the specific location.');
      }
      if (!requestData.otherDetails?.preferredDate) {
        errors.push('Please select your preferred date.');
      }
      if (!requestData.otherDetails?.preferredTime) {
        errors.push('Please select your preferred time.');
      }
    } else {
      if (!requestData.location || !requestData.location.trim()) {
        errors.push('Please provide the location of the problem.');
      }
    }

    return errors;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Please enter your email address.';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address.';
    }
    return null;
  }

  validatePhoneNumber(phone) {
    if (!phone || !phone.trim()) {
      return 'Please enter your phone number.';
    }
    
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.length < 10) {
      return 'Phone number must be at least 10 digits.';
    }
    
    return null;
  }

  // ===== CLEANUP REQUEST METHODS =====

  async submitCleanupRequest(requestData) {
    console.log('Submitting cleanup request:', requestData);
    
    try {
      const validationErrors = this.validateCleanupRequest(requestData);
      if (validationErrors.length > 0) {
        const error = new Error('Validation failed');
        error.userMessage = validationErrors.join(' ');
        throw error;
      }

      const formattedData = this.formatCleanupRequestData(requestData);

      const result = await this.request('/api/cleanup-requests', {
        method: 'POST',
        body: JSON.stringify(formattedData),
      });
      
      console.log('Cleanup request submitted successfully:', result);
      result.userMessage = USER_FRIENDLY_MESSAGES.REQUEST_SUBMITTED;
      return result;
    } catch (error) {
      console.error('Submit cleanup request failed:', error.message);
      const submitError = new Error(error.message);
      submitError.userMessage = error.userMessage || 'Failed to submit your request. Please try again.';
      throw submitError;
    }
  }

  async getCleanupRequests(filters = {}) {
    console.log('Fetching cleanup requests with filters:', filters);
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/cleanup-requests?${queryString}` : '/api/cleanup-requests';
      
      const result = await this.request(endpoint);
      console.log(`Cleanup requests fetched successfully: ${result.data?.length || 0} items`);
      return result;
    } catch (error) {
      console.error('Failed to fetch cleanup requests:', error.message);
      const fetchError = new Error(error.message);
      fetchError.userMessage = error.userMessage || 'Failed to load cleanup requests. Please try again.';
      throw fetchError;
    }
  }

  async getCleanupRequest(requestId) {
    console.log('Fetching cleanup request:', requestId);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}`);
      console.log('Cleanup request fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch cleanup request:', error.message);
      const fetchError = new Error(error.message);
      fetchError.userMessage = error.userMessage || 'Failed to load cleanup request details. Please try again.';
      throw fetchError;
    }
  }

  async updateCleanupRequestStatus(requestId, status, adminNotes = '') {
    console.log(`Updating cleanup request ${requestId} status to ${status}`);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes }),
      });
      
      console.log('Cleanup request status updated successfully');
      result.userMessage = USER_FRIENDLY_MESSAGES.UPDATE_SUCCESS;
      return result;
    } catch (error) {
      console.error('Failed to update cleanup request status:', error.message);
      const updateError = new Error(error.message);
      updateError.userMessage = error.userMessage || 'Failed to update status. Please try again.';
      throw updateError;
    }
  }

  async assignCleanupRequest(requestId, assignee, estimatedCompletion = null) {
    console.log(`Assigning cleanup request ${requestId} to ${assignee}`);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: assignee, estimatedCompletion }),
      });
      
      console.log('Cleanup request assigned successfully');
      result.userMessage = USER_FRIENDLY_MESSAGES.UPDATE_SUCCESS;
      return result;
    } catch (error) {
      console.error('Failed to assign cleanup request:', error.message);
      const assignError = new Error(error.message);
      assignError.userMessage = error.userMessage || 'Failed to assign request. Please try again.';
      throw assignError;
    }
  }

  async deleteCleanupRequest(requestId) {
    console.log(`Deleting cleanup request ${requestId}`);
    try {
      const result = await this.request(`/api/cleanup-requests/${requestId}`, {
        method: 'DELETE',
      });
      
      console.log('Cleanup request deleted successfully');
      result.userMessage = USER_FRIENDLY_MESSAGES.DELETE_SUCCESS;
      return result;
    } catch (error) {
      console.error('Failed to delete cleanup request:', error.message);
      const deleteError = new Error(error.message);
      deleteError.userMessage = error.userMessage || 'Failed to delete request. Please try again.';
      throw deleteError;
    }
  }

  async getCleanupStats() {
    console.log('Fetching cleanup statistics');
    try {
      const result = await this.request('/api/cleanup-requests/stats');
      console.log('Cleanup statistics fetched successfully');
      return result;
    } catch (error) {
      console.error('Failed to fetch cleanup statistics:', error.message);
      const statsError = new Error(error.message);
      statsError.userMessage = error.userMessage || 'Failed to load statistics. Please try again.';
      throw statsError;
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

  getDisplayMessage(error) {
    return error.userMessage || error.message || USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR;
  }

  getErrorSuggestions(error) {
    return error.suggestions || [];
  }

  isRecoverableError(error) {
    const recoverableStatuses = [400, 401, 422, 429];
    return recoverableStatuses.includes(error.status) || this._isNetworkError(error);
  }

  getRecoveryActions(error) {
    const actions = [];
    
    if (error.status === 401) {
      actions.push({ label: 'Try Again', action: 'retry' });
      actions.push({ label: 'Forgot Password?', action: 'forgot_password' });
      actions.push({ label: 'Create Account', action: 'register' });
    } else if (this._isNetworkError(error)) {
      actions.push({ label: 'Check Connection', action: 'check_network' });
      actions.push({ label: 'Try Again', action: 'retry' });
    } else if (error.status === 429) {
      actions.push({ label: 'Wait & Retry', action: 'wait_retry' });
    } else {
      actions.push({ label: 'Try Again', action: 'retry' });
    }
    
    return actions;
  }

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
      photos: formData.photos || [],
      coordinates: formData.coordinates || {},
      deviceInfo: formData.deviceInfo || `${Platform.OS} ${Platform.Version}`
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
      formatted.otherDetails = {};
    }

    return formatted;
  }
}

export default new ApiService();
