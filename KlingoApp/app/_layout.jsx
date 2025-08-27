import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import "../global.css";
import Splash from "./splash";
import Onboarding from "./onboarding";
import Login from "./login";
import SignUp from "./signup";
import ForgotPassword from "./forgot-password";
import RequestCleanup from "./request-cleanup";
import HomeScreen from "./(tabs)/home";
import ProfileScreen from "../app/(tabs)/profile";
import SettingsScreen from "../app/(tabs)//settings";

// Loading Component
function LoadingScreen({ message = "Loading..." }) {
  return (
    <View className='flex-1 bg-white items-center justify-center'>
      <View className='items-center'>
        {/* Loading Spinner with Green Color */}
        <ActivityIndicator size='large' color='#16a34a' />

        {/* Loading Icon Animation */}
        <View className='mt-4 mb-6'>
          <Ionicons name='leaf' size={48} color='#10B981' />
        </View>

        {/* Loading Text */}
        <Text className='text-lg font-semibold text-gray-900 mb-2'>
          {message}
        </Text>
        <Text className='text-sm text-gray-600 text-center px-8'>
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
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Reset email sent successfully");
    } catch (error) {
      console.error("Failed to send reset email:", error);
      throw error;
    }
  };

  // Logout functionality
  const handleLogout = async () => {
    try {
      setIsLoading(true);

      // Clear user data
      setCurrentUser(null);

      // Here you can add additional cleanup:
      // - Clear AsyncStorage
      // - Clear any cached data
      // - Reset any global state
      // - Cancel ongoing requests

      // Simulate logout process (remove in production or replace with actual logout API call)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("User logged out successfully");

      // Navigate to login screen
      setCurrentScreen("login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCleanup = async () => {
    try {
      // Show loading state
      setIsLoading(true);

      // Simulate loading time (you can remove this in production or replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1500));

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

  const handleBackToHomeFromProfile = () => {
    setCurrentScreen("home");
  };

  const handleBackToHomeFromSettings = () => {
    setCurrentScreen("home");
  };

  const handleProfileUpdate = (updatedUser) => {
    // Update the current user data with the new profile information
    setCurrentUser(updatedUser);
  };

  const handlePasswordChanged = () => {
    // Handle password change success - could show a notification or update UI
    console.log("Password changed successfully");
  };

  const handleSubmitCleanupRequest = async (requestData) => {
    try {
      setIsLoading(true);

      // Here you would typically send the data to your API
      console.log("Cleanup request submitted:", requestData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate back to home after successful submission
      setCurrentScreen("home");
    } catch (error) {
      console.error("Failed to submit cleanup request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers for profile menu items
  const handleNavigateToProfile = () => {
    setCurrentScreen("profile");
  };

  const handleNavigateToSettings = () => {
    setCurrentScreen("settings");
  };

  // Show loading screen when loading
  if (isLoading) {
    let loadingMessage = "Loading...";

    if (currentScreen === "requestCleanup") {
      loadingMessage = "Preparing Request Form...";
    } else if (currentScreen === "login" && !currentUser) {
      loadingMessage = "Logging out...";
    }

    return <LoadingScreen message={loadingMessage} />;
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

  // Render settings screen
  if (currentScreen === "settings") {
    return (
      <SettingsScreen
        user={currentUser}
        onBack={handleBackToHomeFromSettings}
        onPasswordChanged={handlePasswordChanged}
        onLogout={handleLogout}
      />
    );
  }

  // Render profile screen
  if (currentScreen === "profile") {
    return (
      <ProfileScreen
        user={currentUser}
        onBack={handleBackToHomeFromProfile}
        onProfileUpdate={handleProfileUpdate}
      />
    );
  }

  // Render home screen
  if (currentScreen === "home") {
    return (
      <HomeScreen
        user={currentUser}
        onRequestCleanup={handleRequestCleanup}
        onLogout={handleLogout}
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToSettings={handleNavigateToSettings}
      />
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}

export default RootLayout;
