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
import ApiService from '../services/apiService';

// Enhanced Forgot Password Component with better UX
function ForgotPassword({ onBackToLogin = () => {}, onResetPassword = () => {} }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resetToken, setResetToken] = useState(null); // Store token for direct reset

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

  const startResendCooldown = () => {
    setCanResend(false);
    setResendCountdown(60); // 60 seconds cooldown
    
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResetPassword = async () => {
    console.log('🔄 Starting password reset process...');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const trimmedEmail = email.toLowerCase().trim();
      console.log('📧 Sending reset request for:', trimmedEmail);
      
      const response = await ApiService.forgotPassword(trimmedEmail);
      
      if (response.success) {
        console.log('✅ Password reset request successful');
        setIsSubmitted(true);
        startResendCooldown();
        
        // Store the reset token if provided (for direct reset flow)
        if (response.resetToken) {
          setResetToken(response.resetToken);
        }
        
        // Call the callback if provided
        if (onResetPassword) {
          onResetPassword({ 
            email: trimmedEmail, 
            success: true,
            message: response.message,
            resetToken: response.resetToken
          });
        }
      } else {
        throw new Error(response.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      const errorMessage = ApiService.formatPasswordResetError(error);
      let fieldErrors = {};

      // Handle specific error cases
      if (error.message.includes('User not found') || 
          error.message.includes('No account') ||
          error.message.includes('not found')) {
        fieldErrors.email = "No account found with this email address";
      } else if (error.message.includes('rate limit') || error.message.includes('wait')) {
        fieldErrors.email = "Too many requests. Please wait before trying again.";
      } else if (error.message.includes('suspended')) {
        fieldErrors.email = "Account is suspended. Please contact support.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        Alert.alert(
          "Reset Request Failed", 
          errorMessage,
          [
            { text: "Try Again", style: "default" },
            { text: "Contact Support", onPress: () => {
              Alert.alert("Contact Support", "Please email support@klingo.com for assistance.");
            }},
            { text: "Back to Login", onPress: onBackToLogin, style: "cancel" }
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      const response = await ApiService.resendResetEmail(email.toLowerCase().trim());
      
      if (response.success) {
        startResendCooldown();
        Alert.alert(
          "Email Sent",
          "A new password reset link has been sent to your email.",
          [{ text: "OK" }]
        );
        
        // Update token if new one is provided
        if (response.resetToken) {
          setResetToken(response.resetToken);
        }
      }
    } catch (error) {
      console.error('❌ Resend email error:', error);
      Alert.alert(
        "Resend Failed",
        ApiService.formatPasswordResetError(error),
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectReset = () => {
    if (resetToken) {
      // Navigate directly to reset password with token
      onResetPassword({ 
        email: email,
        resetToken: resetToken,
        directReset: true
      });
    } else {
      Alert.alert(
        "Reset Token Missing",
        "Please check your email for the reset link or request a new one.",
        [{ text: "OK" }]
      );
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
          onChangeText={(text) => {
            onChangeText(text);
            // Clear error when user starts typing
            if (errors[options.errorKey]) {
              setErrors(prev => ({ ...prev, [options.errorKey]: null }));
            }
          }}
          editable={!isLoading && !isSubmitted}
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
        The link will expire in 1 hour for security reasons.
        {'\n\n'}
        If you don't see it, check your spam folder.
      </Text>
      
      {/* Action Buttons */}
      <View className="w-full">
        {/* Direct Reset Button (if token available) */}
        {resetToken && (
          <TouchableOpacity
            className="bg-green-600 rounded-xl py-4 mb-4 shadow-lg"
            onPress={handleDirectReset}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold text-center">
              Reset Password Now
            </Text>
          </TouchableOpacity>
        )}

        {/* Resend Email Button */}
        <TouchableOpacity
          className={`rounded-xl py-4 mb-4 shadow-sm border ${
            canResend && !isLoading
              ? 'bg-white border-green-600'
              : 'bg-gray-100 border-gray-300'
          }`}
          onPress={handleResendEmail}
          disabled={!canResend || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#10B981" />
              <Text className="text-green-600 text-base font-medium ml-2">
                Sending...
              </Text>
            </View>
          ) : (
            <Text className={`text-base font-medium text-center ${
              canResend ? 'text-green-600' : 'text-gray-500'
            }`}>
              {canResend 
                ? 'Resend Email' 
                : `Resend in ${resendCountdown}s`
              }
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 mb-4 shadow-lg"
          onPress={() => {
            setIsSubmitted(false);
            setEmail('');
            setErrors({});
            setCanResend(false);
            setResendCountdown(0);
            setResetToken(null);
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

      {/* Additional Help */}
      <View className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <View className="flex-row items-start">
          <Ionicons name="help-circle" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
          <View className="flex-1">
            <Text className="text-sm text-blue-800 font-medium mb-1">
              Need Help?
            </Text>
            <Text className="text-sm text-blue-700 leading-5">
              • Check your spam/junk folder{'\n'}
              • Make sure you entered the correct email{'\n'}
              • Contact support@klingo.com for assistance{'\n'}
              • The reset link expires in 1 hour
            </Text>
          </View>
        </View>
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
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-12">
          {/* Header with Back Button */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity 
              className="p-2 -ml-2"
              onPress={onBackToLogin}
              disabled={isLoading}
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
              No worries! Enter your email address and we'll help you reset your password
            </Text>
          </View>

          {/* Reset Form */}
          <View className="flex-1 justify-center">
            {renderInput(
              "Email Address",
              email,
              setEmail,
              "Enter your registered email address",
              {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoComplete: 'email',
                errorKey: 'email',
                maxLength: 100,
                returnKeyType: 'done',
                onSubmitEditing: handleResetPassword,
              }
            )}

            {/* Reset Button */}
            <TouchableOpacity
              className={`rounded-xl py-4 mb-6 shadow-lg ${
                isLoading ? 'bg-green-400' : 'bg-green-600'
              }`}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isLoading || !email.trim()}
            >
              <View className="flex-row items-center justify-center">
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white text-lg font-semibold ml-2">
                      Sending Reset Link...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="mail" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white text-lg font-semibold">
                      Send Reset Link
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Info Box */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm text-blue-800 font-medium mb-1">
                    What Happens Next?
                  </Text>
                  <Text className="text-sm text-blue-700 leading-5">
                    1. We'll send a secure reset link to your email{'\n'}
                    2. Click the link to create a new password{'\n'}
                    3. The link expires in 1 hour for security{'\n'}
                    4. Check your spam folder if you don't see it
                  </Text>
                </View>
              </View>
            </View>

            {/* Security Notice */}
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
              <View className="flex-row items-start">
                <Ionicons name="shield-checkmark" size={20} color="#F59E0B" style={{ marginRight: 8, marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm text-amber-800 font-medium mb-1">
                    Security Notice
                  </Text>
                  <Text className="text-sm text-amber-700 leading-5">
                    For your security, we'll only send reset links to registered email addresses. 
                    If you don't receive an email, the address may not be in our system.
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
              disabled={isLoading}
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