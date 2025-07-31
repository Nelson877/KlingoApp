import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-8 py-12">
        
        {/* Header with Logo */}
        <View className="items-center mt-8 mb-12">
          <Image
            source={require("../assets/images/klingo-logo.png")}
            className="w-32 h-32 mb-4"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back
          </Text>
          <Text className="text-lg text-gray-600 text-center">
            Sign in to continue to KLINGO
          </Text>
        </View>

        {/* Login Form */}
        <View className="flex-1 justify-center">
          
          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Email Address
            </Text>
            <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
              <TextInput
                className="text-base text-gray-800"
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-8">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Password
            </Text>
            <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
              <TextInput
                className="flex-1 text-base text-gray-800"
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                className="ml-3"
              >
                <Text className="text-sm text-green-600 font-medium">
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity className="self-end mb-8">
            <Text className="text-sm text-green-600 font-medium">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            className="bg-green-600 rounded-xl py-4 px-8 mb-6"
            onPress={onLogin}
          >
            <Text className="text-white text-lg font-semibold text-center">
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="px-4 text-sm text-gray-500">or</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Social Login Options */}
          <View className="flex-row space-x-4 mb-8">
            <TouchableOpacity className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center">
              <Text className="text-base font-medium text-gray-700 ml-2">
                Google
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white border border-gray-300 rounded-xl py-3 px-4 flex-row items-center justify-center">
              <Text className="text-base font-medium text-gray-700 ml-2">
                Apple
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Sign Up Link */}
        <View className="flex-row justify-center items-center pb-8">
          <Text className="text-base text-gray-600">
            Don't have an account? 
          </Text>
          <TouchableOpacity className="ml-1">
            <Text className="text-base text-green-600 font-semibold">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

export default Login;