import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { StyleSheet } from "react-native";
import HomeScreen from "./HomeScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

export default function App() {
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
