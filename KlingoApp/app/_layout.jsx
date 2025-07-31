import React, { useState, useEffect } from "react";
import "../global.css";
import { Text, View } from "react-native";
import Splash from "./splash";
import Onboarding from "./onboarding";
import Login from "./login";

function RootLayout() {
  const [currentScreen, setCurrentScreen] = useState("splash");

  useEffect(() => {
    // Show splash for 3 seconds, then move to onboarding
    const timer = setTimeout(() => {
      setCurrentScreen("onboarding");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Handle moving from onboarding to login
  const handleGetStarted = () => {
    setCurrentScreen("login");
  };

  // Handle moving from login to home
  const handleLogin = () => {
    setCurrentScreen("home");
  };

  // Render different screens based on current state
  if (currentScreen === "splash") {
    return <Splash />;
  }

  if (currentScreen === "onboarding") {
    return <Onboarding onGetStarted={handleGetStarted} />;
  }

  if (currentScreen === "login") {
    return <Login onLogin={handleLogin} />;
  }

  // Home screen (your original content)
  return (
    <View className='flex-1 justify-center items-center bg-slate-50 px-6 py-8'>
      <View className='bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm'>
        <Image
          source={require("../assets/images/klingo-logo.png")}
          className='w-32 h-32 mb-4'
          resizeMode='contain'
        />

        <Text className='text-lg text-slate-600 text-center mb-6 font-light'>
          Welcome to KLINGO
        </Text>
      </View>
    </View>
  );
}

export default RootLayout;
