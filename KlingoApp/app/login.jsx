import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/apiService';

// Custom Success Modal Component
const SuccessModal = ({ visible, onClose, title, message, buttonText = "Continue" }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          {/* Success Icon */}
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark" size={32} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {title}
            </Text>
            <Text className="text-base text-gray-600 text-center leading-relaxed">
              {message}
            </Text>
          </View>
          
          {/* Action Button */}
          <TouchableOpacity
            className="bg-green-600 rounded-xl py-4 shadow-lg"
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Login Component
function Login({ onLogin = () => {}, onNavigateToSignup = () => {}, onNavigateToForgotPassword = () => {} }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({ title: '', message: '', user: null });

  // Check server connection on component mount (silently)
  useEffect(() => {
    checkServerConnection();
    loadSavedCredentials();
  }, []);

  const checkServerConnection = async () => {
    console.log('🔍 Checking server connection...');
    try {
      const isConnected = await ApiService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      
      // Only show alert if there's a connection issue
      if (!isConnected) {
        Alert.alert(
          "Connection Issue",
          "Unable to connect to the server. Please check your internet connection and make sure the server is running.",
          [
            { text: "Retry", onPress: checkServerConnection },
            { text: "Continue Anyway", style: "cancel" }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');
      
      if (savedEmail && savedRememberMe === 'true') {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('❌ Error loading saved credentials:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    console.log('🔑 Starting login process...');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const credentials = {
        email: email.toLowerCase().trim(),
        password,
        deviceInfo: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        platform: Platform.OS,
      };

      console.log('📤 Sending login credentials...');
      const response = await ApiService.login(credentials);

      if (response.token) {
        console.log('✅ Login successful, storing user data...');
        
        // Store token and user data
        await AsyncStorage.setItem('userToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));

        // Handle remember me
        if (rememberMe) {
          await AsyncStorage.setItem('savedEmail', email);
          await AsyncStorage.setItem('rememberMe', 'true');
        } else {
          await AsyncStorage.removeItem('savedEmail');
          await AsyncStorage.removeItem('rememberMe');
        }

        // Set success modal data and show it
        const userName = response.user.fullName || response.user.name || 'there';
        setSuccessData({
          title: "Welcome Back!",
          message: `Hello ${userName}, you have successfully logged in.`,
          user: response.user
        });
        setShowSuccessModal(true);
      } else {
        throw new Error('Login response missing token');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = "Login failed. Please try again.";
      let fieldErrors = {};
      
      // Handle specific error types
      if (error.message.includes('Invalid email or password') || 
          error.message.includes('Invalid credentials') ||
          error.message.includes('Unauthorized')) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
        fieldErrors = { 
          email: "Please check your email and password",
          password: "Please check your email and password"
        };
      } else if (error.message.includes('User not found')) {
        errorMessage = "No account found with this email. Please check your email or sign up.";
        fieldErrors.email = "No account found with this email";
      } else if (error.message.includes('Account locked') || error.message.includes('suspended')) {
        errorMessage = "Your account has been locked. Please contact support.";
      } else if (error.message.includes('Email not verified')) {
        errorMessage = "Please verify your email address before logging in.";
        fieldErrors.email = "Email not verified";
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connect')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }

      Alert.alert(
        "Login Failed",
        errorMessage,
        [
          { text: "Try Again", style: "default" },
          { text: "Forgot Password?", onPress: onNavigateToForgotPassword },
          { text: "Check Connection", onPress: checkServerConnection },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    console.log('✅ Calling onLogin callback');
    setShowSuccessModal(false);
    onLogin(successData.user);
  };

  const handleSocialLogin = (provider) => {
    Alert.alert(
      "Coming Soon",
      `${provider} login will be available in a future update.`,
      [{ text: "OK" }]
    );
  };

  const renderInput = (label, value, onChangeText, placeholder, options = {}) => (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        {label}
      </Text>
      <View className={`bg-gray-50 rounded-xl px-4 py-4 border flex-row items-center ${
        errors[options.errorKey] ? 'border-red-500' : 'border-gray-200'
      }`}>
        <TextInput
          className="flex-1 text-base text-gray-800"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            // Clear error when user starts typing
            if (errors[options.errorKey]) {
              setErrors(prev => ({ ...prev, [options.errorKey]: null }));
            }
          }}
          editable={!loading}
          {...options}
        />
        {options.showToggle && (
          <TouchableOpacity
            onPress={options.onToggle}
            className="ml-3"
            disabled={loading}
          >
            <Ionicons 
              name={options.isVisible ? "eye-off" : "eye"} 
              size={20} 
              color={loading ? "#9CA3AF" : "#10B981"} 
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[options.errorKey] && (
        <Text className="text-red-500 text-xs mt-1">
          {errors[options.errorKey]}
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-12">
          {/* Header with Logo */}
          <View className="items-center mb-10">
            <View className="mb-6">
              <Image
                source={require("../assets/images/klingo-logo.png")}
                className="w-20 h-20"
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Sign in to continue to Klingo
            </Text>
          </View>

          {/* Login Form */}
          <View className="flex-1 justify-center">
            {renderInput(
              "Email Address",
              email,
              setEmail,
              "Enter your email address",
              {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoComplete: 'email',
                errorKey: 'email',
                maxLength: 100,
              }
            )}

            {renderInput(
              "Password",
              password,
              setPassword,
              "Enter your password",
              {
                secureTextEntry: !showPassword,
                autoComplete: 'password',
                showToggle: true,
                isVisible: showPassword,
                onToggle: () => setShowPassword(!showPassword),
                errorKey: 'password',
                maxLength: 50,
              }
            )}

            {/* Remember Me & Forgot Password */}
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity 
                className="flex-row items-center"
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View className={`w-5 h-5 border-2 rounded mr-2 items-center justify-center ${
                  rememberMe ? 'bg-green-600 border-green-600' : 'border-gray-300'
                }`}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-sm text-gray-700">Remember me</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onNavigateToForgotPassword}
                disabled={loading}
              >
                <Text className="text-sm text-green-600 font-medium">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`bg-green-600 rounded-xl py-4 mb-6 shadow-lg ${
                loading ? 'opacity-50' : ''
              }`}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white text-lg font-semibold ml-2">
                    Signing In...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-lg font-semibold text-center">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="px-4 text-sm text-gray-500">
                or continue with
              </Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Social Login Options */}
            <View className="flex-row gap-3 mb-8">
              <TouchableOpacity 
                className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
                disabled={loading}
                onPress={() => handleSocialLogin('Google')}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text className="text-base font-medium text-gray-700 ml-2">
                  Google
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
                disabled={loading}
                onPress={() => handleSocialLogin('Apple')}
              >
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text className="text-base font-medium text-gray-700 ml-2">
                  Apple
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center mb-20">
            <Text className="text-base text-gray-600">
              Don't have an account?
            </Text>
            <TouchableOpacity 
              className="ml-1" 
              onPress={onNavigateToSignup}
              disabled={loading}
            >
              <Text className="text-base text-green-600 font-semibold">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Custom Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        title={successData.title}
        message={successData.message}
        buttonText="Continue"
      />
    </KeyboardAvoidingView>
  );
}

export default Login;