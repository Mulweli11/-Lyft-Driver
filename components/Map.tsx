import React from "react";
import { ActivityIndicator, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import customMapStyle from "@/constants/mapStyle";
import { calculateRegion } from "@/lib/map";
import { useLocationStore } from "@/store";

export default function Map({
  passengerLatitude,
  passengerLongitude,
  passengerAddress,
}: {
  passengerLatitude?: number | null;
  passengerLongitude?: number | null;
  passengerAddress?: string | null;
}) {
  const { userLatitude, userLongitude } = useLocationStore();

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude: passengerLatitude ?? null,
    destinationLongitude: passengerLongitude ?? null,
  });

  if (userLatitude == null || userLongitude == null) {
    return (
      <View className="flex-1 items-center justify-center bg-[#DDEAF7]">
        <ActivityIndicator size="large" color="#1B2C4D" />
      </View>
    );
  }

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={{ flex: 1 }}
      initialRegion={region}
      followsUserLocation
      showsCompass={false}
      showsMyLocationButton={false}
      customMapStyle={customMapStyle}
      mapType="standard"
      userInterfaceStyle="light"
    >
      <Marker
        coordinate={{
          latitude: userLatitude,
          longitude: userLongitude,
        }}
        title="Your location"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: "#F7A13B",
            borderWidth: 4,
            borderColor: "#F4F7FB",
            shadowColor: "#1B2C4D",
            shadowOpacity: 0.35,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }}
        />
      </Marker>

      {passengerLatitude != null && passengerLongitude != null && (
        <Marker
          coordinate={{
            latitude: passengerLatitude,
            longitude: passengerLongitude,
          }}
          title={passengerAddress ?? "Passenger pickup"}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: "#00155F",
              borderWidth: 4,
              borderColor: "#FFFFFF",
              shadowColor: "#00155F",
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          />
        </Marker>
      )}
    </MapView>
  );
}
