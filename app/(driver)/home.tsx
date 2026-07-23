import { View, Text, Switch } from "react-native";
import { useState } from "react";

export default function DriverHome() {
  const [isOnline, setIsOnline] = useState(false);

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-3xl font-Jakarta-Bold mt-10">
        Driver Dashboard
      </Text>

      <View className="mt-10 bg-gray-100 rounded-2xl p-5">
        <Text className="text-lg font-Jakarta-SemiBold">
          Driver Status
        </Text>

        <View className="flex-row items-center justify-between mt-4">
          <Text className="text-base">
            {isOnline ? "Online" : "Offline"}
          </Text>

          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
          />
        </View>
      </View>

      <View className="mt-6 bg-blue-100 rounded-2xl p-5">
        <Text className="font-Jakarta-Bold text-lg">
          Today's Earnings
        </Text>

        <Text className="text-3xl mt-2 font-Jakarta-ExtraBold">
          R0.00
        </Text>
      </View>

      <View className="mt-6 bg-green-100 rounded-2xl p-5">
        <Text className="font-Jakarta-Bold text-lg">
          Completed Trips
        </Text>

        <Text className="text-3xl mt-2 font-Jakarta-ExtraBold">
          0
        </Text>
      </View>

      <View className="mt-6 bg-yellow-100 rounded-2xl p-5">
        <Text className="font-Jakarta-Bold text-lg">
          Ride Requests
        </Text>

        <Text className="text-base mt-2">
          No ride requests available.
        </Text>
      </View>
    </View>
  );
}