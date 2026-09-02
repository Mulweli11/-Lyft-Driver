import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let Polyline: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== "web") {
  const reactNativeMaps = require("react-native-maps");
  MapView = reactNativeMaps.default;
  Marker = reactNativeMaps.Marker;
  Circle = reactNativeMaps.Circle;
  Polyline = reactNativeMaps.Polyline;
  PROVIDER_DEFAULT = reactNativeMaps.PROVIDER_DEFAULT;
}

import customMapStyle from "@/constants/mapStyle";
import { fetchAPI } from "@/lib/fetch";
import { calculateRegion, fetchRouteCoordinates } from "@/lib/map";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocationStore } from "@/store";

type Hub = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
};

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
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [pickupToDropoffRoute, setPickupToDropoffRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);

  useEffect(() => {
    let ignore = false;

    const loadHubs = async () => {
      try {
        const result =
          Platform.OS === "web"
            ? await fetchAPI("/(api)/hubs")
            : await (async () => {
                const supabase = await getSupabaseClient();
                const { data, error } = await supabase
                  .from("hubs")
                  .select("id, name, address, latitude, longitude, radius")
                  .eq("status", "active")
                  .order("name");

                if (error) {
                  throw error;
                }

                return { data };
              })();
        const nextHubs = Array.isArray(result?.data)
          ? result.data
              .map((hub: Partial<Hub>) => ({
                ...hub,
                latitude: Number(hub.latitude),
                longitude: Number(hub.longitude),
                radius: Number(hub.radius ?? 500),
              }))
              .filter(
                (hub: Partial<Hub>) =>
                  Number.isFinite(hub.latitude) && Number.isFinite(hub.longitude),
              )
          : [];

        if (!ignore) {
          setHubs(nextHubs as Hub[]);
        }
      } catch (error) {
        if (!ignore) {
          setHubs([]);
        }
        console.warn("Unable to load hubs", error);
      }
    };

    void loadHubs();

    return () => {
      ignore = true;
    };
  }, []);

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

  if (Platform.OS === "web" || !MapView || !Marker || !Circle || !Polyline) {
    return (
      <View className="flex-1 items-center justify-center bg-[#DDEAF7] px-6">
        <Text className="text-center text-[13px] font-Jakarta text-[#0E5C3F]">
          Map preview is available on mobile. Your trip details are still available below.
        </Text>
      </View>
    );
  }

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
      {hubs.map((hub) => (
        <React.Fragment key={hub.id}>
          <Circle
            center={{ latitude: hub.latitude, longitude: hub.longitude }}
            radius={hub.radius}
            fillColor="rgba(14, 92, 63, 0.12)"
            strokeColor="rgba(14, 92, 63, 0.45)"
            strokeWidth={1}
          />
          <Marker
            coordinate={{ latitude: hub.latitude, longitude: hub.longitude }}
            title={hub.name}
            description={hub.address}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
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
              <Ionicons name="business" size={15} color="#FFFFFF" />
            </View>
          </Marker>
        </React.Fragment>
      ))}

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
