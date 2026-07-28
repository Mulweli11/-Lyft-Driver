import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";

const TabIcon = ({
  focused,
  label,
  name,
  rand,
}: {
  focused: boolean;
  label: string;
  name?: keyof typeof Ionicons.glyphMap;
  /** Draw a Rand symbol instead of an icon (there is no rand Ionicon). */
  rand?: boolean;
}) => (
  <View className="w-16 items-center justify-center gap-1 pt-1">
    <View
      className={`h-9 w-14 items-center justify-center rounded-2xl ${
        focused ? "bg-[#1FB574]" : "bg-transparent"
      }`}
    >
      {rand ? (
        <Text
          className="text-[17px] font-JakartaExtraBold"
          style={{ color: focused ? "#FFFFFF" : "rgba(255,255,255,0.45)" }}
        >
          R
        </Text>
      ) : (
        <Ionicons
          name={name!}
          size={19}
          color={focused ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
        />
      )}
    </View>
    <Text
      className={`text-[9.5px] ${
        focused
          ? "font-JakartaBold text-white"
          : "font-JakartaMedium text-white/45"
      }`}
    >
      {label}
    </Text>
  </View>
);

export default function Layout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#06231A",
          borderRadius: 26,
          height: 78,
          paddingTop: 8,
          paddingBottom: 8,
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 20,
          borderTopWidth: 0,
          borderWidth: 0,
          shadowColor: "#06231A",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.28,
          shadowRadius: 22,
          elevation: 14,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="car-sport" label="Trips" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon rand label="Earnings" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="chatbubbles" label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}