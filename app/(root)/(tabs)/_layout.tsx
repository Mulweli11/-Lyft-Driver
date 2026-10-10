import CustomTabBar from "@/components/CustomTabBar";
import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <CustomTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Trips",
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}