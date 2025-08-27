import { useState, useEffect } from 'react';
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

// Success Modal Component
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
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {title}
            </Text>
            <Text className="text-base text-gray-600 text-center leading-relaxed">
              {message}
            </Text>
          </View>
          
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

// Password Strength Indicator
const PasswordStrengthIndicator = ({ password }) => {
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '#E5E7EB' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score <= 2) return { score, label: 'Weak', color: '#EF4444', checks };
    if (score <= 3) return { score, label: 'Fair', color: '#F59E0B', checks };
    if (score <= 4) return { score, label: 'Good', color: '#10B981', checks };
    return { score, label: 'Strong', color: '#059669', checks };
  };

  const strength = getPasswordStrength(password);
  
  if (!password) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-gray-600">Password Strength</Text>
        <Text className={`text-sm font-medium`} style={{ color: strength.color }}>
          {strength.label}
        </Text>
      </View>
      
      <View className="flex-row space-x-1 mb-3">
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            className="flex-1 h-2 rounded-full"
            style={{
              backgroundColor: level <= strength.score ? strength.color : '#E5E7EB'
            }}
          />
        ))}
      </View>
      
      <View className="space-y-1">
        {Object.entries({
          length: 'At least 8 characters',
          lowercase: 'One lowercase letter',
          uppercase: 'One uppercase letter', 
          number: 'One number',
          special: 'One special character'
        }).map(([key, label]) => (
          <View key={key} className="flex-row items-center">
            <Ionicons 
              name={strength.checks?.[key] ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={strength.checks?.[key] ? "#10B981" : "#9CA3AF"}
              style={{ marginRight: 6 }}
            />
            <Text className={`text-xs ${strength.checks?.[key] ? 'text-green-600' : 'text-gray-500'}`}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Error Modal Component
const ErrorModal = ({ visible, onClose, title, message, buttonText = "Try Again" }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="close-circle" size={40} color="#EF4444" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {title}
            </Text>
            <Text className="text-base text-gray-600 text-center leading-relaxed">
              {message}
            </Text>
          </View>
          
          <TouchableOpacity
            className="bg-red-600 rounded-xl py-4 shadow-lg"
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

// Main Reset Password Component
function ResetPassword({ 
  resetToken, 
  onLogin = () => {}, 
  onBackToLogin = () => {} 
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successData, setSuccessData] = useState({ title: '', message: '', user: null });
  const [errorData, setErrorData] = useState({ title: '', message: '' });

  useEffect(() => {
    if (resetToken) {
      verifyToken();
    } else {
      setIsTokenValid(false);
      setTokenLoading(false);
    }
  }, [resetToken]);

  const verifyToken = async () => {
    console.log('Verifying reset token...');
    setTokenLoading(true);
    
    try {
      const response = await ApiService.verifyResetToken(resetToken);
      
      if (response.valid) {
        console.log('Reset token is valid');
        setIsTokenValid(true);
        setUserEmail(response.email || '');
      } else {
        console.log('Reset token is invalid');
        setIsTokenValid(false);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setIsTokenValid(false);
      
      if (error.message.includes('expired')) {
        setErrorData({
          title: "Link Expired",
          message: "This password reset link has expired. Please request a new one."
        });
        setShowErrorModal(true);
      } else if (error.message.includes('invalid')) {
        setErrorData({
          title: "Invalid Link",
          message: "This password reset link is invalid. Please request a new one."
        });
        setShowErrorModal(true);
      }
    } finally {
      setTokenLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = "New password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (password.length > 50) {
      newErrors.password = "Password must be less than 50 characters";
    } else {
      const hasLowerCase = /[a-z]/.test(password);
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!hasLowerCase || !hasUpperCase || !hasNumbers) {
        newErrors.password = "Password must contain uppercase, lowercase letters and numbers";
      }
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    console.log('Starting password reset...');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log('Sending password reset request...');
      const response = await ApiService.resetPassword(resetToken, password);
      
      if (response.success) {
        console.log('Password reset successful');
        
        setSuccessData({
          title: "Password Reset Successful!",
          message: "Your password has been successfully updated. You can now sign in with your new password.",
          user: response.user
        });
        setShowSuccessModal(true);
        
        if (response.token) {
          await AsyncStorage.setItem('userToken', response.token);
          if (response.user) {
            await AsyncStorage.setItem('userData', JSON.stringify(response.user));
          }
        }
      } else {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      
      const errorMessage = ApiService.formatPasswordResetError(error);
      let fieldErrors = {};
      
      if (error.message.includes('expired')) {
        setErrorData({
          title: "Link Expired",
          message: "This password reset link has expired. Please request a new one."
        });
        setShowErrorModal(true);
        return;
      } else if (error.message.includes('invalid') || error.message.includes('token')) {
        setErrorData({
          title: "Invalid Link",
          message: "This password reset link is invalid. Please request a new one."
        });
        setShowErrorModal(true);
        return;
      } else if (error.message.includes('weak')) {
        fieldErrors.password = "Password is too weak. Please use a stronger password.";
      } else if (error.message.includes('same')) {
        fieldErrors.password = "New password must be different from your current password.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setErrorData({
          title: "Reset Failed",
          message: errorMessage
        });
        setShowErrorModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (successData.user) {
      onLogin(successData.user);
    } else {
      onBackToLogin();
    }
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
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
            if (errors[options.errorKey]) {
              setErrors(prev => ({ ...prev, [options.errorKey]: null }));
            }
          }}
          editable={!isLoading}
          {...options}
        />
        {options.showToggle && (
          <TouchableOpacity
            onPress={options.onToggle}
            className="ml-3"
            disabled={isLoading}
          >
            <Ionicons 
              name={options.isVisible ? "eye-off" : "eye"} 
              size={20} 
              color={isLoading ? "#9CA3AF" : "#10B981"} 
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

  if (tokenLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-gray-600 mt-4 text-base">
          Verifying reset link...
        </Text>
        <Text className="text-gray-500 mt-2 text-sm text-center px-8">
          Please wait while we verify your password reset link
        </Text>
      </View>
    );
  }

  if (isTokenValid === false) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="close-circle" size={48} color="#EF4444" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Invalid Reset Link
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8 leading-relaxed">
            This password reset link is invalid or has expired. 
            Please request a new password reset link to continue.
          </Text>
        </View>
        
        <View className="w-full">
          <TouchableOpacity
            className="bg-green-600 rounded-xl py-4 mb-4 shadow-lg"
            onPress={onBackToLogin}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold text-center">
              Request New Link
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-white border border-gray-300 rounded-xl py-4 shadow-sm"
            onPress={onBackToLogin}
            activeOpacity={0.8}
          >
            <Text className="text-gray-700 text-lg font-semibold text-center">
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
          <View className="flex-row items-center mb-8">
            <TouchableOpacity 
              className="p-2 -ml-2"
              onPress={onBackToLogin}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="items-center mb-10">
            <View className="mb-6">
              <Image
                source={require("../assets/images/klingo-logo.png")}
                className="w-20 h-20"
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Create New Password
            </Text>
            <Text className="text-base text-gray-600 text-center px-4">
              Choose a strong password for your account
              {userEmail && (
                <Text className="font-medium text-green-600">
                  {'\n'}{userEmail}
                </Text>
              )}
            </Text>
          </View>

          <View className="flex-1 justify-center">
            {renderInput(
              "New Password",
              password,
              setPassword,
              "Create your new password",
              {
                secureTextEntry: !showPassword,
                showToggle: true,
                isVisible: showPassword,
                onToggle: () => setShowPassword(!showPassword),
                errorKey: 'password',
                maxLength: 50,
                returnKeyType: 'next',
              }
            )}

            <PasswordStrengthIndicator password={password} />

            {renderInput(
              "Confirm New Password",
              confirmPassword,
              setConfirmPassword,
              "Confirm your new password",
              {
                secureTextEntry: !showConfirmPassword,
                showToggle: true,
                isVisible: showConfirmPassword,
                onToggle: () => setShowConfirmPassword(!showConfirmPassword),
                errorKey: 'confirmPassword',
                maxLength: 50,
                returnKeyType: 'done',
                onSubmitEditing: handleResetPassword,
              }
            )}

            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <View className="flex-row items-start">
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm text-blue-800 font-medium mb-1">
                    Password Security Tips
                  </Text>
                  <Text className="text-sm text-blue-700 leading-5">
                    • Use a mix of letters, numbers, and symbols{'\n'}
                    • Avoid common words or personal information{'\n'}
                    • Make it at least 8 characters long{'\n'}
                    • Don't reuse passwords from other accounts
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              className={`rounded-xl py-4 mb-6 shadow-lg ${
                isLoading ? 'bg-green-400' : 'bg-green-600'
              }`}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isLoading || !password || !confirmPassword}
            >
              <View className="flex-row items-center justify-center">
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white text-lg font-semibold ml-2">
                      Updating Password...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="key" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white text-lg font-semibold">
                      Update Password
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

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

      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        title={successData.title}
        message={successData.message}
        buttonText="Continue to Login"
      />

      <ErrorModal
        visible={showErrorModal}
        onClose={handleErrorModalClose}
        title={errorData.title}
        message={errorData.message}
        buttonText="Close"
      />
    </KeyboardAvoidingView>
  );
}

export default ResetPassword;