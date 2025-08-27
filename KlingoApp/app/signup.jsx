import React, { useState, useEffect } from "react";
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
} from "react-native";
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

// Sign Up Component
function SignUp({ onSignUp = () => {}, onNavigateToLogin = () => {} }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationResponse, setRegistrationResponse] = useState(null); // Store the registration response

  // Check server connection on component mount (silently)
  useEffect(() => {
    checkServerConnection();
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

  const validateForm = () => {
    const newErrors = {};
    
    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }
    
    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*[a-zA-Z])/.test(password)) {
      newErrors.password = "Password must contain at least one letter";
    }
    
    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    console.log('🚀 Starting sign up process...');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Get device info
      const deviceInfo = Platform.OS === 'ios' ? 'iPhone' : 'Android';
      
      const userData = {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        deviceInfo,
        platform: Platform.OS,
        appVersion: '1.0.0', // You can get this from your app config
      };

      console.log('📤 Sending registration data...');
      const response = await ApiService.register(userData);

      if (response.token) {
        console.log('✅ Registration successful, storing user data...');
        
        // Store token and user data
        await AsyncStorage.setItem('userToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));

        // Store the complete registration response for later use
        setRegistrationResponse(response);

        // Show custom success modal instead of Alert.alert
        setShowSuccessModal(true);
      } else {
        throw new Error('Registration response missing token');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = "Registration failed. Please try again.";
      let fieldErrors = {};
      
      // Handle specific error types
      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        errorMessage = "An account with this email already exists. Please try logging in instead.";
        fieldErrors.email = "This email is already registered";
      } else if (error.message.includes('Invalid email')) {
        errorMessage = "Please enter a valid email address.";
        fieldErrors.email = "Invalid email format";
      } else if (error.message.includes('weak password') || error.message.includes('password')) {
        errorMessage = "Password is too weak. Please choose a stronger password.";
        fieldErrors.password = "Password does not meet requirements";
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connect')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }

      Alert.alert(
        "Registration Failed",
        errorMessage,
        [
          { text: "Try Again", style: "default" },
          { text: "Check Connection", onPress: checkServerConnection },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    console.log('✅ Calling onSignUp callback with user data');
    setShowSuccessModal(false);
    
    // Pass the user data from the registration response
    if (registrationResponse && registrationResponse.user) {
      console.log('✅ Passing user data to parent component:', registrationResponse.user);
      onSignUp(registrationResponse.user);
    } else {
      // Fallback: try to get from AsyncStorage
      console.log('⚠️ No registration response, trying AsyncStorage...');
      const getUserDataAndProceed = async () => {
        try {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const parsedUserData = JSON.parse(userData);
            console.log('✅ Retrieved user data from AsyncStorage:', parsedUserData);
            onSignUp(parsedUserData);
          } else {
            console.log('⚠️ No user data found, proceeding without data');
            onSignUp();
          }
        } catch (error) {
          console.error('❌ Error retrieving user data:', error);
          onSignUp();
        }
      };
      
      getUserDataAndProceed();
    }
  };

  const handleSocialSignUp = (provider) => {
    Alert.alert(
      "Coming Soon",
      `${provider} sign up will be available in a future update.`,
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
          <View className="items-center mb-8">
            <View className="mb-6">
              <Image
                source={require("../assets/images/klingo-logo.png")}
                className="w-20 h-20"
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Join Klingo and start your journey
            </Text>
          </View>

          {/* Sign Up Form */}
          <View className="flex-1">
            {renderInput(
              "Full Name",
              fullName,
              setFullName,
              "Enter your full name",
              {
                autoCapitalize: 'words',
                autoComplete: 'name',
                errorKey: 'fullName',
                maxLength: 50,
              }
            )}

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
              "Create a strong password (6+ characters)",
              {
                secureTextEntry: !showPassword,
                autoComplete: 'new-password',
                showToggle: true,
                isVisible: showPassword,
                onToggle: () => setShowPassword(!showPassword),
                errorKey: 'password',
                maxLength: 50,
              }
            )}

            {renderInput(
              "Confirm Password",
              confirmPassword,
              setConfirmPassword,
              "Re-enter your password",
              {
                secureTextEntry: !showConfirmPassword,
                autoComplete: 'new-password',
                showToggle: true,
                isVisible: showConfirmPassword,
                onToggle: () => setShowConfirmPassword(!showConfirmPassword),
                errorKey: 'confirmPassword',
                maxLength: 50,
              }
            )}

            {/* Sign Up Button */}
            <TouchableOpacity
              className={`bg-green-600 rounded-xl py-4 mb-6 shadow-lg ${
                loading ? 'opacity-50' : ''
              }`}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white text-lg font-semibold ml-2">
                    Creating Account...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-lg font-semibold text-center">
                  Create Account
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

            {/* Social Sign Up Options */}
            <View className="flex-row gap-3 mb-8">
              <TouchableOpacity 
                className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
                disabled={loading}
                onPress={() => handleSocialSignUp('Google')}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text className="text-base font-medium text-gray-700 ml-2">
                  Google
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
                disabled={loading}
                onPress={() => handleSocialSignUp('Apple')}
              >
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text className="text-base font-medium text-gray-700 ml-2">
                  Apple
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center mb-6">
            <Text className="text-base text-gray-600">
              Already have an account?
            </Text>
            <TouchableOpacity 
              className="ml-1" 
              onPress={onNavigateToLogin}
              disabled={loading}
            >
              <Text className="text-base text-green-600 font-semibold">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Conditions */}
          <View className="mb-6">
            <Text className="text-xs text-gray-600 text-center leading-4">
              By creating an account, you agree to our{" "}
              <Text className="text-green-600 font-medium">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="text-green-600 font-medium">
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Welcome to Klingo!"
        message="Your account has been created successfully!"
        buttonText="Get Started"
      />
    </KeyboardAvoidingView>
  );
}

export default SignUp;