import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

import customMapStyle from "@/constants/mapStyle";
import { calculateRegion, fetchRouteCoordinates } from "@/lib/map";
import { useLocationStore } from "@/store";

export default function Map({
  passengerLatitude,
  passengerLongitude,
  passengerAddress,
  dropoffLatitude,
  dropoffLongitude,
  dropoffAddress,
}: {
  passengerLatitude?: number | null;
  passengerLongitude?: number | null;
  passengerAddress?: string | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  dropoffAddress?: string | null;
}) {
  const { userLatitude, userLongitude } = useLocationStore();
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [pickupToDropoffRoute, setPickupToDropoffRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);

  useEffect(() => {
    let ignore = false;

    const loadRoutes = async () => {
      if (userLatitude == null || userLongitude == null) {
        setDriverToPickupRoute([]);
        setPickupToDropoffRoute([]);
        return;
      }

      const driverToPickup =
        passengerLatitude != null && passengerLongitude != null
          ? await fetchRouteCoordinates({
              originLatitude: userLatitude,
              originLongitude: userLongitude,
              destinationLatitude: passengerLatitude,
              destinationLongitude: passengerLongitude,
            })
          : [];

      const pickupToDropoff =
        passengerLatitude != null &&
        passengerLongitude != null &&
        dropoffLatitude != null &&
        dropoffLongitude != null
          ? await fetchRouteCoordinates({
              originLatitude: passengerLatitude,
              originLongitude: passengerLongitude,
              destinationLatitude: dropoffLatitude,
              destinationLongitude: dropoffLongitude,
            })
          : [];

      if (!ignore) {
        setDriverToPickupRoute(driverToPickup);
        setPickupToDropoffRoute(pickupToDropoff);
      }
    };

    void loadRoutes();

    return () => {
      ignore = true;
    };
  }, [userLatitude, userLongitude, passengerLatitude, passengerLongitude, dropoffLatitude, dropoffLongitude]);

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude: dropoffLatitude ?? passengerLatitude ?? null,
    destinationLongitude: dropoffLongitude ?? passengerLongitude ?? null,
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
      {driverToPickupRoute.length > 1 && (
        <Polyline
          coordinates={driverToPickupRoute}
          strokeColor="#FF7F50"
          strokeWidth={5}
          lineDashPattern={[]}
        />
      )}

      {pickupToDropoffRoute.length > 1 && (
        <Polyline
          coordinates={pickupToDropoffRoute}
          strokeColor="#00155F"
          strokeWidth={4}
          lineDashPattern={[]}
        />
      )}


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
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "#00155F",
              borderWidth: 3,
              borderColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#00155F",
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Ionicons name="person" size={16} color="#FFFFFF" />
          </View>
        </Marker>
      )}

      {dropoffLatitude != null && dropoffLongitude != null && (
        <Marker
          coordinate={{
            latitude: dropoffLatitude,
            longitude: dropoffLongitude,
          }}
          title={dropoffAddress ?? "Drop-off location"}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "#0E5C3F",
              borderWidth: 3,
              borderColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0E5C3F",
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Ionicons name="location-sharp" size={15} color="#FFFFFF" />
          </View>
        </Marker>
      )}
    </MapView>
  );
}
