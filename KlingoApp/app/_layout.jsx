import React, { useState, useEffect } from 'react';
import "../global.css";
import { Text, View } from "react-native";
import Splash from './splash';
import Onboarding from './onboarding';
import Login from './login'; 

function RootLayout() {
  const [currentScreen, setCurrentScreen] = useState('splash');

  useEffect(() => {
    // Show splash for 3 seconds, then move to onboarding
    const timer = setTimeout(() => {
      setCurrentScreen('onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Handle moving from onboarding to login
  const handleGetStarted = () => {
    setCurrentScreen('login');
  };

  // Handle moving from login to home
  const handleLogin = () => {
    setCurrentScreen('home');
  };

  // Render different screens based on current state
  if (currentScreen === 'splash') {
    return <Splash />;
  }

  if (currentScreen === 'onboarding') {
    return <Onboarding onGetStarted={handleGetStarted} />;
  }

  if (currentScreen === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  // Home screen (your original content)
  return (
    <View className="flex-1 justify-center items-center bg-slate-50 px-6 py-8">
      <View className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <Text className="text-4xl font-bold text-green-600 text-center mb-2">
          KLINGO
        </Text>
        
        <Text className="text-lg text-slate-600 text-center mb-6 font-light">
          Welcome to KLINGO
        </Text>
        
        <View className="h-1 w-16 bg-green-600 rounded-full mx-auto mb-6" />
        
        <Text className="text-base text-slate-700 text-center leading-6 opacity-80">
          Your specialized event cleanup service is ready!
        </Text>
        
        <View className="flex-row justify-center mt-6 space-x-2">
          <View className="w-2 h-2 bg-green-600 rounded-full" />
          <View className="w-2 h-2 bg-green-400 rounded-full" />
          <View className="w-2 h-2 bg-green-200 rounded-full" />
        </View>
      </View>
      
      <View className="mt-8 px-4">
        <Text className="text-sm text-slate-500 text-center">
          Powered by React dziknel_dev
        </Text>
      </View>
    </View>
  );
}

export default RootLayout;