import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../services/apiService';

function SettingsScreen({ user, onBack, onPasswordChanged, onLogout }) {
  const [settings, setSettings] = useState({
    notifications: {
      pushNotifications: true,
      emailNotifications: true,
      requestUpdates: true,
      promotionalEmails: false,
    },
    privacy: {
      shareLocation: true,
      profileVisibility: true,
    },
    app: {
      darkMode: false,
      language: 'English',
      autoSync: true,
    }
  });


  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateSetting = (category, key, value) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError('');

      await ApiService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      // Reset form
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
      
      // Show success message
      Alert.alert(
        'Password Changed',
        'Your password has been successfully updated.',
        [{ text: 'OK' }]
      );

      if (onPasswordChanged) {
        onPasswordChanged();
      }

    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation.toLowerCase() !== 'delete') {
      Alert.alert('Confirmation Required', 'Please type "DELETE" to confirm account deletion');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Your account and all data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteUser(user.id);
              await ApiService.clearStorage();
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
            }
          }
        }
      ]
    );
  };

  const renderSettingItem = (title, subtitle, value, onValueChange, type = 'switch') => {
    return (
      <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
        <View className="flex-1 mr-4">
          <Text className="text-base font-medium text-gray-900">{title}</Text>
          {subtitle && (
            <Text className="text-sm text-gray-600 mt-1">{subtitle}</Text>
          )}
        </View>
        {type === 'switch' && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
          />
        )}
        {type === 'arrow' && (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )}
      </View>
    );
  };

  const renderSection = (title, icon, children) => {
    return (
      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
            <Ionicons name={icon} size={18} color="#10B981" />
          </View>
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        </View>
        <View className="bg-white rounded-xl shadow-sm border border-gray-100">
          <View className="px-4">
            {children}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="gray-50" />
      
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6 bg-white shadow-sm">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={onBack}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-xl font-bold text-gray-900">Settings</Text>
            
            <View className="w-10 h-10" />
          </View>
        </View>

        <View className="px-6 pt-6">
          {/* Notifications Section */}
          {renderSection('Notifications', 'notifications-outline', (
            <>
              {renderSettingItem(
                'Push Notifications',
                'Receive notifications on your device',
                settings.notifications.pushNotifications,
                (value) => updateSetting('notifications', 'pushNotifications', value)
              )}
              {renderSettingItem(
                'Email Notifications',
                'Receive updates via email',
                settings.notifications.emailNotifications,
                (value) => updateSetting('notifications', 'emailNotifications', value)
              )}
              {renderSettingItem(
                'Request Updates',
                'Get notified about your cleanup requests',
                settings.notifications.requestUpdates,
                (value) => updateSetting('notifications', 'requestUpdates', value)
              )}
              {renderSettingItem(
                'Promotional Emails',
                'Receive offers and news',
                settings.notifications.promotionalEmails,
                (value) => updateSetting('notifications', 'promotionalEmails', value)
              )}
            </>
          ))}

          {/* Privacy Section */}
          {renderSection('Privacy', 'shield-checkmark-outline', (
            <>
              {renderSettingItem(
                'Share Location',
                'Allow location sharing for better service',
                settings.privacy.shareLocation,
                (value) => updateSetting('privacy', 'shareLocation', value)
              )}
              {renderSettingItem(
                'Profile Visibility',
                'Make your profile visible to service providers',
                settings.privacy.profileVisibility,
                (value) => updateSetting('privacy', 'profileVisibility', value)
              )}
            </>
          ))}

          {/* App Preferences Section */}
          {renderSection('App Preferences', 'settings-outline', (
            <>
              {renderSettingItem(
                'Auto Sync',
                'Automatically sync your data',
                settings.app.autoSync,
                (value) => updateSetting('app', 'autoSync', value)
              )}
            </>
          ))}

          {/* Account Section */}
          {renderSection('Account', 'person-outline', (
            <>
              <TouchableOpacity
                className="flex-row items-center justify-between py-4 border-b border-gray-100"
                onPress={() => setShowChangePassword(true)}
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">Change Password</Text>
                  <Text className="text-sm text-gray-600 mt-1">Update your account password</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-between py-4"
                onPress={() => setShowDeleteAccount(true)}
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <Text className="text-base font-medium text-red-600">Delete Account</Text>
                  <Text className="text-sm text-gray-600 mt-1">Permanently delete your account</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              </TouchableOpacity>
            </>
          ))}

          {/* App Info Section */}
          {renderSection('About', 'information-circle-outline', (
            <>
              <View className="py-4 border-b border-gray-100">
                <Text className="text-base font-medium text-gray-900">Version</Text>
                <Text className="text-sm text-gray-600 mt-1">1.0.0</Text>
              </View>
              <View className="py-4">
                <Text className="text-base font-medium text-gray-900">Support</Text>
                <Text className="text-sm text-gray-600 mt-1">Contact us for help</Text>
              </View>
            </>
          ))}
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Change Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowChangePassword(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-700 text-sm">{passwordError}</Text>
              </View>
            ) : null}

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Current Password</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-base"
                  placeholder="Enter current password"
                  secureTextEntry={true}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => {
                    setPasswordForm(prev => ({ ...prev, currentPassword: text }));
                    setPasswordError('');
                  }}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">New Password</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-base"
                  placeholder="Enter new password"
                  secureTextEntry={true}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => {
                    setPasswordForm(prev => ({ ...prev, newPassword: text }));
                    setPasswordError('');
                  }}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Confirm New Password</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-base"
                  placeholder="Confirm new password"
                  secureTextEntry={true}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => {
                    setPasswordForm(prev => ({ ...prev, confirmPassword: text }));
                    setPasswordError('');
                  }}
                />
              </View>

              <TouchableOpacity
                className={`rounded-xl py-4 px-6 mt-6 ${
                  isChangingPassword ? 'bg-gray-400' : 'bg-green-600'
                }`}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                  <Text className="text-white text-base font-semibold ml-2">
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccount}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAccount(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Account
              </Text>
              <Text className="text-base text-gray-600 text-center">
                This action cannot be undone. All your data will be permanently deleted.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Type "DELETE" to confirm:
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl p-4 text-base"
                placeholder="DELETE"
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                autoCapitalize="characters"
              />
            </View>

            <View className="space-y-3">
              <TouchableOpacity
                className="bg-red-600 rounded-xl py-4 px-6"
                onPress={handleDeleteAccount}
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-semibold text-center">
                  Delete Forever
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-gray-100 rounded-xl py-4 px-6"
                onPress={() => {
                  setShowDeleteAccount(false);
                  setDeleteConfirmation('');
                }}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-base font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default SettingsScreen;