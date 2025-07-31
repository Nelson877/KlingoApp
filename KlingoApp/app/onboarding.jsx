import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";

function Onboarding({ onGetStarted }) {
  return (
    <View className='flex-1 bg-white px-8 py-12'>
      {/* Logo at top */}
      <View className='items-center mb-9'>
        <Image
          source={require("../assets/images/klingo-logo.png")}
          className='w-36 h-36'
          resizeMode='contain'
        />
      </View>

      {/* Main Content */}
      <View className='flex-1 justify-center px-4'>
        {/* Eco-Friendly Section */}
        <View className='flex-row items-center mb-16'>
          <Image
            source={require("../assets/images/eco-friendly.png")}
            className='w-30 h-30 mr-6'
            resizeMode='contain'
          />
          <View className='flex-1'>
            <Text className='text-xl font-semibold text-gray-800'>
              Eco-Friendly
            </Text>
            <Text className='text-xl font-semibold text-gray-800'>Cleanup</Text>
          </View>
        </View>

        {/* Professional Crew Section */}
        <View className='flex-row items-center mb-16'>
          <View className='flex-1'>
            <Text className='text-xl font-semibold text-gray-800'>
              Professional,
            </Text>
            <Text className='text-xl font-semibold text-gray-800'>
              Trained Crew
            </Text>
          </View>
          <Image
            source={require("../assets/images/professional-crew.png")}
            className='w-30 h-30  mr-6'
            resizeMode='contain'
          />
        </View>

        {/* App-Powered Scheduling Section */}
        <View className='flex-row items-center mb-16'>
          <Image
            source={require("../assets/images/app-scheduling.png")}
            className='w-30 h-30  mr-6'
            resizeMode='contain'
          />
          <View className='flex-1'>
            <Text className='text-xl font-semibold text-gray-800'>
              App-Powered
            </Text>
            <Text className='text-xl font-semibold text-gray-800'>
              Scheduling
            </Text>
          </View>
        </View>
      </View>

      {/* Get Started Button */}
      <TouchableOpacity
        className='bg-green-600 rounded-xl py-4 px-8 mx-4'
        onPress={onGetStarted}
      >
        <Text className='text-white text-lg font-semibold text-center'>
          Get Started
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default Onboarding;
