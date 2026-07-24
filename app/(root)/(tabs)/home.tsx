import { useUser } from "@clerk/clerk-expo";

import Map from "@/components/Map";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, TouchableWithoutFeedback, View } from "react-native";

const seatIcon = require("@/assets/images/car-seat.png");

const Home = () => {
  const { user } = useUser();
  const { setUserLocation, userLatitude, userLongitude } = useLocationStore();
  const [isOnline, setIsOnline] = useState(false);
  const [showOnlineSheet, setShowOnlineSheet] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(2);

  const persistDriverStatus = async (nextOnline: boolean, seats = availableSeats) => {
    if (!user?.id || userLatitude == null || userLongitude == null) {
      return;
    }

    try {
      await fetchAPI("/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          is_online: nextOnline,
          car_seats: seats,
          latitude: userLatitude,
          longitude: userLongitude,
          last_location_update: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn("Unable to update driver presence", error);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const nextAddress = `${address[0]?.name ?? "Current location"}, ${address[0]?.region ?? ""}`;

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: nextAddress,
      });
    })();
  }, [setUserLocation]);

  useEffect(() => {
    if (!user?.id || userLatitude == null || userLongitude == null) {
      return;
    }

    void persistDriverStatus(isOnline, availableSeats);
  }, [availableSeats, isOnline, user?.id, userLatitude, userLongitude]);

  return (
    <View className="flex-1 bg-white">
      <View className="absolute top-11 left-4 right-4 z-10 items-center">
        <Pressable
          onPress={() => {
            if (isOnline) {
              setIsOnline(false);
              void persistDriverStatus(false, availableSeats);
              return;
            }
            setShowOnlineSheet(true);
          }}
          className={`px-4 py-2 rounded-full ${isOnline ? "bg-green-600" : "bg-gray-600"}`}
        >
          <Text className="text-white font-semibold">
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showOnlineSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOnlineSheet(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOnlineSheet(false)}>
          <View className="flex-1 bg-black/30" />
        </TouchableWithoutFeedback>

        <View className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-6 py-4">
          <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />
          <Text className="text-lg font-semibold text-gray-900">Go online</Text>
          <Text className="mt-1 text-sm text-gray-600">
            You are about to start accepting ride requests.
          </Text>

          <View className="mt-4 flex-row items-center justify-between rounded-xl border border-gray-200 px-3 py-3">
            <View className="flex-row items-center gap-2">
              <Image source={seatIcon} className="h-5 w-5" resizeMode="contain" />
              <Text className="text-sm font-medium text-gray-700">Available seats</Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setAvailableSeats((prev) => Math.max(1, prev - 1))}
                className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <Text className="text-lg font-semibold text-gray-700">−</Text>
              </Pressable>

              <Text className="min-w-6 text-center text-base font-semibold text-gray-900">
                {availableSeats}
              </Text>

              <Pressable
                onPress={() => setAvailableSeats((prev) => prev + 1)}
                className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <Text className="text-lg font-semibold text-gray-700">+</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={() => setShowOnlineSheet(false)}
              className="flex-1 items-center rounded-xl border border-gray-300 py-2.5"
            >
              <Text className="font-medium text-gray-700">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsOnline(true);
                setShowOnlineSheet(false);
                void persistDriverStatus(true, availableSeats);
              }}
              className="flex-1 items-center rounded-xl bg-green-600 py-2.5"
            >
              <Text className="font-medium text-white">Go online</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Map />
    </View>
  );
};

export default Home;