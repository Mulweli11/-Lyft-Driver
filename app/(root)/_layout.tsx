import { Stack } from "expo-router";

const GREEN_DEEP = "#06231A";

const Layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: GREEN_DEEP },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="create-trip" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="vehicle-details" />
      <Stack.Screen name="bank-details" />
      <Stack.Screen name="chat/[rideId]" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
};

export default Layout;