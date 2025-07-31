import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';

function Splash() {
  return (
    <View className="flex-1 bg-white justify-center items-center px-8">
      {/* Logo */}
      <Image 
          source={require('../assets/images/klingo-logo.png')} 
        className="w-64 h-64 mb-8"
        resizeMode="contain"
      />
      
      {/* Tagline */}
      <Text className="text-xl text-gray-600 text-center font-medium">
        Specialized Event
      </Text>
      <Text className="text-xl text-gray-600 text-center font-medium mb-16">
        Cleanup. On-Demand.
      </Text>

      {/* Loading Indicator */}
      <View className="items-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="text-sm text-gray-500 mt-4">
          Loading...
        </Text>
      </View>
    </View>
  );
}

export default Splash;