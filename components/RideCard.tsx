import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";

import { icons } from "@/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { Ride } from "@/types/type";

const RideCard = ({ ride }: { ride: Ride }) => {
  const [status, setStatus] = useState(ride.status);
  const [loadingAction, setLoadingAction] = useState(false);

  const passengerName = ride.passenger
    ? `${ride.passenger.first_name} ${ride.passenger.last_name}`.trim()
    : "Passenger";

  const handleAction = async (action: "accept" | "cancel") => {
    if (!ride.ride_id) {
      return;
    }

    setLoadingAction(true);

    try {
      const response = await fetch(`/api/ride/${ride.ride_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to update ride status");
      }

      setStatus(action === "accept" ? "accepted" : "cancelled");
      Alert.alert(
        action === "accept" ? "Ride accepted" : "Ride cancelled",
        action === "accept"
          ? "You have accepted this passenger request."
          : "The ride request has been cancelled.",
      );
    } catch (error) {
      console.error("Unable to update ride status:", error);
      Alert.alert("Update failed", "Unable to update ride status. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert("Cancel ride", "Are you sure you want to cancel this ride request?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: () => handleAction("cancel") },
    ]);
  };

  const isBooked = status === "booked";

  return (
    <View className="mb-4 overflow-hidden rounded-3xl bg-white shadow-sm shadow-neutral-300">
      <Image
        source={{
          uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${ride.destination_longitude},${ride.destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
        }}
        className="h-44 w-full"
      />
      <View className="p-4">
        <View className="flex flex-row items-center gap-3 mb-3">
          <Image source={icons.to} className="w-5 h-5" />
          <Text className="text-md font-JakartaMedium flex-1" numberOfLines={1}>
            {ride.origin_address}
          </Text>
        </View>

        <View className="flex flex-row items-center gap-3 mb-4">
          <Image source={icons.point} className="w-5 h-5" />
          <Text className="text-md font-JakartaMedium flex-1" numberOfLines={1}>
            {ride.destination_address}
          </Text>
        </View>

        <View className="rounded-3xl bg-primary-50 p-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-sm font-JakartaMedium text-neutral-500">Date & Time</Text>
            <Text className="text-sm font-JakartaBold" numberOfLines={1}>
              {formatDate(ride.created_at)}, {formatTime(ride.ride_time)}
            </Text>
          </View>

          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-sm font-JakartaMedium text-neutral-500">Passenger</Text>
            <Text className="text-sm font-JakartaBold" numberOfLines={1}>
              {passengerName}
            </Text>
          </View>

          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-sm font-JakartaMedium text-neutral-500">Car Seats</Text>
            <Text className="text-sm font-JakartaBold">{ride.driver.car_seats}</Text>
          </View>

          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="text-sm font-JakartaMedium text-neutral-500">Status</Text>
            <Text className="text-sm font-JakartaBold capitalize">
              {status}
            </Text>
          </View>

          <View className="flex flex-row items-center justify-between">
            <Text className="text-sm font-JakartaMedium text-neutral-500">Payment Status</Text>
            <Text
              className={`text-sm capitalize font-JakartaBold ${ride.payment_status === "paid" ? "text-success-600" : "text-danger-600"}`}
            >
              {ride.payment_status}
            </Text>
          </View>
        </View>

        {isBooked && (
          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => handleAction("accept")}
              className="flex-1 rounded-2xl bg-green-600 px-4 py-3"
              disabled={loadingAction}
            >
              {loadingAction ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-sm font-JakartaBold text-white">Accept</Text>
              )}
            </Pressable>

            <Pressable
              onPress={confirmCancel}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3"
              disabled={loadingAction}
            >
              {loadingAction ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-sm font-JakartaBold text-white">Cancel</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

export default RideCard;
