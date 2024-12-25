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
import { Audio } from "expo-av";
import axios from "axios";
// import * as FileSystem from "expo-file-system";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/FontAwesome";
import { checkNumberIsCorrect } from "./utils/helpers";
import * as SplashScreen from 'expo-splash-screen';

export default function App() {
  useEffect(() => {
    // Prevent the splash screen from auto-hiding
    SplashScreen.preventAutoHideAsync();

    const prepareApp = async () => {
      // Perform any initial app setup (e.g., loading fonts or assets)
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate a delay

      // Hide the splash screen once the app is ready
      SplashScreen.hideAsync();
    };

    prepareApp();
  }, []);

  const [speed, setSpeed] = useState<number>(0); // Speed in kph/km/h
  const [tracking, setTracking] = useState(false);
  const [pause, setPause] = useState(false);
  const [maxSpeedReached, setMaxSpeedReached] = useState(false);

  const [maxSpeed, setMaxSpeed] = useState(60); // Default max speed
  const [inputSpeed, setInputSpeed] = useState(""); // Input field value for max speed
  const [selectedSpeed, setSelectedSpeed] = useState(60);
  const [drpDownSpeed, setDrpDownSpeed] = useState([60, 70, 80, 90, 100]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const handleInputChange = (text: string) => {
    setInputSpeed(text);
    // If the user manually enters a speed, sync the dropdown to match it
    if (
      text &&
      !drpDownSpeed.includes(Number(text)) &&
      checkNumberIsCorrect(Number(text))
    ) {
      // setSelectedSpeed(Number(text)); // Set the dropdown value to the custom input value
      setTimeout(() => {
        const newDrpSped = [...drpDownSpeed, Number(text)];
        // save sorting nos in asc order
        setDrpDownSpeed(newDrpSped.sort((a, b) => a - b));
      }, 2000);
    }
  };

  const handleSelectChange = (text: string) => {
    setInputSpeed(text);
    setMaxSpeed(Number(text));
    setInputSpeed("");
    // If the user manually enters a speed, sync the dropdown to match it
    if (text && !drpDownSpeed.includes(Number(text))) {
      setSelectedSpeed(Number(text)); // Set the dropdown value to the custom input value
      setMaxSpeed(Number(text));
      setTimeout(() => {
        const newDrpSped = [...drpDownSpeed, Number(text)];
        setDrpDownSpeed(newDrpSped.sort());
      }, 2000);
    }
  };

  // Function to load and play sound
  const playWarningSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      require("./assets/warning.mp3")
    );
    setSound(newSound);

    await newSound.playAsync();
  };

  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = React.useState<any>({});
  const [transcription, setTranscription] = useState<string | null>(null); // store the transcribed text

  let subscription: { remove: any } | null = null;

  useEffect(() => {
    setMaxSpeedReached(speed > maxSpeed);
    if (speed > maxSpeed) {
      playWarningSound();
    }
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
          timeInterval: 300,
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

  useEffect(() => {
    async function startRecording() {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        // Starting recording
        // Create a new recording instance
        const newRecording = new Audio.Recording();
        setRecordings([]);
        await newRecording.prepareToRecordAsync({
          android: {
            extension: ".wav",
            outputFormat: 2, // Default output format
            audioEncoder: 0, // Default audio encoder
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: ".wav",
            audioQuality: 256, // High audio quality
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: "audio/webm",
            bitsPerSecond: 128000, // Set bit rate for web recording
          },
        });

        await newRecording.startAsync();
        setRecording(newRecording);
      } catch (err) {
        console.error("Failed to start recording", err);
      }
    }

    async function stopRecording() {
      if (!recording) return;
      // let allRecordings = [...recordings];
      setRecordings({});
      await recording.stopAndUnloadAsync();
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const val = {
        sound: sound,
        file: recording.getURI(),
      };

      setRecordings(val);
      setRecording(null);
      // start transcription after recording
      // const uri = val.file;
      // await transcribeAudio(uri);
    }

    if (listening) {
      startRecording();
    }

    if (!listening) {
      stopRecording();
    }

    // Cleanup when component unmounts
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [listening]);

  function getRecordingLines() {
    return (
      <View>
        <View style={styles.btnContainer}>
          <Text>
            Recording #{} | {recordings.duration}
          </Text>
          <Text onPress={() => recordings.sound.replayAsync()}>
            <Icon name="play" size={20} color="#888" /> Play
          </Text>
        </View>
      </View>
    );
  }

  //  to send the audio file to OpenAI Whisper API
  async function transcribeAudio(fileUri: string | null) {
    // No file URI provided for transcription
    if (!fileUri) {
      return;
    }

    try {
      // Transcribing audio

      // set file with the Blob type of wav for the recorded audio
      const file = {
        uri: fileUri,
        name: "audio.wav",
        type: "audio/wav", // MIME type
      };

      const formData = new FormData();
      // Cast file to any type, as FormData expects a Blob or string
      formData.append("file", file as any);
      // OpenAI Whisper API model
      formData.append("model", "whisper-1");

      const OPENAI_API_KEY = `${process.env.OPENAI_API_KEY}`;

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      console.log("Transcription response:", response.data.text);
      setTranscription(response.data.text); // Update transcription state
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
    }
  }

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
            {speed} kph
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
          {/* recordings */}
          {/* {Object.entries(recordings).length > 0 && getRecordingLines()} */}
          <Text style={styles.subTitle}>Set maximum speed</Text>
          <Text style={styles.speed}>Max Speed: {maxSpeed} kph</Text>
          <View style={styles.maxSpeedActionContainer}>
            {/* Dropdown (Select Speed) */}
            <View style={styles.inputWrapper}>
              <View style={styles.dropdownWrapper}>
                <Picker
                  style={styles.dropdown}
                  onValueChange={handleSelectChange}
                  // setSelectedSpeed(itemValue);
                  // setInputSpeed(itemValue);
                >
                  {drpDownSpeed.map((speed, index) => (
                    <Picker.Item
                      key={index}
                      label={String(speed)}
                      value={String(speed)}
                    />
                  ))}
                </Picker>
              </View>
              {/* Input max speed */}
              <TextInput
                keyboardType="numeric"
                value={inputSpeed}
                style={styles.input}
                placeholder="Enter speed"
                onChangeText={handleInputChange}
                maxLength={3}
              />
              {/* Input with Save Button */}
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
  dropdownWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    height: 50,
    width: 65, // Adjust the width as needed
  },
  dropdown: {
    flex: 1,
    height: 50,
    color: "#000",
  },
});
