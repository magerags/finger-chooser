import { useState, useCallback } from "react";
import { GestureResponderEvent } from "react-native";

export type Touch = { id: number; x: number; y: number };

export default function useMultiTouch(maxTouches = 5) {
  const [touches, setTouches] = useState<Touch[]>([]);

  const onTouchStart = useCallback((e: GestureResponderEvent) => {
    const newTouches = e.nativeEvent.touches.map((t) => ({
      id: t.identifier,
      x: t.pageX,
      y: t.pageY,
    }));
    setTouches((old) => {
      const merged = [
        ...old,
        ...newTouches.filter((nt) => !old.find((o) => o.id === nt.id)),
      ];
      return merged.slice(0, maxTouches);
    });
  }, []);

  const onTouchEnd = useCallback((e: GestureResponderEvent) => {
    const endedIds = e.nativeEvent.changedTouches.map((t) => t.identifier);
    setTouches((old) => old.filter((t) => !endedIds.includes(t.id)));
  }, []);

  return { touches, onTouchStart, onTouchEnd };
}
