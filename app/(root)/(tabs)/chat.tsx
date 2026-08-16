import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/Cards";
import { useFetch } from "@/lib/fetch";
import { Ride } from "@/types/type";

// DRIVER APP — chat list. A thread only exists once a booking is accepted:
// before that there's nobody to talk to, and after cancellation it closes.

const Chat = () => {
  const { user } = useUser();

  const state = useFetch<Ride[]>(
    `/(api)/driver/requests?clerkId=${encodeURIComponent(user?.id ?? "")}`,
  );
  const { data, loading } = state;
  const refetch = (state as any).refetch as (() => void) | undefined;

  useFocusEffect(
    useCallback(() => {
      refetch?.();
    }, [refetch]),
  );

  const threads = useMemo(() => {
    const rides = Array.isArray(data) ? data : [];
    return rides.filter((r: any) =>
      ["accepted", "in_progress", "completed"].includes(r.status ?? ""),
    );
  }, [data]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F8F6]">
      <FlatList
        data={threads}
        keyExtractor={(item: any, i) => `${item.ride_id ?? i}`}
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }: any) => {
          const name = item.passenger
            ? `${item.passenger.first_name ?? ""} ${item.passenger.last_name ?? ""}`.trim()
            : "Passenger";
          const active = ["accepted", "in_progress"].includes(item.status);

          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(root)/chat/[rideId]",
                  params: { rideId: String(item.ride_id) },
                })
              }
              className="mb-3 flex-row items-center rounded-2xl border border-[#E2E9E5] bg-white p-4 active:opacity-80"
            >
              {item.passenger?.profile_image_url ? (
                <Image
                  source={{ uri: item.passenger.profile_image_url }}
                  className="h-12 w-12 rounded-full bg-[#EEF1F0]"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#E6F2EC]">
                  <Ionicons name="person" size={20} color="#0E5C3F" />
                </View>
              )}

              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-[14.5px] font-JakartaBold text-[#101814]"
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  {active && <View className="h-2 w-2 rounded-full bg-[#1FB574]" />}
                </View>
                <Text
                  className="mt-0.5 text-[12px] font-Jakarta text-[#68756F]"
                  numberOfLines={1}
                >
                  {item.destination_address}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#9BA6A1" />
            </Pressable>
          );
        }}
        ListHeaderComponent={
          <View className="flex-row items-center gap-3 pb-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-xl border border-[#E2E9E5] bg-white active:opacity-70"
            >
              <Ionicons name="chevron-back" size={20} color="#101814" />
            </Pressable>
            <Text className="text-2xl font-JakartaExtraBold text-[#101814]">
              Messages
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#0E5C3F" />
            </View>
          ) : (
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No conversations yet"
              message="Accept a booking and you can message that passenger here about pickup."
              actionLabel="View bookings"
              onAction={() => router.push("/(root)/(tabs)/requests")}
            />
          )
        }
      />
    </SafeAreaView>
  );
};

export default Chat;