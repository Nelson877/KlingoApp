import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ApiService from '../services/apiService';

function CleanupProgress({ onBack = () => {}, user = null, initialFilter = null }) {  
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState(initialFilter); // NEW: Filter state

  const statusSteps = [
    {
      id: "submitted",
      label: "Submitted",
      icon: "checkmark-circle",
      color: "#10B981",
      description: "Request received"
    },
    {
      id: "reviewing",
      label: "Under Review",
      icon: "document-text",
      color: "#F59E0B",
      description: "Team is evaluating"
    },
    {
      id: "scheduled",
      label: "Scheduled",
      icon: "calendar",
      color: "#3B82F6",
      description: "Cleanup planned"
    },
    {
      id: "in_progress",
      label: "In Progress",
      icon: "construct",
      color: "#8B5CF6",
      description: "Work ongoing"
    },
    {
      id: "completed",
      label: "Completed",
      icon: "checkmark-done-circle",
      color: "#10B981",
      description: "Successfully done"
    }
  ];

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]); // Refetch when filter changes

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      
      const response = await ApiService.getMyCleanupRequests();
      let fetchedRequests = response.data || [];
      
      // Apply status filter if set
      if (statusFilter) {
        fetchedRequests = fetchedRequests.filter(req => req.status === statusFilter);
      }
      
      setRequests(fetchedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      
      Alert.alert(
        'Unable to Load Requests',
        error?.userMessage || 'Could not load your cleanup requests. Please try again.',
        [{ text: 'OK' }]
      );
      
      setRequests([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getStatusColor = (status) => {
    const step = statusSteps.find(s => s.id === status);
    return step?.color || "#6B7280";
  };

  const getStatusIndex = (status) => {
    return statusSteps.findIndex(s => s.id === status);
  };

  const getProblemTypeLabel = (type) => {
    const types = {
      litter: "Litter & Trash",
      dumping: "Illegal Dumping",
      graffiti: "Graffiti/Vandalism",
      overgrown: "Overgrown Areas",
      spill: "Spills/Stains",
      other: "Other"
    };
    return types[type] || type;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: "#10B981",
      medium: "#F59E0B",
      high: "#EF4444"
    };
    return colors[severity] || "#6B7280";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderRequestCard = (request) => {
    const currentStatusIndex = getStatusIndex(request.status);
    const isCompleted = request.status === "completed";

    return (
      <TouchableOpacity
        key={request._id || request.id}
        className='bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100'
        onPress={() => setSelectedRequest(request)}
        activeOpacity={0.7}
      >
        <View className='flex-row items-start justify-between mb-3'>
          <View className='flex-1'>
            <View className='flex-row items-center mb-2'>
              <Text className='text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full'>
                {request.formattedId || request.id || 'REQ-XXX'}
              </Text>
              <View
                className='ml-2 px-3 py-1 rounded-full'
                style={{ backgroundColor: `${getSeverityColor(request.severity)}20` }}
              >
                <Text
                  className='text-xs font-semibold capitalize'
                  style={{ color: getSeverityColor(request.severity) }}
                >
                  {request.severity} Priority
                </Text>
              </View>
            </View>
            <Text className='text-lg font-bold text-gray-900 mb-1'>
              {getProblemTypeLabel(request.problemType)}
            </Text>
            <View className='flex-row items-center'>
              <Ionicons name='location' size={14} color='#6B7280' />
              <Text className='text-sm text-gray-600 ml-1' numberOfLines={1}>
                {request.location}
              </Text>
            </View>
          </View>
        </View>

        <View className='flex-row items-center mb-3'>
          <View
            className='px-3 py-2 rounded-lg flex-row items-center'
            style={{ backgroundColor: `${getStatusColor(request.status)}15` }}
          >
            <Ionicons
              name={statusSteps[currentStatusIndex]?.icon || 'help-circle'}
              size={16}
              color={getStatusColor(request.status)}
            />
            <Text
              className='text-sm font-semibold ml-2 capitalize'
              style={{ color: getStatusColor(request.status) }}
            >
              {request.status.replace('-', ' ')}
            </Text>
          </View>
          {!isCompleted && request.estimatedCompletion && (
            <Text className='text-xs text-gray-500 ml-3'>
              Est: {formatDate(request.estimatedCompletion)}
            </Text>
          )}
        </View>

        <View className='border-t border-gray-100 pt-3 flex-row items-center justify-between'>
          <View className='flex-row items-center'>
            <Ionicons name='time-outline' size={14} color='#9CA3AF' />
            <Text className='text-xs text-gray-500 ml-1'>
              Submitted {formatDate(request.createdAt || request.submittedAt)}
            </Text>
          </View>
          <View className='flex-row items-center'>
            <Text className='text-sm font-semibold text-green-600 mr-1'>
              View Details
            </Text>
            <Ionicons name='chevron-forward' size={16} color='#10B981' />
          </View>
        </View>

        {isCompleted && (
          <View className='mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex-row items-center'>
            <Ionicons name='checkmark-circle' size={20} color='#10B981' />
            <Text className='text-sm text-green-700 font-medium ml-2'>
              Completed on {formatDate(request.completedAt)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailedView = () => {
    if (!selectedRequest) return null;

    const currentStatusIndex = getStatusIndex(selectedRequest.status);

    return (
      <View className='flex-1 bg-white'>
        <View className='bg-green-600 pt-12 pb-6 px-6'>
          <View className='flex-row items-center justify-between mb-4'>
            <TouchableOpacity onPress={() => setSelectedRequest(null)}>
              <Ionicons name='arrow-back' size={24} color='white' />
            </TouchableOpacity>
            <Text className='text-lg font-semibold text-white'>
              Request Details
            </Text>
            <View className='w-6' />
          </View>

          <View className='bg-white/20 rounded-2xl p-4'>
            <Text className='text-xs font-bold text-white/80 mb-1'>
              {selectedRequest.formattedId || selectedRequest.id}
            </Text>
            <Text className='text-xl font-bold text-white mb-2'>
              {getProblemTypeLabel(selectedRequest.problemType)}
            </Text>
            <View className='flex-row items-center'>
              <Ionicons name='location' size={16} color='white' />
              <Text className='text-sm text-white ml-2'>
                {selectedRequest.location}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
          <View className='px-6 py-6'>
            <Text className='text-lg font-bold text-gray-900 mb-4'>
              Progress Timeline
            </Text>

            <View className='mb-6'>
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const update = selectedRequest.statusHistory?.find(u => u.status === step.id);

                return (
                  <View key={step.id} className='flex-row mb-6'>
                    <View className='items-center mr-4'>
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                          isCompleted ? 'bg-green-100' : 'bg-gray-100'
                        } ${isCurrent ? 'border-2 border-green-600' : ''}`}
                      >
                        <Ionicons
                          name={step.icon}
                          size={20}
                          color={isCompleted ? step.color : '#9CA3AF'}
                        />
                      </View>
                      {index < statusSteps.length - 1 && (
                        <View
                          className={`w-0.5 h-12 ${
                            isCompleted ? 'bg-green-300' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </View>

                    <View className='flex-1'>
                      <Text
                        className={`font-bold mb-1 ${
                          isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </Text>
                      {update && (
                        <>
                          <Text className='text-sm text-gray-600 mb-1'>
                            {update.notes || step.description}
                          </Text>
                          <Text className='text-xs text-gray-400'>
                            {formatDateTime(update.changedAt || update.timestamp)}
                          </Text>
                        </>
                      )}
                      {!update && !isCompleted && (
                        <Text className='text-sm text-gray-400'>
                          {step.description}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <View className='bg-gray-50 rounded-2xl p-5 mb-6'>
              <Text className='text-lg font-bold text-gray-900 mb-4'>
                Request Information
              </Text>

              <View className='mb-4'>
                <Text className='text-xs font-semibold text-gray-500 mb-1'>
                  DESCRIPTION
                </Text>
                <Text className='text-sm text-gray-800'>
                  {selectedRequest.description}
                </Text>
              </View>

              <View className='flex-row mb-4'>
                <View className='flex-1'>
                  <Text className='text-xs font-semibold text-gray-500 mb-1'>
                    PRIORITY
                  </Text>
                  <View
                    className='px-3 py-1 rounded-lg self-start'
                    style={{ backgroundColor: `${getSeverityColor(selectedRequest.severity)}20` }}
                  >
                    <Text
                      className='text-sm font-semibold capitalize'
                      style={{ color: getSeverityColor(selectedRequest.severity) }}
                    >
                      {selectedRequest.severity}
                    </Text>
                  </View>
                </View>

                {selectedRequest.assignedTo && (
                  <View className='flex-1'>
                    <Text className='text-xs font-semibold text-gray-500 mb-1'>
                      ASSIGNED TO
                    </Text>
                    <Text className='text-sm text-gray-800'>
                      {selectedRequest.assignedTo}
                    </Text>
                  </View>
                )}
              </View>

              {selectedRequest.estimatedCompletion && (
                <View>
                  <Text className='text-xs font-semibold text-gray-500 mb-1'>
                    ESTIMATED COMPLETION
                  </Text>
                  <Text className='text-sm text-gray-800'>
                    {formatDateTime(selectedRequest.estimatedCompletion)}
                  </Text>
                </View>
              )}
            </View>

            {selectedRequest.status !== "completed" && (
              <TouchableOpacity
                className='bg-green-600 rounded-xl py-4 shadow-lg'
                onPress={() => {
                  Alert.alert(
                    "Contact Support",
                    "Would you like to contact support about this request?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Call", 
                        onPress: () => {
                          Alert.alert("Call Support", "Feature coming soon!");
                        } 
                      },
                      { 
                        text: "Message", 
                        onPress: async () => {
                          try {
                            await ApiService.contactSupportAboutRequest(
                              selectedRequest._id || selectedRequest.id,
                              "I need help with this request",
                              "email"
                            );
                            Alert.alert("Success", "Support has been notified!");
                          } catch (error) {
                            Alert.alert("Error", error?.userMessage || "Failed to contact support");
                          }
                        } 
                      }
                    ]
                  );
                }}
              >
                <Text className='text-white text-base font-semibold text-center'>
                  Contact Support
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (selectedRequest) {
    return renderDetailedView();
  }

  // Get filter label
  const getFilterLabel = () => {
    if (!statusFilter) return 'All Requests';
    if (statusFilter === 'pending') return 'Pending Requests';
    if (statusFilter === 'in-progress') return 'In Progress';
    if (statusFilter === 'completed') return 'Completed Requests';
    return 'My Requests';
  };

  return (
    <View className='flex-1 bg-gray-50'>
      <View className='bg-green-600 pt-12 pb-6 px-6'>
        <View className='flex-row items-center justify-between'>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name='arrow-back' size={24} color='white' />
          </TouchableOpacity>
          <Text className='text-xl font-bold text-white'>
            {getFilterLabel()}
          </Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name='refresh' size={24} color='white' />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#10B981' />
          <Text className='text-gray-500 mt-4'>Loading requests...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View className='flex-1 items-center justify-center px-6'>
          <Ionicons name='document-text-outline' size={80} color='#D1D5DB' />
          <Text className='text-xl font-bold text-gray-900 mt-4 mb-2'>
            No {statusFilter ? statusFilter.replace('-', ' ') : ''} Requests
          </Text>
          <Text className='text-gray-600 text-center'>
            {statusFilter 
              ? `You don't have any ${statusFilter.replace('-', ' ')} requests yet`
              : 'When you submit cleanup requests, they\'ll appear here'}
          </Text>
          {statusFilter && (
            <TouchableOpacity
              className='mt-4 bg-green-600 rounded-xl py-3 px-6'
              onPress={() => setStatusFilter(null)}
            >
              <Text className='text-white font-semibold'>View All Requests</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          className='flex-1 px-6 pt-6'
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor='#10B981'
            />
          }
        >
          <View className='flex-row items-center justify-between mb-4'>
            <Text className='text-sm text-gray-600'>
              {requests.length} {requests.length === 1 ? 'Request' : 'Requests'}
            </Text>
            <TouchableOpacity 
              className='flex-row items-center'
              onPress={() => setStatusFilter(null)}
            >
              {statusFilter && (
                <>
                  <Ionicons name='close-circle' size={16} color='#6B7280' />
                  <Text className='text-sm text-gray-600 ml-1'>Clear Filter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {requests.map(renderRequestCard)}

          <View className='h-6' />
        </ScrollView>
      )}
    </View>
  );
}

export default CleanupProgress;