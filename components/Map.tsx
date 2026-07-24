import React from "react";
import { ActivityIndicator, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { icons } from "@/constants";
import { calculateRegion } from "@/lib/map";
import { useLocationStore } from "@/store";

export default function Map() {
  const { userLatitude, userLongitude } = useLocationStore();

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude: null,
    destinationLongitude: null,
  });

  if (userLatitude == null || userLongitude == null) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0286FF" />
      </View>
    );
  }

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={{ flex: 1 }}
      initialRegion={region}
      followsUserLocation
      mapType="standard"
      userInterfaceStyle="light"
    >
      <Marker
        coordinate={{
          latitude: userLatitude,
          longitude: userLongitude,
        }}
        title="Your location"
        image={icons.marker}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </MapView>
  );
}