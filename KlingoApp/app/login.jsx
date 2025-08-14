import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/apiService';

// Login Component
function Login({ onLogin = () => {}, onNavigateToSignup = () => {}, onNavigateToForgotPassword = () => {} }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const credentials = {
        email: email.toLowerCase().trim(),
        password,
      };

      const response = await ApiService.login(credentials);

      if (response.token) {
        // Store token and user data
        await AsyncStorage.setItem('userToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));

        Alert.alert(
          "Welcome Back!",
          "You have successfully logged in.",
          [
            {
              text: "OK",
              onPress: () => onLogin(response.user),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.message.includes('Invalid email or password')) {
        errorMessage = "Invalid email or password. Please check your credentials.";
        setErrors({ 
          email: "Please check your email and password",
          password: "Please check your email and password"
        });
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
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
          onChangeText={onChangeText}
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
                errorKey: 'email'
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
                errorKey: 'password'
              }
            )}

            {/* Forgot Password */}
            <TouchableOpacity 
              className="self-end mb-6"
              onPress={onNavigateToForgotPassword}
              disabled={loading}
            >
              <Text className="text-sm text-green-600 font-medium">
                Forgot Password?
              </Text>
            </TouchableOpacity>

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
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text className="text-base font-medium text-gray-700 ml-2">
                  Google
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
                disabled={loading}
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
    </KeyboardAvoidingView>
  );
}

export default Login;