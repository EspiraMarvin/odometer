import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
} from "react-native";
import Geolocation from "react-native-geolocation-service";

export default function App() {
  const [speed, setSpeed] = useState<number>(0); // Speed in kph
  const [tracking, setTracking] = useState(false);
  const [maxSpeedReached, setMaxSpeedReached] = useState(false);

  const [maxSpeed, setMaxSpeed] = useState(60); // Default max speed
  const [listening, setListening] = useState(false);
  const [inputSpeed, setInputSpeed] = useState(""); // Input field value

  useEffect(() => {
    if (speed > maxSpeed) {
      setMaxSpeedReached(true);
    }
  }, [speed, maxSpeed]);

  useEffect(() => {
    // let watchId: any
    let watchId: number | null = null;

    const requestPermissions = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    };

    const startTracking = async () => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to monitor speed."
        );
        return;
      }

      watchId = Geolocation.watchPosition(
        (position) => {
          const { speed } = position.coords;
          console.log("SPEEED", speed);

          // Convert m/s to kph and ensure it's a number
          setSpeed(speed ? parseFloat((speed * 3.6).toFixed(2)) : 0);
        },
        (error) => {
          console.error(error);
          Alert.alert("Error", "Unable to fetch location.");
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 1, // Minimum distance (in meters) to trigger an update
          interval: 1000, // Update every second
          fastestInterval: 500,
        }
      );
    };

    // if (speed > maxSpeed) {
    //   setMaxSpeedReached(true);
    // }

    if (tracking) {
      startTracking();
    } else if (watchId) {
      Geolocation.clearWatch(watchId);
    }

    return () => {
      if (watchId) Geolocation.clearWatch(watchId);
    };
  }, [tracking]);

  const handleSetSpeed = () => {
    const parsedSpeed = parseInt(inputSpeed, 10);
    setMaxSpeed(parsedSpeed);

    if (isNaN(parsedSpeed) || parsedSpeed <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid speed greater than 0."
      );
      return;
    }

    setMaxSpeed(parsedSpeed); // Update the maximum speed
    setInputSpeed(""); // Clear the input field
  };

  return (
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
          {speed} kph
        </Text>

        <Button
          title={tracking ? "Stop Tracking" : "Start Tracking"}
          onPress={() => setTracking(!tracking)}
          color={tracking ? "red" : "blue"}
        />
        <Text style={styles.maxSpeedWarntitle}>Max Speed Reached!!</Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.subTitle}>Set maximum speed</Text>
        <Text style={styles.speed}>Max Speed: {maxSpeed} kph</Text>
        <TextInput
          style={styles.input}
          value={inputSpeed}
          onChangeText={setInputSpeed}
          keyboardType="numeric"
          placeholder="Enter speed"
          maxLength={3}
        />
        <View style={styles.saveMaxSpeedTextBtn}>
          <Button
            disabled={inputSpeed.length === 0}
            title="Set Speed"
            onPress={handleSetSpeed}
            color="blue"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    backgroundColor: "#fff",
  },
  topSection: {
    flex: 1, // Takes half the height of the screen
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    flex: 1, // Takes the other half
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "light",
    marginBottom: 20,
  },
  subTitleII: {
    fontSize: 10,
    fontWeight: "light",
    marginBottom: 20,
  },
  speed: {
    fontSize: 30,
    color: "green",
    marginBottom: 30,
  },
  speedTracked: {
    fontSize: 48,
    color: "blue",
    marginBottom: 30,
  },
  maxSpeedWarntitle: {
    fontSize: 38,
    paddingTop: 40,
    color: "red",
  },
  saveMaxSpeedTextBtn: {
    paddingHorizontal: 10,
  },
  inputLabel: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 10,
    color: "gray",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    width: "80%",
    textAlign: "center",
  },
});
