import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";

type Hub = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type MapProps = {
  passengerLatitude?: number | null;
  passengerLongitude?: number | null;
  passengerAddress?: string | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  dropoffAddress?: string | null;
};

type Point = {
  latitude: number;
  longitude: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const getPosition = (point: Point, points: Point[]) => {
  const latitudes = points.map(({ latitude }) => latitude);
  const longitudes = points.map(({ longitude }) => longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.01);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.01);

  return {
    left: `${12 + ((point.longitude - minLongitude) / longitudeRange) * 76}%` as `${number}%`,
    top: `${12 + ((maxLatitude - point.latitude) / latitudeRange) * 72}%` as `${number}%`,
  };
};

export default function Map({
  passengerLatitude,
  passengerLongitude,
  passengerAddress,
  dropoffLatitude,
  dropoffLongitude,
  dropoffAddress,
}: MapProps) {
  const { userLatitude, userLongitude } = useLocationStore();
  const [hubs, setHubs] = useState<Hub[]>([]);

  useEffect(() => {
    let ignore = false;

    void fetchAPI("/(api)/hubs")
      .then((result) => {
        const nextHubs = Array.isArray(result?.data)
          ? result.data
              .map((hub: Partial<Hub>) => ({
                ...hub,
                latitude: Number(hub.latitude),
                longitude: Number(hub.longitude),
              }))
              .filter(
                (hub: Partial<Hub>) =>
                  Number.isFinite(hub.latitude) && Number.isFinite(hub.longitude),
              )
          : [];

        if (!ignore) {
          setHubs(nextHubs as Hub[]);
        }
      })
      .catch((error) => {
        console.warn("Unable to load hubs", error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const hubPoints: Point[] = hubs.map((hub) => ({
    latitude: hub.latitude,
    longitude: hub.longitude,
    label: hub.name,
    color: "#0E5C3F",
    icon: "business",
  }));
  const tripPoints: Point[] = [
    ...(userLatitude != null && userLongitude != null
      ? [{ latitude: userLatitude, longitude: userLongitude, label: "Your location", color: "#F7A13B", icon: "navigate" as const }]
      : []),
    ...(passengerLatitude != null && passengerLongitude != null
      ? [{ latitude: passengerLatitude, longitude: passengerLongitude, label: passengerAddress ?? "Pickup", color: "#00155F", icon: "person" as const }]
      : []),
    ...(dropoffLatitude != null && dropoffLongitude != null
      ? [{ latitude: dropoffLatitude, longitude: dropoffLongitude, label: dropoffAddress ?? "Drop-off", color: "#FF7F50", icon: "location-sharp" as const }]
      : []),
  ];
  const points = [...hubPoints, ...tripPoints];

  return (
    <View className="relative flex-1 overflow-hidden bg-[#DDEAF7]">
      <View className="absolute inset-0 opacity-40" style={{ backgroundColor: "#C9E3D7" }} />
      <View className="absolute inset-0" style={{ backgroundImage: "linear-gradient(35deg, transparent 48%, #ffffff 49%, #ffffff 51%, transparent 52%), linear-gradient(120deg, transparent 48%, #ffffff 49%, #ffffff 51%, transparent 52%)", backgroundSize: "180px 140px" } as never} />

      {points.length > 0 && points.map((point) => {
        const position = getPosition(point, points);

        return (
          <View key={`${point.label}-${point.latitude}-${point.longitude}`} className="absolute items-center" style={position}>
            <View className="items-center rounded-full border-2 border-white p-1 shadow-lg" style={{ backgroundColor: point.color }}>
              <Ionicons name={point.icon} size={15} color="#FFFFFF" />
            </View>
            <Text className="mt-1 max-w-[150px] rounded-md bg-white/70 px-2 py-1 text-center text-[10px] font-JakartaBold text-[#1B2C4D]" numberOfLines={1}>
              {point.label}
            </Text>
          </View>
        );
      })}

      <View className="absolute inset-x-4 bottom-4 flex-row items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-[#0E5C3F]" />
          <Text className="text-[11px] font-JakartaBold text-[#1B2C4D]">Active hubs</Text>
        </View>
        <Text className="text-[11px] font-JakartaMedium text-[#68756F]">{hubs.length} available</Text>
      </View>
    </View>
  );
}