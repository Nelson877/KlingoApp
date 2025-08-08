import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import "../global.css";
import Splash from "./splash";
import Onboarding from "./onboarding";
import Login from "./login";
import SignUp from "./signup";
import ForgotPassword from "./forgot-password";
import RequestCleanup from "./request-cleanup";
import HomeScreen from "./(tabs)/home";

// Loading Component
function LoadingScreen({ message = "Loading..." }) {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <View className="items-center">
        {/* Loading Spinner with Green Color */}
        <ActivityIndicator size="large" color="#10B981" />
        
        {/* Loading Icon Animation */}
        <View className="mt-4 mb-6">
          <Ionicons name="leaf" size={48} color="#10B981" />
        </View>
        
        {/* Loading Text */}
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          {message}
        </Text>
        <Text className="text-sm text-gray-600 text-center px-8">
          Please wait while we prepare your cleanup request form
        </Text>
      </View>
    </View>
  );
}

function RootLayout() {
  const [currentScreen, setCurrentScreen] = useState("splash");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen("onboarding");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    setCurrentScreen("login");
  };

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setCurrentScreen("home");
  };

  const handleNavigateToSignup = () => {
    setCurrentScreen("signup");
  };

  const handleNavigateToLogin = () => {
    setCurrentScreen("login");
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen("forgotPassword");
  };

  const handleSignUp = (userData) => {
    setCurrentUser(userData);
    setCurrentScreen("home");
  };

  const handleResetPassword = async (resetData) => {
    // Handle password reset logic here
    console.log("Password reset requested for:", resetData.email);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Reset email sent successfully");
    } catch (error) {
      console.error("Failed to send reset email:", error);
      throw error;
    }
  };

  const handleRequestCleanup = async () => {
    try {
      // Show loading state
      setIsLoading(true);
      
      // Simulate loading time (you can remove this in production or replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to request cleanup screen
      setCurrentScreen("requestCleanup");
    } catch (error) {
      console.error("Failed to navigate to request cleanup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentScreen("home");
  };

  const handleSubmitCleanupRequest = async (requestData) => {
    try {
      setIsLoading(true);
      
      // Here you would typically send the data to your API
      console.log("Cleanup request submitted:", requestData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate back to home after successful submission
      setCurrentScreen("home");
    } catch (error) {
      console.error("Failed to submit cleanup request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen when loading
  if (isLoading) {
    return <LoadingScreen message="Preparing Request Form..." />;
  }

  // Render splash
  if (currentScreen === "splash") {
    return <Splash />;
  }

  // Render onboarding
  if (currentScreen === "onboarding") {
    return <Onboarding onGetStarted={handleGetStarted} />;
  }

  // Render login
  if (currentScreen === "login") {
    return (
      <Login
        onLogin={handleLogin}
        onNavigateToSignup={handleNavigateToSignup}
        onNavigateToForgotPassword={handleNavigateToForgotPassword}
      />
    );
  }

  // Render signup
  if (currentScreen === "signup") {
    return (
      <SignUp
        onSignUp={handleSignUp}
        onNavigateToLogin={handleNavigateToLogin}
      />
    );
  }

  // Render forgot password
  if (currentScreen === "forgotPassword") {
    return (
      <ForgotPassword
        onBackToLogin={handleNavigateToLogin}
        onResetPassword={handleResetPassword}
      />
    );
  }

  // Render request cleanup
  if (currentScreen === "requestCleanup") {
    return (
      <RequestCleanup
        onBack={handleBackToHome}
        onSubmitRequest={handleSubmitCleanupRequest}
      />
    );
  }

  // Render home screen
  if (currentScreen === "home") {
    return (
      <HomeScreen
        user={currentUser}
        onRequestCleanup={handleRequestCleanup}
      />
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}

export default RootLayout;