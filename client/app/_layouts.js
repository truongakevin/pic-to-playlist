import { Stack } from "expo-router";
import { useFonts } from 'expo-font';

export default function RootLayout() {
//   const [loaded] = useFonts({
//     'CircularStd-Bold': require('../assets/fonts/CircularStd-Bold.ttf'),
//     'CircularStd': require('../assets/fonts/CircularStd.ttf'),
//   });

  return (
    <Stack>
      <Stack.Screen name="index" />
    </Stack>
  );
}
