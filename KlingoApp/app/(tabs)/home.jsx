import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function HomeScreen({ user, onRequestCleanup, onLogout, onNavigateToProfile, onNavigateToSettings }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
    // Ensure user stays on home screen and profile menu is properly closed
    setShowProfileMenu(false);
  };

  // Handle profile navigation
  const handleProfilePress = () => {
    setShowProfileMenu(false);
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      console.log('Navigate to Profile - No handler provided');
    }
  };

  // Handle settings navigation
  const handleSettingsPress = () => {
    setShowProfileMenu(false);
    if (onNavigateToSettings) {
      onNavigateToSettings();
    } else {
      console.log('Navigate to Settings - No handler provided');
    }
  };

  // Mock data - in real app this would come from props/API
  const upcomingCleanup = {
    id: 1,
    title: 'Spring Cleanup',
    date: '12 Aug 9:16pm',
    status: 'upcoming'
  };

  const hasUpcomingCleanup = upcomingCleanup;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        onScroll={() => {
          setShowProfileMenu(false);
          setShowLogoutModal(false);
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View className="px-6 pt-4">
          {/* Greeting and Profile */}
          <View className="flex-row justify-between items-center mb-1 relative">
            <View>
              <Text className="text-base text-gray-600">
                {getGreeting()},
              </Text>
            </View>
            <View>
              <TouchableOpacity 
                className="w-10 h-10 bg-green-100 rounded-full items-center justify-center"
                onPress={() => setShowProfileMenu(!showProfileMenu)}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={20} color="#10B981" />
              </TouchableOpacity>
              
              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <View className="absolute top-12 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 w-40 z-10">
                  <TouchableOpacity
                    className="px-4 py-3 flex-row items-center"
                    onPress={handleProfilePress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-outline" size={18} color="#6B7280" />
                    <Text className="text-gray-700 ml-3 text-base">Profile</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="px-4 py-3 flex-row items-center"
                    onPress={handleSettingsPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={18} color="#6B7280" />
                    <Text className="text-gray-700 ml-3 text-base">Settings</Text>
                  </TouchableOpacity>
                  
                  <View className="border-t border-gray-200 my-1" />
                  
                  <TouchableOpacity
                    className="px-4 py-3 flex-row items-center"
                    onPress={handleLogout}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    <Text className="text-red-500 ml-3 text-base">Logout</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Home Title */}
          <Text className="text-3xl font-bold text-gray-900 mb-8">
            Home
          </Text>

          {/* Request Cleanup - Main Action */}
          <TouchableOpacity
            className="bg-green-600 rounded-xl py-6 px-6 mb-8 shadow-lg"
            onPress={onRequestCleanup}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text className="text-white text-lg font-semibold ml-2">
                Request Cleanup
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Cleanup Status */}
          {hasUpcomingCleanup ? (
            <TouchableOpacity
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-blue-600 font-medium mb-1">
                    Next Cleanup
                  </Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {upcomingCleanup.title}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {upcomingCleanup.date}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-sm text-blue-600 font-medium mr-2">
                    View All
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="bg-gray-50 rounded-xl p-4 mb-8">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={24} color="#6B7280" />
                <View className="flex-1 ml-3">
                  <Text className="text-base font-medium text-gray-900">
                    No upcoming cleanups
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Ready to schedule your next cleanup?
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Stats */}
          <View className="flex-row mb-8">
            <View className="flex-1 bg-orange-50 rounded-xl p-4 mr-2">
              <View className="flex-row items-center mb-2">
                <Ionicons name="hourglass-outline" size={20} color="#F97316" />
                <Text className="text-sm font-medium text-orange-700 ml-2">
                  Pending
                </Text>
              </View>
              <Text className="text-2xl font-bold text-orange-600">
                1 Request
              </Text>
            </View>
            
            <View className="flex-1 bg-green-50 rounded-xl p-4 ml-2">
              <View className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                <Text className="text-sm font-medium text-green-700 ml-2">
                  Completed
                </Text>
              </View>
              <Text className="text-2xl font-bold text-green-600">
                5 Jobs
              </Text>
            </View>
          </View>

          {/* Eco Tip Section */}
          <View className="bg-green-50 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <View className="w-10 h-10 bg-green-600 rounded-lg items-center justify-center mr-3">
                <Ionicons name="leaf" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-green-900 mb-2">
                  Eco Tip of the Day
                </Text>
                <Text className="text-sm text-green-700 leading-5">
                  Use reusable cups instead of disposable ones to reduce waste.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 items-center justify-center px-6"
          activeOpacity={1}
          onPress={cancelLogout}
        >
          <TouchableOpacity 
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            activeOpacity={1}
            onPress={() => {}} // Prevent modal from closing when touching the modal content
          >
            {/* Modal Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="log-out-outline" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                Confirm Logout
              </Text>
            </View>

            {/* Modal Body */}
            <Text className="text-base text-gray-600 text-center mb-8 leading-6">
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </Text>

            {/* Modal Buttons */}
            <View className="space-y-3">
              {/* Logout Button */}
              <TouchableOpacity
                className="bg-red-600 rounded-xl py-4 px-6"
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-semibold text-center">
                  Yes, Logout
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                className="bg-gray-100 rounded-xl py-4 px-6"
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-base font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default HomeScreen;