import { Stack } from "expo-router";

const PURPLE_DEEP = "#1D1135";

const Layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        contentStyle: { backgroundColor: PURPLE_DEEP },
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{ animation: "fade", gestureEnabled: false }}
      />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
};

export default Layout;
