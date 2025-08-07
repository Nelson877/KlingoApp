import React, { useState, useEffect } from "react";
import "../global.css";
import Splash from "./splash";
import Onboarding from "./onboarding";
import Login from "./login";
import SignUp from "./signup";
import ForgotPassword from "./forgot-password";
import HomeScreen from "./(tabs)/home";

function RootLayout() {
  const [currentScreen, setCurrentScreen] = useState("splash");
  const [currentUser, setCurrentUser] = useState(null);

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
    // This could be an API call to send reset email
    console.log("Password reset requested for:", resetData.email);
    
    // Simulate API call
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Reset email sent successfully");
    } catch (error) {
      console.error("Failed to send reset email:", error);
      throw error;
    }
  };

  const handleRequestCleanup = () => {
    // Navigate to request cleanup screen
    // For now, just show an alert or console log
    console.log("Request Cleanup pressed");
    // Later you can add: setCurrentScreen("requestCleanup");
  };

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