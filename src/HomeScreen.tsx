import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  SharedValue,
  withSpring,
  withRepeat,
  cancelAnimation,
  runOnJS,
  withTiming,
  useAnimatedReaction,
  useAnimatedProps,
  withSequence,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedSVGCircle = Animated.createAnimatedComponent(Circle);

interface FingerSlot {
  id: SharedValue<number | null>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  isActive: SharedValue<number>;
  scale: SharedValue<number>;
}

const MAX_FINGERS = 5;
const CIRCLE_RADIUS = 65;
const SVG_CIRCLE_STROKE_WIDTH = 12;
const STABILITY_DELAY = 500;
const PULSE_COUNTDOWN_DELAY = 3000;

type GamePhase = "idle" | "waiting_stability" | "pulsing" | "winner_selected";

const HomeScreen = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [debugFingerCount, setDebugFingerCount] = useState(0);
  const [winnerSlotId, setWinnerSlotId] = useState<number | null>(null);
  const stabilityTimerId = useRef<NodeJS.Timeout | null>(null);
  const pulseCountdownTimerId = useRef<NodeJS.Timeout | null>(null);
  const activeFingerCount = useSharedValue(0);
  const instructionTextOpacity = useSharedValue(1);

  const fingerSlots = Array.from({ length: MAX_FINGERS }).map(() => ({
    id: useSharedValue<number | null>(null),
    x: useSharedValue(0),
    y: useSharedValue(0),
    isActive: useSharedValue(0),
    scale: useSharedValue(0),
  }));

  useAnimatedReaction(
    () => activeFingerCount.value,
    (currentActiveFingers) => {
      if (currentActiveFingers > 0 && instructionTextOpacity.value !== 0) {
        instructionTextOpacity.value = withTiming(0, { duration: 300 });
      } else if (
        currentActiveFingers === 0 &&
        instructionTextOpacity.value !== 1
      ) {
        instructionTextOpacity.value = withTiming(1, { duration: 300 });
      }
    },
    [activeFingerCount, instructionTextOpacity]
  );

  const instructionAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: instructionTextOpacity.value,
    };
  });

  const clearStabilityTimer = () => {
    if (stabilityTimerId.current) {
      clearTimeout(stabilityTimerId.current);
      stabilityTimerId.current = null;
    }
  };

  const clearPulseCountdownTimer = () => {
    if (pulseCountdownTimerId.current) {
      clearTimeout(pulseCountdownTimerId.current);
      pulseCountdownTimerId.current = null;
    }
  };

  const onPulseCountdownFinished = () => {
    setGamePhase("winner_selected");
  };

  const onStabilityPeriodMet = () => {
    if (activeFingerCount.value <= 1) {
      setGamePhase("idle");
      clearPulseCountdownTimer();
      return;
    }
    setGamePhase("pulsing");
    pulseCountdownTimerId.current = setTimeout(
      onPulseCountdownFinished,
      PULSE_COUNTDOWN_DELAY
    );
  };

  const resetGameToStart = () => {
    startStabilityTimer();
  };

  const startStabilityTimer = () => {
    clearStabilityTimer();
    clearPulseCountdownTimer();
    setWinnerSlotId(null);

    if (activeFingerCount.value > 1) {
      setGamePhase("waiting_stability");
      stabilityTimerId.current = setTimeout(
        onStabilityPeriodMet,
        STABILITY_DELAY
      );
    } else {
      setGamePhase("idle");
    }
  };

  // Function to trigger haptic feedback from JS thread
  const triggerTouchDownHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  useEffect(() => {
    if (gamePhase === "pulsing") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setWinnerSlotId(null);
      fingerSlots.forEach((slot) => {
        if (slot.isActive.value === 1) {
          slot.scale.value = withRepeat(
            withSpring(1.3, { damping: 15, stiffness: 170 }),
            -1,
            true
          );
        }
      });
    } else if (gamePhase === "winner_selected") {
      const activeSlots = fingerSlots.filter(
        (slot) => slot.isActive.value === 1 && slot.id.value !== null
      );

      if (activeSlots.length > 0 && winnerSlotId === null) {
        const winnerIndex = Math.floor(Math.random() * activeSlots.length);
        const currentWinnerSlot = activeSlots[winnerIndex];
        runOnJS(setWinnerSlotId)(currentWinnerSlot.id.value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        activeSlots.forEach((slotInEffect) => {
          cancelAnimation(slotInEffect.scale);
          if (slotInEffect.id.value === currentWinnerSlot.id.value) {
            slotInEffect.scale.value = withSequence(
              withSpring(1.5, {
                damping: 5,
                stiffness: 400,
                velocity: 10,
                mass: 2,
                restSpeedThreshold: 0.001,
                restDisplacementThreshold: 0.001,
              })
            );
            slotInEffect.isActive.value = 1;
          } else {
            slotInEffect.isActive.value = withTiming(0, { duration: 300 });
            slotInEffect.scale.value = withTiming(0.8, { duration: 300 });
          }
        });
      } else if (activeSlots.length === 0 && winnerSlotId !== null) {
        runOnJS(resetGameToStart)();
      } else if (activeSlots.length === 0 && winnerSlotId === null) {
        runOnJS(setGamePhase)("idle");
      }
    } else if (gamePhase === "idle" || gamePhase === "waiting_stability") {
      if (winnerSlotId !== null) runOnJS(setWinnerSlotId)(null);
      fingerSlots.forEach((slot) => {
        cancelAnimation(slot.scale);
        slot.scale.value = 1;
      });
      clearPulseCountdownTimer();
    }
    return () => {};
  }, [gamePhase, winnerSlotId]);

  const resetAllWorkletAndJSState = () => {
    "worklet";
    for (const slot of fingerSlots) {
      slot.isActive.value = 0;
      slot.id.value = null;
      cancelAnimation(slot.scale);
      slot.scale.value = 1;
    }
    activeFingerCount.value = 0;
    runOnJS(setDebugFingerCount)(0);
    runOnJS(setWinnerSlotId)(null);
    runOnJS(setGamePhase)("idle");
    runOnJS(clearStabilityTimer)();
    runOnJS(clearPulseCountdownTimer)();
  };

  const gesture = Gesture.Manual()
    .onTouchesDown((event, stateManager) => {
      "worklet";
      const wasWinnerPhaseBeforeTouch = gamePhase === "winner_selected";

      let newFingersProcessedCount = 0;
      event.changedTouches.forEach((touch) => {
        if (activeFingerCount.value >= MAX_FINGERS) return;
        for (const slot of fingerSlots) {
          if (slot.isActive.value === 0 && slot.id.value === null) {
            slot.id.value = touch.id;
            slot.x.value = touch.x;
            slot.y.value = touch.y;
            slot.isActive.value = 1;

            slot.scale.value = withSequence(
              withTiming(1.3, { duration: 100 }),
              withSpring(
                1,
                {
                  damping: 6,
                  stiffness: 120,
                  restSpeedThreshold: 0.001,
                  restDisplacementThreshold: 0.001,
                },
                (finished) => {
                  if (finished && slot.isActive.value === 1) {
                    runOnJS(resetGameToStart)();
                  }
                }
              )
            );

            activeFingerCount.value += 1;
            newFingersProcessedCount++;
            break;
          }
        }
      });

      if (newFingersProcessedCount > 0) {
        runOnJS(triggerTouchDownHaptic)();
        runOnJS(setDebugFingerCount)(activeFingerCount.value);
      }
    })
    .onTouchesMove((event, stateManager) => {
      "worklet";
      event.changedTouches.forEach((touch) => {
        for (const slot of fingerSlots) {
          if (slot.id.value === touch.id) {
            slot.x.value = touch.x;
            slot.y.value = touch.y;
            break;
          }
        }
      });
    })
    .onTouchesUp((event, stateManager) => {
      "worklet";
      let fingersRemoved = 0;
      let winnerLifted = false;
      event.changedTouches.forEach((touch) => {
        for (const slot of fingerSlots) {
          if (slot.id.value === touch.id) {
            if (
              gamePhase === "winner_selected" &&
              slot.id.value === winnerSlotId
            ) {
              winnerLifted = true;
            }
            slot.isActive.value = 0;
            slot.id.value = null;
            cancelAnimation(slot.scale);
            slot.scale.value = 1;
            activeFingerCount.value -= 1;
            fingersRemoved++;
            break;
          }
        }
      });
      if (fingersRemoved > 0) {
        runOnJS(setDebugFingerCount)(activeFingerCount.value);
        if (winnerLifted) {
          runOnJS(resetGameToStart)();
        } else if (gamePhase !== "winner_selected") {
          runOnJS(resetGameToStart)();
        }
      }
    })
    .onTouchesCancelled(() => {
      "worklet";
      resetAllWorkletAndJSState();
    })
    .onEnd(() => {
      "worklet";
      if (activeFingerCount.value > 0 && gamePhase !== "winner_selected") {
        resetAllWorkletAndJSState();
      } else if (
        activeFingerCount.value === 0 &&
        gamePhase === "winner_selected"
      ) {
        runOnJS(resetGameToStart)();
      } else if (gamePhase === "winner_selected" && winnerSlotId === null) {
        runOnJS(resetGameToStart)();
      }
    });

  return (
    <LinearGradient
      colors={["#ff5e62", "#ff9966"]}
      style={styles.gradientContainer}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.touchArea}>
          <View style={styles.textContainer}>
            <Animated.Text
              style={[styles.instructionText, instructionAnimatedStyle]}
            >
              Place up to 5 fingers
            </Animated.Text>
          </View>
          {fingerSlots.map((slot, index) => (
            <AnimatedCircle
              key={index}
              slot={slot}
              gamePhase={gamePhase}
              winnerSlotId={winnerSlotId}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </LinearGradient>
  );
};

const AnimatedCircle = ({
  slot,
  gamePhase,
  winnerSlotId,
}: {
  slot: FingerSlot;
  gamePhase: GamePhase;
  winnerSlotId: number | null;
}) => {
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: slot.x.value - CIRCLE_RADIUS,
      top: slot.y.value - CIRCLE_RADIUS,
      width: CIRCLE_RADIUS * 2,
      height: CIRCLE_RADIUS * 2,
      opacity: slot.isActive.value === 0 ? 0 : 1,
      transform: [{ scale: slot.scale.value }],
      shadowColor: "#ffffff99",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: slot.isActive.value === 0 ? 0 : 0.8,
      shadowRadius: 10,
      elevation: slot.isActive.value === 0 ? 0 : 5,
    };
  });

  const animatedSvgProps = useAnimatedProps(() => {
    const isWinner = slot.id.value !== null && slot.id.value === winnerSlotId;
    let circleFill = "transparent";
    if (gamePhase === "winner_selected" && isWinner) {
      circleFill = "rgba(255, 255, 255, 1)";
    }

    return {
      fill: circleFill,
      strokeWidth: slot.isActive.value === 1 ? SVG_CIRCLE_STROKE_WIDTH : 1,
    };
  });

  return (
    <Animated.View style={containerAnimatedStyle}>
      <Svg
        height={CIRCLE_RADIUS * 2}
        width={CIRCLE_RADIUS * 2}
        pointerEvents="none"
      >
        <AnimatedSVGCircle
          cx={CIRCLE_RADIUS}
          cy={CIRCLE_RADIUS}
          r={CIRCLE_RADIUS - SVG_CIRCLE_STROKE_WIDTH / 2}
          stroke="white"
          animatedProps={animatedSvgProps}
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  touchArea: {
    flex: 1,
    backgroundColor: "transparent",
    width: "100%",
    height: "100%",
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  instructionText: {
    color: "#ffffff99",
    fontSize: 20,
    textAlign: "center",
    zIndex: 10,
  },
  debugText: {
    color: "white",
    position: "absolute",
    top: 50,
    left: 10,
    fontSize: 16,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});

export default HomeScreen;
