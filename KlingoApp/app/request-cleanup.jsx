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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  });
  const [errors, setErrors] = useState({});

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

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.problemType)
        newErrors.problemType = "Please select a problem type";
      if (!formData.location.trim())
        newErrors.location = "Location is required";
    }

    if (step === 2) {
      if (!formData.severity)
        newErrors.severity = "Please select severity level";
      if (!formData.description.trim())
        newErrors.description = "Description is required";
    }

    if (step === 3) {
      if (!formData.contactInfo.name.trim())
        newErrors.name = "Name is required";
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

  const getCurrentLocation = () => {
    // Placeholder for GPS functionality
    Alert.alert("Location", "GPS location would be fetched here");
    setFormData({ ...formData, location: "Current GPS Location" });
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
            onPress={() => setFormData({ ...formData, problemType: type.id })}
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

      {/* Location Input */}
      <Text className='text-lg font-semibold text-gray-800 mb-4'>Location</Text>
      <View className='mb-4'>
        <View
          className={`bg-gray-50 rounded-xl px-4 py-4 border ${
            errors.location ? "border-red-500" : "border-gray-200"
          }`}
        >
          <TextInput
            className='text-base text-gray-800'
            placeholder='Enter address or description of location'
            placeholderTextColor='#9CA3AF'
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            multiline
          />
        </View>
        {errors.location && (
          <Text className='text-red-500 text-sm mt-1'>{errors.location}</Text>
        )}
      </View>

      <TouchableOpacity
        className='bg-green-100 border border-green-300 rounded-xl py-3 px-4 flex-row items-center justify-center mb-6'
        onPress={getCurrentLocation}
      >
        <Ionicons name='location-outline' size={20} color='#10B981' />
        <Text className='text-green-700 font-medium ml-2'>
          Use Current Location
        </Text>
      </TouchableOpacity>

      {/* Photo Section */}
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
          {problemTypes.find((p) => p.id === formData.problemType)?.label}
        </Text>
        <Text className='text-green-700 text-sm'>
          Priority:{" "}
          {severityLevels.find((s) => s.id === formData.severity)?.label}
        </Text>
        <Text className='text-green-700 text-sm'>
          Location: {formData.location}
        </Text>
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
