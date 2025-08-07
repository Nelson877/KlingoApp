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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Forgot Password Component
function ForgotPassword({ onBackToLogin = () => {}, onResetPassword = () => {} }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await onResetPassword({ email });
        setIsSubmitted(true);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        Alert.alert(
          "Error", 
          "Failed to send reset email. Please try again.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const renderInput = (label, value, onChangeText, placeholder, options = {}) => (
    <View className="mb-6">
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        {label}
      </Text>
      <View className={`bg-gray-50 rounded-xl px-4 py-4 border flex-row items-center ${
        errors[options.errorKey] ? 'border-red-500' : 'border-gray-200'
      }`}>
        <Ionicons 
          name="mail-outline" 
          size={20} 
          color={errors[options.errorKey] ? "#EF4444" : "#10B981"}
          style={{ marginRight: 12 }}
        />
        <TextInput
          className="flex-1 text-base text-gray-800"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={!isSubmitted}
          {...options}
        />
      </View>
      {errors[options.errorKey] && (
        <Text className="text-red-500 text-xs mt-1">
          {errors[options.errorKey]}
        </Text>
      )}
    </View>
  );

  const SuccessView = () => (
    <View className="flex-1 justify-center items-center px-6">
      {/* Success Icon */}
      <View className="bg-green-100 rounded-full p-6 mb-6">
        <Ionicons name="mail" size={48} color="#10B981" />
      </View>
      
      <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">
        Check Your Email
      </Text>
      
      <Text className="text-base text-gray-600 text-center mb-2">
        We've sent a password reset link to:
      </Text>
      
      <Text className="text-base font-semibold text-green-600 mb-8 text-center">
        {email}
      </Text>
      
      <Text className="text-sm text-gray-500 text-center mb-8 leading-5">
        Click the link in the email to reset your password. 
        If you don't see it, check your spam folder.
      </Text>
      
      {/* Action Buttons */}
      <View className="w-full">
        <TouchableOpacity
          className="bg-green-600 rounded-xl py-4 mb-4 shadow-lg"
          onPress={() => {
            setIsSubmitted(false);
            setEmail('');
            setErrors({});
          }}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            Try Another Email
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-white border border-gray-300 rounded-xl py-4 shadow-sm"
          onPress={onBackToLogin}
          activeOpacity={0.8}
        >
          <Text className="text-gray-700 text-lg font-semibold text-center">
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isSubmitted) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 pt-12">
          {/* Header */}
          <View className="px-6 mb-8">
            <TouchableOpacity 
              className="self-start p-2 -ml-2"
              onPress={onBackToLogin}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <SuccessView />
        </View>
      </KeyboardAvoidingView>
    );
  }

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
          {/* Header with Back Button */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity 
              className="p-2 -ml-2"
              onPress={onBackToLogin}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

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
              Forgot Password?
            </Text>
            <Text className="text-base text-gray-600 text-center px-4">
              No worries! Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          {/* Reset Form */}
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

            {/* Reset Button */}
            <TouchableOpacity
              className={`rounded-xl py-4 mb-6 shadow-lg ${
                isLoading ? 'bg-green-400' : 'bg-green-600'
              }`}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <View className="flex-row items-center justify-center">
                {isLoading && (
                  <View className="mr-2">
                    <Ionicons name="reload" size={20} color="#FFF" />
                  </View>
                )}
                <Text className="text-white text-lg font-semibold">
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Info Box */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm text-blue-800 font-medium mb-1">
                    Password Reset Instructions
                  </Text>
                  <Text className="text-sm text-blue-700 leading-5">
                    Check your email for a link to reset your password. The link will expire in 1 hour for security reasons.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Back to Login Link */}
          <View className="flex-row justify-center items-center mb-20">
            <Text className="text-base text-gray-600">
              Remember your password?
            </Text>
            <TouchableOpacity 
              className="ml-1" 
              onPress={onBackToLogin}
            >
              <Text className="text-base text-green-600 font-semibold">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default ForgotPassword;