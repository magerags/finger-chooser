import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { StyleSheet } from "react-native";
import HomeScreen from "./HomeScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

export default function App() {
  SplashScreen.preventAutoHideAsync();

  SplashScreen.setOptions({
    duration: 400,
    fade: true,
  });

  useEffect(() => {
    const prepare = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await SplashScreen.hideAsync();
    };

    prepare();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <HomeScreen />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
