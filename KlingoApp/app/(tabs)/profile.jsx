import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../services/apiService';

function ProfileScreen({ user, onBack, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });

  // Original data to compare changes
  const [originalData, setOriginalData] = useState({
    name: user?.name || user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });

  useEffect(() => {
    if (user) {
      const userData = {
        name: user.name || user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
      };
      setFormData(userData);
      setOriginalData(userData);
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailError = ApiService.validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      return false;
    }

    if (formData.phone && formData.phone.length > 0) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]{8,15}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        setError('Please enter a valid phone number');
        return false;
      }
    }

    return true;
  };

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!hasChanges()) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim() || 'Not specified',
      };

      // Call API to update user profile
      const response = await ApiService.updateUser(user.id, updateData);
      
      // Update original data
      const updatedData = {
        ...formData,
        name: updateData.name,
        phone: updateData.phone,
        location: updateData.location,
      };
      
      setOriginalData(updatedData);
      setIsEditing(false);
      setShowSuccessModal(true);

      // Notify parent component about the update
      if (onProfileUpdate) {
        onProfileUpdate({
          ...user,
          ...updatedData,
          fullName: updateData.name,
        });
      }

    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              setFormData(originalData);
              setError('');
              setIsEditing(false);
            }
          },
        ]
      );
    } else {
      setIsEditing(false);
      setError('');
    }
  };

  const renderProfileField = (label, value, field, placeholder, keyboardType = 'default', editable = true) => {
    if (!isEditing) {
      return (
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-600 mb-2">{label}</Text>
          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="text-base text-gray-900">
              {value || 'Not specified'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-600 mb-2">{label}</Text>
        <TextInput
          className="bg-white rounded-xl p-4 border border-gray-200 text-base text-gray-900"
          value={value}
          placeholder={placeholder}
          keyboardType={keyboardType}
          editable={editable}
          onChangeText={(text) => handleInputChange(field, text)}
          placeholderTextColor="#9CA3AF"
        />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={onBack}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-xl font-bold text-gray-900">Profile</Text>
            
            <View className="w-10 h-10" />
          </View>

          {/* Profile Avatar */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="person" size={40} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center">
              {user?.name || user?.fullName || 'User'}
            </Text>
            <Text className="text-sm text-gray-600 text-center mt-1">
              Member since {user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text className="text-red-700 ml-2 flex-1">{error}</Text>
              </View>
            </View>
          ) : null}

          {/* Profile Fields */}
          <View className="mb-6">
            {renderProfileField(
              'Full Name',
              formData.name,
              'name',
              'Enter your full name'
            )}

            {renderProfileField(
              'Email Address',
              formData.email,
              'email',
              'Enter your email',
              'email-address',
              false // Email is not editable for now
            )}

            {renderProfileField(
              'Phone Number',
              formData.phone,
              'phone',
              'Enter your phone number',
              'phone-pad'
            )}

            {renderProfileField(
              'Location',
              formData.location,
              'location',
              'Enter your location'
            )}
          </View>

          {/* Account Stats */}
          {!isEditing && (
            <View className="bg-green-50 rounded-xl p-4 mb-6">
              <Text className="text-base font-semibold text-green-900 mb-3">
                Account Statistics
              </Text>
              <View className="flex-row justify-between">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-green-600">
                    {user?.requestsCount || 0}
                  </Text>
                  <Text className="text-sm text-green-700">Requests</Text>
                </View>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-green-600">
                    {user?.status === 'active' ? 'Active' : user?.status || 'N/A'}
                  </Text>
                  <Text className="text-sm text-green-700">Status</Text>
                </View>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-green-600">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text className="text-sm text-green-700">Last Login</Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          {!isEditing ? (
            <TouchableOpacity
              className="bg-green-600 rounded-xl py-4 px-6"
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="create-outline" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">
                  Edit Profile
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="space-y-3">
              <TouchableOpacity
                className={`rounded-xl py-4 px-6 ${
                  isSaving ? 'bg-gray-400' : 'bg-green-600'
                }`}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                  <Text className="text-white text-base font-semibold ml-2">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-gray-100 rounded-xl py-4 px-6"
                onPress={handleCancel}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-base font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                Profile Updated
              </Text>
              <Text className="text-base text-gray-600 text-center">
                Your profile has been successfully updated.
              </Text>
            </View>
            
            <TouchableOpacity
              className="bg-green-600 rounded-xl py-4 px-6"
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-semibold text-center">
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ProfileScreen;