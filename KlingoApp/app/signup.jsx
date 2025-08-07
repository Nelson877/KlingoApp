import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

// Sign Up Component
function SignUp({ onSignUp = () => {}, onNavigateToLogin = () => {} }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = () => {
    if (validateForm()) {
      onSignUp({ fullName, email, password });
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
          {...options}
        />
        {options.showToggle && (
          <TouchableOpacity
            onPress={options.onToggle}
            className="ml-3"
          >
            <Ionicons 
              name={options.isVisible ? "eye-off" : "eye"} 
              size={20} 
              color="#10B981" 
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
                errorKey: 'fullName'
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
                errorKey: 'email'
              }
            )}

            {renderInput(
              "Password",
              password,
              setPassword,
              "Create a strong password",
              {
                secureTextEntry: !showPassword,
                autoComplete: 'new-password',
                showToggle: true,
                isVisible: showPassword,
                onToggle: () => setShowPassword(!showPassword),
                errorKey: 'password'
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
                errorKey: 'confirmPassword'
              }
            )}

            {/* Sign Up Button */}
            <TouchableOpacity
              className="bg-green-600 rounded-xl py-4 mb-6 shadow-lg"
              onPress={handleSignUp}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-semibold text-center">
                Create Account
              </Text>
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
              <TouchableOpacity className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm">
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text className="text-base font-medium text-gray-700 ml-2">
                  Google
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm">
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
    </KeyboardAvoidingView>
  );
}

export default SignUp;