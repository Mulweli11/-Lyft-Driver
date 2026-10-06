import { useUser } from "@clerk/clerk-expo";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/Cards";
import RequestCard from "@/components/RequestCard";
import { brand, ui } from "@/constants/theme";
import { useFetch } from "@/lib/fetch";
import { Ride } from "@/types/type";

type Tab = "new" | "upcoming" | "past";

const Requests = () => {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("new");
  const [refreshing, setRefreshing] = useState(false);

  const state = useFetch<Ride[]>(
    `/(api)/driver/requests?clerkId=${encodeURIComponent(user?.id ?? "")}`,
  );
  const { data, loading, error } = state;
  const refetch = (state as any).refetch as (() => Promise<void> | void) | undefined;

  useFocusEffect(
    useCallback(() => {
      refetch?.();
    }, [refetch]),
  );

  const rides = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const groups = useMemo(() => {
    const status = (r: Ride) => (r as any).status ?? "booked";
    return {
      new: rides.filter((r) => status(r) === "booked"),
      upcoming: rides.filter((r) =>
        ["accepted", "in_progress"].includes(status(r)),
      ),
      past: rides.filter((r) =>
        ["completed", "cancelled"].includes(status(r)),
      ),
    };
  }, [rides]);

  const visible = groups[tab];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch?.();
    setRefreshing(false);
  };

  const TABS = [
    { key: "new" as const, label: "New", count: groups.new.length },
    { key: "upcoming" as const, label: "Upcoming", count: groups.upcoming.length },
    { key: "past" as const, label: "Past", count: groups.past.length },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4FB]">
      <FlatList
        data={visible}
        keyExtractor={(item, index) =>
          `${(item as any).ride_id ?? index}`
        }
        className="px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5A189A"
            colors={["#5A189A"]}
          />
        }
        renderItem={({ item }) => (
          <RequestCard ride={item} onChanged={() => refetch?.()} />
        )}
        ListHeaderComponent={
          <>
            <Text className="my-5 text-2xl font-JakartaExtraBold text-[#21152F]">
              Bookings
            </Text>

            <View className="mb-5 flex-row rounded-2xl bg-[#F0E6FA] p-1">
              {TABS.map((item) => {
                const active = tab === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setTab(item.key)}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                      active ? "bg-white" : ""
                    }`}
                  >
                    <Text
                      className={`text-[13px] ${
                        active
                          ? "font-JakartaBold text-[#5A189A]"
                          : "font-JakartaMedium text-[#746A7E]"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {item.count > 0 && (
                      <View
                        className={`rounded-full px-1.5 py-0.5 ${
                          item.key === "new"
                            ? "bg-[#E0575B]"
                            : active
                              ? "bg-[#F0E6FA]"
                              : "bg-[#E9E2F0]"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-JakartaBold ${
                            item.key === "new"
                              ? "text-white"
                              : active
                                ? "text-[#5A189A]"
                                : "text-[#746A7E]"
                          }`}
                        >
                          {item.count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {tab === "new" && groups.new.length > 0 && (
              <Text className="mb-3 text-[12px] font-Jakarta leading-4 text-[#A69BAF]">
                Passengers have paid and are waiting for you to accept. Replying
                quickly improves your rating.
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#5A189A" />
            </View>
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load bookings"
              message="Check your connection and pull down to try again."
            />
          ) : tab === "new" ? (
            <EmptyState
              icon="notifications-outline"
              title="No new bookings"
              message="When a passenger books a seat on one of your trips, it appears here for you to accept."
              actionLabel="Offer a trip"
              onAction={() => router.push("/(root)/create-trip")}
            />
          ) : tab === "upcoming" ? (
            <EmptyState
              icon="calendar-outline"
              title="Nothing accepted yet"
              message="Bookings you accept appear here until the trip is finished."
            />
          ) : (
            <EmptyState
              icon="time-outline"
              title="No past trips"
              message="Completed and cancelled bookings are kept here as your record."
            />
          )
        }
      />
    </SafeAreaView>
  );
};

export default Requests;
