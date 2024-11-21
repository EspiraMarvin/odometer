import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Pressable,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from "react-native";
import * as Location from "expo-location";
import Icon from "react-native-vector-icons/FontAwesome";

export default function App() {
  const [speed, setSpeed] = useState<number>(0); // Speed in kph/km/h
  const [tracking, setTracking] = useState(false);
  const [pause, setPause] = useState(false);
  const [maxSpeedReached, setMaxSpeedReached] = useState(false);

  const [maxSpeed, setMaxSpeed] = useState(60); // Default max speed
  const [listening, setListening] = useState(false);
  const [inputSpeed, setInputSpeed] = useState(""); // Input field value for max speed

  let subscription: { remove: any } | null = null;

  useEffect(() => {
    setMaxSpeedReached(speed > maxSpeed);
  }, [speed, maxSpeed]);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    };

    const watchLocation = async () => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to monitor speed."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      // actively watch your location
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (position) => {
          const { speed } = position.coords;
          setSpeed(speed ? parseFloat((speed * 3.6).toFixed(2)) : 0);
        }
      );
    };

    if (tracking && !pause) {
      watchLocation();
    }

    if (!tracking && !pause) {
      setSpeed(0);
      setMaxSpeedReached(false);

      // Stop watching the location
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    }

    if (pause) {
      setPause(true);
    }

    return () => {
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    };
  }, [tracking, pause]);

  const handleSetSpeed = () => {
    const parsedSpeed = parseInt(inputSpeed, 10);
    if (Number.isNaN(parsedSpeed)) return;

    setMaxSpeed(parsedSpeed);

    if (isNaN(parsedSpeed) || parsedSpeed <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid speed greater than 0."
      );
      return;
    }

    setMaxSpeed(parsedSpeed);
    setInputSpeed("");
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#070406" />

      <View style={styles.container}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Odometer</Text>
          <Text style={styles.subTitle}>Real-Time Speed Monitor</Text>
          <Text
            style={[
              styles.speedTracked,
              { color: tracking ? "blue" : maxSpeedReached ? "red" : "green" },
            ]}
          >
            {speed} km/h
          </Text>

          <View style={styles.btnContainer}>
            {!pause && (
              <Pressable
                onPress={() => setTracking(!tracking)}
                style={[
                  styles.button,
                  { backgroundColor: tracking ? "red" : "blue" },
                ]}
              >
                <Text style={styles.buttonText}>
                  {tracking ? "Stop Tracking" : "Start Tracking"}
                </Text>
              </Pressable>
            )}
            <View style={styles.gap} />
            {tracking && (
              <Pressable
                onPress={() => setPause(!pause)}
                style={[styles.button, { backgroundColor: "#9E9EFF" }]}
              >
                <Text style={styles.pauseButtonText}>
                  {!pause ? "Pause" : "Continue"}
                </Text>
              </Pressable>
            )}
          </View>
          {maxSpeedReached && (
            <Text style={styles.maxSpeedWarntitle}>Max Speed Reached !</Text>
          )}
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.subTitle}>Set maximum speed</Text>
          <Text style={styles.speed}>Max Speed: {maxSpeed} km/h</Text>
          <View style={styles.maxSpeedActionContainer}>
            {/* Input with Save Button */}
            <View style={styles.inputWrapper}>
              <TextInput
                keyboardType="numeric"
                value={inputSpeed}
                style={styles.input}
                placeholder="Enter speed"
                onChangeText={setInputSpeed}
                maxLength={3}
              />
              <TouchableOpacity
                disabled={inputSpeed.length === 0}
                onPress={() => handleSetSpeed()}
                style={styles.saveMaxSpeedButton}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Microphone Icon */}
            <TouchableOpacity
              onPress={() => setListening(!listening)}
              style={styles.microphoneButton}
            >
              {!listening ? (
                <Icon name="microphone" size={20} color="#fff" />
              ) : (
                <Icon name="ellipsis-h" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 35,
    backgroundColor: "#fff",
  },
  topSection: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "light",
    marginBottom: 15,
  },
  subTitleII: {
    fontSize: 10,
    fontWeight: "light",
    marginBottom: 20,
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 4,
  },
  gap: {
    width: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "blue",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  pauseButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  speed: {
    fontSize: 26,
    color: "green",
    marginBottom: 30,
  },
  speedTracked: {
    fontSize: 48,
    color: "blue",
    marginTop: 5,
    marginBottom: 15,
  },
  maxSpeedWarntitle: {
    fontSize: 24,
    paddingTop: 25,
    color: "red",
  },
  saveMaxSpeedTextBtn: {
    paddingHorizontal: 10,
  },

  maxSpeedActionContainer: {
    flexDirection: "row",
    alignItems: "center", // Ensures all elements are vertically aligned
    paddingHorizontal: 10,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    height: 50,
    paddingHorizontal: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingLeft: 20,
    paddingVertical: 0,
  },
  saveMaxSpeedButton: {
    backgroundColor: "#3b5998",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    height: "100%",
    borderRadius: 8,
    marginLeft: 10,
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  microphoneButton: {
    backgroundColor: "#3b5998",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    height: 50,
    width: 50,
  },
});
