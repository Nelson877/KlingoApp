import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ApiService from '../services/apiService'; 

let searchTimeout;

function RequestCleanup({ onBack = () => {}, onSubmitRequest = () => {} }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    photos: [],
    location: "",
    problemType: "",
    severity: "",
    description: "",
    contactInfo: {
      phone: "",
      name: "",
      email: ""
    },
    otherDetails: {
      customProblemType: "",
      preferredDate: "",
      preferredTime: "",
      specificLocation: "",
    },
    coordinates: null,
  });
  const [errors, setErrors] = useState({});
  
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const problemTypes = [
    {
      id: "litter",
      label: "Litter & Trash",
      icon: "trash-outline",
      color: "#EF4444",
    },
    {
      id: "dumping",
      label: "Illegal Dumping",
      icon: "warning-outline",
      color: "#F59E0B",
    },
    {
      id: "graffiti",
      label: "Graffiti/Vandalism",
      icon: "color-palette-outline",
      color: "#8B5CF6",
    },
    {
      id: "overgrown",
      label: "Overgrown Areas",
      icon: "leaf-outline",
      color: "#10B981",
    },
    {
      id: "spill",
      label: "Spills/Stains",
      icon: "water-outline",
      color: "#3B82F6",
    },
    {
      id: "other",
      label: "Other",
      icon: "ellipsis-horizontal-outline",
      color: "#6B7280",
    },
  ];

  const severityLevels = [
    {
      id: "low",
      label: "Low Priority",
      description: "Not urgent, can wait",
      color: "#10B981",
    },
    {
      id: "medium",
      label: "Medium Priority",
      description: "Should be addressed soon",
      color: "#F59E0B",
    },
    {
      id: "high",
      label: "High Priority",
      description: "Needs immediate attention",
      color: "#EF4444",
    },
  ];

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions to use this feature'
        );
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (address && address.length > 0) {
        const addr = address[0];
        const formattedAddress = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        
        if (formData.problemType === "other") {
          setFormData({
            ...formData,
            otherDetails: {
              ...formData.otherDetails,
              specificLocation: formattedAddress
            },
            coordinates: { latitude, longitude }
          });
        } else {
          setFormData({ 
            ...formData, 
            location: formattedAddress,
            coordinates: { latitude, longitude }
          });
        }

        Alert.alert(
          'Location Detected!',
          'Your current location has been added successfully.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location. Please try again or use the map.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const openMapPicker = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions to use the map'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      setSelectedLocation({ latitude, longitude });
      setShowMapModal(true);
    } catch (error) {
      console.error('Error opening map:', error);
      setMapRegion({
        latitude: 6.6745,
        longitude: -1.5716,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setShowMapModal(true);
    }
  };

  const confirmMapLocation = async () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please tap on the map to select a location');
      return;
    }

    try {
      const address = await Location.reverseGeocodeAsync(selectedLocation);
      
      if (address && address.length > 0) {
        const addr = address[0];
        const formattedAddress = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        
        if (formData.problemType === "other") {
          setFormData({
            ...formData,
            otherDetails: {
              ...formData.otherDetails,
              specificLocation: formattedAddress
            },
            coordinates: selectedLocation
          });
        } else {
          setFormData({ 
            ...formData, 
            location: formattedAddress,
            coordinates: selectedLocation
          });
        }
      }

      setShowMapModal(false);
      Alert.alert('Success', 'Location selected successfully!');
    } catch (error) {
      console.error('Error confirming location:', error);
      Alert.alert('Error', 'Could not process the location. Please try again.');
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const extractLocationFromUrl = (url) => {
    try {
      const patterns = [
        /q=([^&]+)/i,
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,
        /place\/([^/]+)\//,
        /maps\?.*q=([^&]+)/i
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          if (pattern.source.includes('@')) {
            return `${match[1]}, ${match[2]}`;
          } else {
            return decodeURIComponent(match[1].replace(/\+/g, ' '));
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting location:', error);
      return null;
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.problemType)
        newErrors.problemType = "Please select a problem type";
      
      if (formData.problemType === "other") {
        if (!formData.otherDetails.customProblemType.trim())
          newErrors.customProblemType = "Please specify the type of problem";
        if (!formData.otherDetails.preferredDate)
          newErrors.preferredDate = "Please select a preferred date";
        if (!formData.otherDetails.preferredTime)
          newErrors.preferredTime = "Please select a preferred time";
        if (!formData.otherDetails.specificLocation.trim())
          newErrors.specificLocation = "Please provide specific location details";
      } else {
        if (!formData.location.trim())
          newErrors.location = "Location is required";
      }
    }

    if (step === 2) {
      if (!formData.severity)
        newErrors.severity = "Please select severity level";
      if (!formData.description.trim())
        newErrors.description = "Description is required";
    }

    if (step === 3) {
      if (!formData.contactInfo.phone.trim())
        newErrors.phone = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const submissionData = {
        problemType: formData.problemType,
        location: formData.problemType === "other" 
          ? formData.otherDetails.specificLocation 
          : formData.location,
        severity: formData.severity,
        description: formData.description,
        contactInfo: {
          name: formData.contactInfo.name || 'Anonymous',
          phone: formData.contactInfo.phone,
          email: formData.contactInfo.email || ''
        },
        photos: formData.photos || [],
        otherDetails: formData.problemType === "other" ? formData.otherDetails : {},
        coordinates: formData.coordinates || {},
        deviceInfo: Platform.OS + ' ' + Platform.Version
      };

      console.log('Submitting data:', submissionData);

      const result = await ApiService.submitCleanupRequest(submissionData);

      Alert.alert(
        "Request Submitted Successfully!",
        "Thank you for helping keep our community clean. We'll review your request and take appropriate action.",
        [{ 
          text: "OK", 
          onPress: () => {
            onSubmitRequest(submissionData);
            setCurrentStep(1);
            setFormData({
              photos: [],
              location: "",
              problemType: "",
              severity: "",
              description: "",
              contactInfo: { phone: "", name: "", email: "" },
              otherDetails: {
                customProblemType: "",
                preferredDate: "",
                preferredTime: "",
                specificLocation: "",
              },
              coordinates: null,
            });
          }
        }]
      );
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        "Submission Failed",
        error.userMessage || "There was an error submitting your request. Please check your internet connection and try again.",
        [
          { 
            text: "Retry", 
            onPress: () => handleSubmit()
          },
          { 
            text: "Cancel", 
            style: "cancel"
          }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const takePicture = () => {
    Alert.alert("Camera", "Camera functionality would open here");
  };

  const getFromGallery = () => {
    Alert.alert("Gallery", "Gallery picker would open here");
  };

  const showDatePicker = () => {
    const today = new Date();
    const dateString = today.toLocaleDateString();
    setFormData({
      ...formData,
      otherDetails: {
        ...formData.otherDetails,
        preferredDate: dateString
      }
    });
    Alert.alert("Date Picker", `Date selected: ${dateString}`);
  };

  const showTimePicker = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    setFormData({
      ...formData,
      otherDetails: {
        ...formData.otherDetails,
        preferredTime: timeString
      }
    });
    Alert.alert("Time Picker", `Time selected: ${timeString}`);
  };

  const renderProgressSteps = () => (
    <View className='flex-row justify-center items-center mb-8'>
      {[1, 2, 3].map((step) => (
        <View key={step} className='flex-row items-center'>
          <View
            className={`w-8 h-8 rounded-full items-center justify-center ${
              step <= currentStep ? "bg-green-600" : "bg-gray-300"
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                step <= currentStep ? "text-white" : "text-gray-500"
              }`}
            >
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View
              className={`w-12 h-1 ${
                step < currentStep ? "bg-green-600" : "bg-gray-300"
              }`}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderOtherFields = () => (
    <View className="mt-6">
      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Specify Problem Type
      </Text>
      <View
        className={`bg-gray-50 rounded-xl px-4 py-4 border mb-4 ${
          errors.customProblemType ? "border-red-500" : "border-gray-200"
        }`}
      >
        <TextInput
          className='text-base text-gray-800'
          placeholder='What type of cleaning service do you need?'
          placeholderTextColor='#9CA3AF'
          value={formData.otherDetails.customProblemType}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              otherDetails: {
                ...formData.otherDetails,
                customProblemType: text
              }
            })
          }
        />
      </View>
      {errors.customProblemType && (
        <Text className='text-red-500 text-sm mb-4'>{errors.customProblemType}</Text>
      )}

      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Specific Location Details
      </Text>
      <View className='mb-2'>
        <View
          className={`bg-gray-50 rounded-xl px-4 py-4 border ${
            errors.specificLocation ? "border-red-500" : "border-gray-200"
          }`}
        >
          <TextInput
            className='text-base text-gray-800'
            placeholder="Type location or paste Google Maps link"
            placeholderTextColor='#9CA3AF'
            value={formData.otherDetails.specificLocation}
            onChangeText={(text) => {
              if (text.includes('google.com/maps') || text.includes('goo.gl/maps') || text.includes('maps.app.goo.gl')) {
                const extractedLocation = extractLocationFromUrl(text);
                if (extractedLocation) {
                  setFormData({
                    ...formData,
                    otherDetails: {
                      ...formData.otherDetails,
                      specificLocation: extractedLocation
                    }
                  });
                  Alert.alert('Location Extracted', `Location from map link: ${extractedLocation}`);
                  return;
                }
              }
              setFormData({
                ...formData,
                otherDetails: {
                  ...formData.otherDetails,
                  specificLocation: text
                }
              });
              if (errors.specificLocation) {
                setErrors({ ...errors, specificLocation: null });
              }
            }}
            multiline
            autoCapitalize="none"
          />
        </View>
        {errors.specificLocation && (
          <Text className='text-red-500 text-sm mt-1'>{errors.specificLocation}</Text>
        )}
      </View>
      <Text className='text-xs text-gray-500 mb-2 px-1'>
        💡 Tip: You can paste a Google Maps URL to quickly add a location
      </Text>

      <View className='flex-row gap-3 mb-6'>
        <TouchableOpacity
          className={`flex-1 bg-green-100 border border-green-300 rounded-xl py-3 px-4 flex-row items-center justify-center ${
            isLoadingLocation ? 'opacity-50' : ''
          }`}
          onPress={getCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Ionicons name='locate' size={18} color='#10B981' />
          )}
          <Text className='text-green-700 font-medium ml-2 text-sm'>
            {isLoadingLocation ? 'Getting...' : 'Auto-Detect'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className='flex-1 bg-blue-100 border border-blue-300 rounded-xl py-3 px-4 flex-row items-center justify-center'
          onPress={openMapPicker}
        >
          <Ionicons name='map' size={18} color='#3B82F6' />
          <Text className='text-blue-700 font-medium ml-2 text-sm'>
            Pick on Map
          </Text>
        </TouchableOpacity>
      </View>

      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Preferred Schedule
      </Text>
      
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className='text-sm font-medium text-gray-700 mb-2'>
            Preferred Date
          </Text>
          <TouchableOpacity
            className={`bg-gray-50 rounded-xl px-4 py-4 border flex-row items-center justify-between ${
              errors.preferredDate ? "border-red-500" : "border-gray-200"
            }`}
            onPress={showDatePicker}
          >
            <Text className={`text-base ${
              formData.otherDetails.preferredDate ? "text-gray-800" : "text-gray-400"
            }`}>
              {formData.otherDetails.preferredDate || "Select Date"}
            </Text>
            <Ionicons name='calendar-outline' size={20} color='#6B7280' />
          </TouchableOpacity>
          {errors.preferredDate && (
            <Text className='text-red-500 text-sm mt-1'>{errors.preferredDate}</Text>
          )}
        </View>

        <View className="flex-1">
          <Text className='text-sm font-medium text-gray-700 mb-2'>
            Preferred Time
          </Text>
          <TouchableOpacity
            className={`bg-gray-50 rounded-xl px-4 py-4 border flex-row items-center justify-between ${
              errors.preferredTime ? "border-red-500" : "border-gray-200"
            }`}
            onPress={showTimePicker}
          >
            <Text className={`text-base ${
              formData.otherDetails.preferredTime ? "text-gray-800" : "text-gray-400"
            }`}>
              {formData.otherDetails.preferredTime || "Select Time"}
            </Text>
            <Ionicons name='time-outline' size={20} color='#6B7280' />
          </TouchableOpacity>
          {errors.preferredTime && (
            <Text className='text-red-500 text-sm mt-1'>{errors.preferredTime}</Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text className='text-2xl font-bold text-gray-900 mb-2'>
        What needs cleaning?
      </Text>
      <Text className='text-base text-gray-600 mb-6'>
        Select the type of problem and location
      </Text>

      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Problem Type
      </Text>
      <View className='flex-row flex-wrap gap-3 mb-6'>
        {problemTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            className={`flex-1 min-w-[45%] p-4 rounded-xl border-2 ${
              formData.problemType === type.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
            onPress={() => {
              setFormData({ ...formData, problemType: type.id });
              if (errors.problemType) {
                setErrors({ ...errors, problemType: null });
              }
            }}
          >
            <Ionicons
              name={type.icon}
              size={24}
              color={formData.problemType === type.id ? "#10B981" : type.color}
            />
            <Text
              className={`text-sm font-medium mt-2 ${
                formData.problemType === type.id
                  ? "text-green-700"
                  : "text-gray-700"
              }`}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.problemType && (
        <Text className='text-red-500 text-sm mb-4'>{errors.problemType}</Text>
      )}

      {formData.problemType === "other" ? (
        renderOtherFields()
      ) : (
        <View>
          <Text className='text-lg font-semibold text-gray-800 mb-4'>Location</Text>
          <View className='mb-2'>
            <View
              className={`bg-gray-50 rounded-xl px-4 py-4 border ${
                errors.location ? "border-red-500" : "border-gray-200"
              }`}
            >
              <TextInput
                className='text-base text-gray-800'
                placeholder="Type location or paste Google Maps link"
                placeholderTextColor='#9CA3AF'
                value={formData.location}
                onChangeText={(text) => {
                  if (text.includes('google.com/maps') || text.includes('goo.gl/maps') || text.includes('maps.app.goo.gl')) {
                    const extractedLocation = extractLocationFromUrl(text);
                    if (extractedLocation) {
                      setFormData({ ...formData, location: extractedLocation });
                      Alert.alert('Location Extracted', `Location from map link: ${extractedLocation}`);
                      return;
                    }
                  }
                  setFormData({ ...formData, location: text });
                  if (errors.location) {
                    setErrors({ ...errors, location: null });
                  }
                }}
                autoCapitalize="none"
              />
            </View>
            {errors.location && (
              <Text className='text-red-500 text-sm mt-1'>{errors.location}</Text>
            )}
          </View>
          <Text className='text-xs text-gray-500 mb-4 px-1'>
            💡 Tip: You can paste a Google Maps URL to quickly add a location
          </Text>

          <View className='flex-row gap-3 mb-6'>
            <TouchableOpacity
              className={`flex-1 bg-green-100 border border-green-300 rounded-xl py-3 px-4 flex-row items-center justify-center ${
                isLoadingLocation ? 'opacity-50' : ''
              }`}
              onPress={getCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Ionicons name='locate' size={18} color='#10B981' />
              )}
              <Text className='text-green-700 font-medium ml-2 text-sm'>
                {isLoadingLocation ? 'Getting...' : 'Auto-Detect'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className='flex-1 bg-blue-100 border border-blue-300 rounded-xl py-3 px-4 flex-row items-center justify-center'
              onPress={openMapPicker}
            >
              <Ionicons name='map' size={18} color='#3B82F6' />
              <Text className='text-blue-700 font-medium ml-2 text-sm'>
                Pick on Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Add Photos (Optional)
      </Text>
      <View className='flex-row gap-3 mb-6'>
        <TouchableOpacity
          className='flex-1 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl py-8 items-center'
          onPress={takePicture}
        >
          <Ionicons name='camera-outline' size={32} color='#6B7280' />
          <Text className='text-gray-600 text-sm mt-2'>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className='flex-1 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl py-8 items-center'
          onPress={getFromGallery}
        >
          <Ionicons name='image-outline' size={32} color='#6B7280' />
          <Text className='text-gray-600 text-sm mt-2'>From Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text className='text-2xl font-bold text-gray-900 mb-2'>
        How urgent is this?
      </Text>
      <Text className='text-base text-gray-600 mb-6'>
        Help us prioritize your request
      </Text>

      <View className='mb-6'>
        {severityLevels.map((level) => (
          <TouchableOpacity
            key={level.id}
            className={`p-4 rounded-xl border-2 mb-3 ${
              formData.severity === level.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
            onPress={() => setFormData({ ...formData, severity: level.id })}
          >
            <View className='flex-row items-center'>
              <View
                className={`w-4 h-4 rounded-full mr-3`}
                style={{ backgroundColor: level.color }}
              />
              <View className='flex-1'>
                <Text
                  className={`font-semibold ${
                    formData.severity === level.id
                      ? "text-green-700"
                      : "text-gray-800"
                  }`}
                >
                  {level.label}
                </Text>
                <Text
                  className={`text-sm ${
                    formData.severity === level.id
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  {level.description}
                </Text>
              </View>
              {formData.severity === level.id && (
                <Ionicons name='checkmark-circle' size={20} color='#10B981' />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {errors.severity && (
        <Text className='text-red-500 text-sm mb-4'>{errors.severity}</Text>
      )}

      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Additional Details
      </Text>
      <View
        className={`bg-gray-50 rounded-xl px-4 py-4 border ${
          errors.description ? "border-red-500" : "border-gray-200"
        }`}
      >
        <TextInput
          className='text-base text-gray-800 min-h-[100px]'
          placeholder='Describe the problem in more detail...'
          placeholderTextColor='#9CA3AF'
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
          multiline
          textAlignVertical='top'
        />
      </View>
      {errors.description && (
        <Text className='text-red-500 text-sm mt-1'>{errors.description}</Text>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text className='text-2xl font-bold text-gray-900 mb-2'>
        Contact Information
      </Text>
      <Text className='text-base text-gray-600 mb-6'>
        We may need to contact you for updates
      </Text>

      <View className='space-y-4'>
        <View>
          <Text className='text-sm font-semibold text-gray-700 mb-2'>
            Phone Number
          </Text>
          <View
            className={`bg-gray-50 rounded-xl px-4 py-4 border ${
              errors.phone ? "border-red-500" : "border-gray-200"
            }`}
          >
            <TextInput
              className='text-base text-gray-800'
              placeholder='Enter your phone number'
              placeholderTextColor='#9CA3AF'
              value={formData.contactInfo.phone}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: text },
                })
              }
              keyboardType='phone-pad'
            />
          </View>
          {errors.phone && (
            <Text className='text-red-500 text-sm mt-1'>{errors.phone}</Text>
          )}
        </View>
      </View>

      <View className='bg-green-50 border border-green-200 rounded-xl p-4 mt-6'>
        <Text className='font-semibold text-green-800 mb-2'>
          Request Summary
        </Text>
        <Text className='text-green-700 text-sm'>
          Problem:{" "}
          {formData.problemType === "other" 
            ? formData.otherDetails.customProblemType 
            : problemTypes.find((p) => p.id === formData.problemType)?.label}
        </Text>
        <Text className='text-green-700 text-sm'>
          Priority:{" "}
          {severityLevels.find((s) => s.id === formData.severity)?.label}
        </Text>
        <Text className='text-green-700 text-sm'>
          Location: {formData.problemType === "other" 
            ? formData.otherDetails.specificLocation 
            : formData.location}
        </Text>
        {formData.problemType === "other" && (
          <>
            <Text className='text-green-700 text-sm'>
              Preferred Date: {formData.otherDetails.preferredDate}
            </Text>
            <Text className='text-green-700 text-sm'>
              Preferred Time: {formData.otherDetails.preferredTime}
            </Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className='flex-1 bg-white'
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className='flex-1 px-6 pt-12'>
          <View className='flex-row items-center justify-between mb-6'>
            <TouchableOpacity onPress={handleBack} className='p-2 -ml-2'>
              <Ionicons name='arrow-back' size={24} color='#374151' />
            </TouchableOpacity>
            <Text className='text-lg font-semibold text-gray-900'>
              Step {currentStep} of 3
            </Text>
            <View className='w-8' />
          </View>

          {renderProgressSteps()}

          <View className='flex-1'>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </View>

          <View className='py-6'>
            <TouchableOpacity
              className={`bg-green-600 rounded-xl py-4 mb-4 shadow-lg ${
                isSubmitting ? 'opacity-50' : ''
              }`}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View className='flex-row items-center justify-center'>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className='text-white text-lg font-semibold ml-2'>
                    Submitting...
                  </Text>
                </View>
              ) : (
                <Text className='text-white text-lg font-semibold text-center'>
                  {currentStep === 3 ? "Submit Request" : "Continue"}
                </Text>
              )}
            </TouchableOpacity>

            {currentStep > 1 && !isSubmitting && (
              <TouchableOpacity
                className='bg-white border border-gray-300 rounded-xl py-4 shadow-sm'
                onPress={() => setCurrentStep(currentStep - 1)}
                activeOpacity={0.8}
              >
                <Text className='text-gray-700 text-lg font-semibold text-center'>
                  Back
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View className='flex-1'>
          <View className='bg-white border-b border-gray-200 pt-12 pb-4 px-6'>
            <View className='flex-row items-center justify-between'>
              <TouchableOpacity onPress={() => setShowMapModal(false)}>
                <Ionicons name='close' size={28} color='#374151' />
              </TouchableOpacity>
              <Text className='text-lg font-semibold text-gray-900'>
                Select Location
              </Text>
              <TouchableOpacity onPress={confirmMapLocation}>
                <Text className='text-green-600 font-semibold text-lg'>Done</Text>
              </TouchableOpacity>
            </View>
            <Text className='text-sm text-gray-600 mt-2 text-center'>
              Tap anywhere on the map to select a location
            </Text>
          </View>

          {mapRegion && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  draggable
                  onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
                >
                  <View className='items-center'>
                    <Ionicons name='location' size={40} color='#EF4444' />
                  </View>
                </Marker>
              )}
            </MapView>
          )}

          <View className='absolute bottom-8 left-6 right-6'>
            <TouchableOpacity
              className='bg-green-600 rounded-xl py-4 shadow-lg flex-row items-center justify-center'
              onPress={confirmMapLocation}
            >
              <Ionicons name='checkmark-circle' size={24} color='white' />
              <Text className='text-white text-lg font-semibold ml-2'>
                Confirm Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export default RequestCleanup;