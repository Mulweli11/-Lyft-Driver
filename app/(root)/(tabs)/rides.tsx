import { useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import RideCard from "@/components/RideCard";
import { images } from "@/constants";
import { getSupabaseClient } from "@/lib/supabase";
import { Ride } from "@/types/type";

const Rides = () => {
  const { user, isLoaded } = useUser();
  const [rideRequests, setRideRequests] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRideRequests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const supabase = await getSupabaseClient();

      // Get the driver's ID from their clerk_id
      const { data: driver } = await supabase
        .from("drivers")
        .select("id, full_name, car_seats")
        .eq("clerk_id", user.id)
        .maybeSingle();

      if (!driver) {
        setRideRequests([]);
        setLoading(false);
        return;
      }

      // Fetch rides assigned to this driver with status 'booked'
      const { data: rides } = await supabase
        .from("rides")
        .select("ride_id, origin_address, destination_address, origin_latitude, origin_longitude, destination_latitude, destination_longitude, ride_time, fare_price, payment_status, created_at, user_id, status")
        .eq("driver_id", driver.id)
        .eq("status", "booked")
        .order("created_at", { ascending: false });

      const rideList = rides ?? [];
      const passengerIds = Array.from(
        new Set(rideList.map((ride: any) => ride.user_id).filter(Boolean)),
      );

      const passengerMap = new Map<string, { first_name: string; last_name: string }>();
      if (passengerIds.length > 0) {
        // Look up passengers from the `users` table using their clerk_id
        const { data: passengers } = await supabase
          .from("users")
          .select("clerk_id, name")
          .in("clerk_id", passengerIds);

        (passengers ?? []).forEach((passenger: any) => {
          const parts = (passenger.name || "Passenger").split(" ");
          passengerMap.set(passenger.clerk_id, {
            first_name: parts[0] || "Passenger",
            last_name: parts.slice(1).join(" ") || "",
          });
        });
      }

      const nameParts = (driver.full_name || "Driver").split(" ");

      const rideData = rideList.map((ride: any) => ({
        ...ride,
        driver: {
          first_name: nameParts[0] || "Driver",
          last_name: nameParts.slice(1).join(" ") || "",
          car_seats: driver.car_seats,
        },
        passenger:
          passengerMap.get(ride.user_id) ?? {
            first_name: "Passenger",
            last_name: "",
          },
      }));

      setRideRequests(rideData);
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      setRideRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded) {
      fetchRideRequests();
    }
  }, [isLoaded, fetchRideRequests]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={rideRequests}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => index.toString()}
        className="px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListEmptyComponent={() => (
          <View className="flex flex-col items-center justify-center">
            {loading ? (
              <ActivityIndicator size="large" color="#0286FF" />
            ) : (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No ride requests found"
                  resizeMode="contain"
                />
                <Text className="text-sm">No ride requests found</Text>
              </>
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <Text className="text-2xl font-JakartaBold my-5">Rides Request</Text>
          </>
        }
      />
    </SafeAreaView>
  );
};

export default Rides;