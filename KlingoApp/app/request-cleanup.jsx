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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';

let searchTimeout;

function RequestCleanup({ onBack = () => {}, onSubmitRequest = () => {} }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    photos: [],
    location: "",
    problemType: "",
    severity: "",
    description: "",
    contactInfo: {
      phone: "",
    },
    
    otherDetails: {
      customProblemType: "",
      preferredDate: "",
      preferredTime: "",
      specificLocation: "",
    },
  });
  const [errors, setErrors] = useState({});
  
  // location features
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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

  // Common locations 
  const commonLocations = [
    'Kumasi Central Market',
    'KNUST Campus',
    'Kejetia Market', 
    'Adum',
    'Bantama',
    'Asokwa',
    'Tafo',
    'Suame',
    'Airport Roundabout',
    'Manhyia Palace Area',
    'Tech Junction',
    'Race Course',
    'Santasi',
    'Kwadaso',
    'Ayeduase'
  ];

  // Google API search
  const searchPlaces = async (query) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const GOOGLE_PLACES_API_KEY = 'GOOGLE_PLACES_API_KEY';
    
      if (GOOGLE_PLACES_API_KEY === 'GOOGLE_PLACES_API_KEY') {
        // Use local suggestions as fallback
        const filteredLocations = commonLocations
          .filter(location => location.toLowerCase().includes(query.toLowerCase()))
          .map(location => ({ description: location, place_id: location }));
        
        setLocationSuggestions(filteredLocations);
        setShowSuggestions(filteredLocations.length > 0);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_PLACES_API_KEY}&components=country:gh`
      );
      
      const data = await response.json();
      
      if (data.predictions) {
        setLocationSuggestions(data.predictions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      // Fallback to local suggestions
      const filteredLocations = commonLocations
        .filter(location => location.toLowerCase().includes(query.toLowerCase()))
        .map(location => ({ description: location, place_id: location }));
      
      setLocationSuggestions(filteredLocations);
      setShowSuggestions(filteredLocations.length > 0);
    }
  };

  // Enhanced getCurrentLocation function
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions to use this feature'
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address.length > 0) {
        const addr = address[0];
        const formattedAddress = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        
        if (formData.problemType === "other") {
          setFormData({
            ...formData,
            otherDetails: {
              ...formData.otherDetails,
              specificLocation: formattedAddress
            }
          });
        } else {
          setFormData({ ...formData, location: formattedAddress });
        }

        Alert.alert(
          '📍 Location Updated', 
          'Your current location has been added successfully!',
          [
            { 
              text: "Great!", 
              style: "default",
              onPress: () => console.log('Location success acknowledged')
            }
          ],
          { 
            cancelable: true,
            userInterfaceStyle: 'light'
          }
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.problemType)
        newErrors.problemType = "Please select a problem type";
      
      // Special validation for "other" option
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

  const handleSubmit = () => {
    Alert.alert(
      "Request Submitted!",
      "Thank you for helping keep our community clean. We'll review your request and take appropriate action.",
      [{ text: "OK", onPress: () => onSubmitRequest(formData) }]
    );
  };

  const takePicture = () => {
    // Placeholder for camera functionality
    Alert.alert("Camera", "Camera functionality would open here");
  };

  const getFromGallery = () => {
    // Placeholder for gallery functionality
    Alert.alert("Gallery", "Gallery picker would open here");
  };

  const showDatePicker = () => {
    // Placeholder for date picker
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
    // Placeholder for time picker
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

  // Location Input Component with Suggestions
  const LocationInputWithSuggestions = ({ 
    value, 
    onChangeText, 
    placeholder, 
    error,
    isOtherType = false 
  }) => {
    const handleLocationChange = (text) => {
      onChangeText(text);
      // Clear any previous errors
      if (error) {
        const errorKey = isOtherType ? 'specificLocation' : 'location';
        setErrors({ ...errors, [errorKey]: null });
      }
      // Debounce the API calls
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => searchPlaces(text), 300);
    };

    const selectSuggestion = (suggestion) => {
      onChangeText(suggestion.description);
      setShowSuggestions(false);
      setLocationSuggestions([]);
    };

    const handleFocus = () => {
      if (value.length >= 2) {
        searchPlaces(value);
      }
    };

    const handleBlur = () => {
      // Delay hiding suggestions to allow selection
      setTimeout(() => {
        setShowSuggestions(false);
        setLocationSuggestions([]);
      }, 200);
    };

    return (
      <View style={{ position: 'relative', zIndex: 1000 }}>
        <View
          className={`bg-gray-50 rounded-xl px-4 py-4 border ${
            error ? "border-red-500" : "border-gray-200"
          }`}
        >
          <TextInput
            className='text-base text-gray-800'
            placeholder={placeholder}
            placeholderTextColor='#9CA3AF'
            value={value}
            onChangeText={handleLocationChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline={isOtherType}
          />
        </View>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && locationSuggestions.length > 0 && (
          <View className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-60" style={{ zIndex: 1001 }}>
            <ScrollView nestedScrollEnabled>
              {locationSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.place_id || index}
                  className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                  onPress={() => selectSuggestion(suggestion)}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text className="text-gray-800 ml-2 flex-1" numberOfLines={2}>
                      {suggestion.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {error && (
          <Text className='text-red-500 text-sm mt-1'>{error}</Text>
        )}
      </View>
    );
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
      {/* Custom Problem Type */}
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

      {/* Specific Location with Suggestions */}
      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Specific Location Details
      </Text>
      <LocationInputWithSuggestions
        value={formData.otherDetails.specificLocation}
        onChangeText={(text) =>
          setFormData({
            ...formData,
            otherDetails: {
              ...formData.otherDetails,
              specificLocation: text
            }
          })
        }
        placeholder="Provide detailed location information"
        error={errors.specificLocation}
        isOtherType={true}
      />

      <TouchableOpacity
        className={`bg-green-100 border border-green-300 rounded-xl py-3 px-4 flex-row items-center justify-center mt-4 mb-6 ${
          isLoadingLocation ? 'opacity-50' : ''
        }`}
        onPress={getCurrentLocation}
        disabled={isLoadingLocation}
      >
        {isLoadingLocation ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : (
          <Ionicons name='location-outline' size={20} color='#10B981' />
        )}
        <Text className='text-green-700 font-medium ml-2'>
          {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
        </Text>
      </TouchableOpacity>

      {/* Date and Time Selection */}
      <Text className='text-lg font-semibold text-gray-800 mb-4'>
        Preferred Schedule
      </Text>
      
      <View className="flex-row gap-3 mb-4">
        {/* Date Picker */}
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

        {/* Time Picker */}
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

      {/* Problem Type Selection */}
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
              // Clear errors when selection changes
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

      {/* Show different content based on selection */}
      {formData.problemType === "other" ? (
        renderOtherFields()
      ) : (
        <View>
          {/* Standard Location Input with Suggestions */}
          <Text className='text-lg font-semibold text-gray-800 mb-4'>Location</Text>
          <View className='mb-4'>
            <LocationInputWithSuggestions
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="Enter address or description of location"
              error={errors.location}
            />
          </View>

          <TouchableOpacity
            className={`bg-green-100 border border-green-300 rounded-xl py-3 px-4 flex-row items-center justify-center mb-6 ${
              isLoadingLocation ? 'opacity-50' : ''
            }`}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name='location-outline' size={20} color='#10B981' />
            )}
            <Text className='text-green-700 font-medium ml-2'>
              {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Section - Always visible */}
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

      {/* Severity Selection */}
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

      {/* Description */}
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

      {/* Summary */}
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
          {/* Header */}
          <View className='flex-row items-center justify-between mb-6'>
            <TouchableOpacity onPress={handleBack} className='p-2 -ml-2'>
              <Ionicons name='arrow-back' size={24} color='#374151' />
            </TouchableOpacity>
            <Text className='text-lg font-semibold text-gray-900'>
              Step {currentStep} of 3
            </Text>
            <View className='w-8' />
          </View>

          {/* Progress Steps */}
          {renderProgressSteps()}

          {/* Step Content */}
          <View className='flex-1'>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </View>

          {/* Navigation Buttons */}
          <View className='py-6'>
            <TouchableOpacity
              className='bg-green-600 rounded-xl py-4 mb-4 shadow-lg'
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text className='text-white text-lg font-semibold text-center'>
                {currentStep === 3 ? "Submit Request" : "Continue"}
              </Text>
            </TouchableOpacity>

            {currentStep > 1 && (
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
    </KeyboardAvoidingView>
  );
}

export default RequestCleanup;