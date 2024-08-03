import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, Platform, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Font from 'expo-font';
import AHImage from 'react-native-image-auto-height';
import Playlist from './Playlist';
import Features from './Features';
let LinearGradient = Platform.OS === 'web' ? require('expo-linear-gradient').LinearGradient : require('react-native-linear-gradient').default;

async function loadFonts() {
  await Font.loadAsync({
    'CircularStd-Bold': require('./assets/fonts/CircularStd-Bold.ttf'),
    'CircularStd': require('./assets/fonts/CircularStd.ttf'),
  });
}

const CustomButton = ({ onPress, title }) => (
  <TouchableOpacity onPress={onPress} style={styles.button}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

export default function App() {

  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [image, setImage] = useState(null);
  const [features, setFeatures] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFonts().then(() => setFontsLoaded(true));
  }, []);

  const pickImage = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      console.log('Permission required', 'Permission to access camera roll is required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.cancelled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    let permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      console.log('Permission required', 'Permission to access camera is required!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.cancelled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    setFeatures([]); 
    setPlaylist([]); 
    setLoading(true);
    try {
      let formData = new FormData();
      if (Platform.OS === 'web') {
        let base64Response = await fetch(image);
        let blob = await base64Response.blob();
        formData.append('image', blob, 'photo.jpg');
      } else {
        let filename = image.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image`;
        formData.append('image', { uri: image, name: filename, type: type });
      }

      const response = await fetch(`${process.env.NODE_ADDRESS}` || 'http://localhost:3000', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFeatures(data.features);
        setPlaylist(data.playlist);
      } else {
        throw new Error('Failed to upload image');
      }
      setLoading(false);
    } catch (error) {
      alert("Error uploading image")
      console.log('Error uploading image: ' + error.message);
      console.error('Error uploading image:', error);
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}>
      <LinearGradient start={{x: 0, y: 0}} end={{x: 0, y: 1}} colors={['#282828', '#101010']}>
      <Text style={[styles.title, styles.text, { color: '#1db954' }]}>Pic To Playlist</Text>
      {image && <AHImage source={{ uri: image }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" color="#fff" style={styles.activityIndicator} />}
      {!image && <View style={{height: 200}}></View>}</LinearGradient>
      {playlist.length > 0 &&
        <>
          <Features features={features} />
          <Playlist playlist={playlist} />
        </>
      }
      <View style={styles.buttonContainer}>
        {!image ? (
          <>
            <CustomButton title="TAKE" onPress={takePhoto} />
            <CustomButton title="UPLOAD" onPress={pickImage} />
          </>
        ) : (
          <>
            <CustomButton title={playlist.length > 0 ? "RETRY" : "CONVERT" } onPress={uploadImage} />
            <CustomButton title="NEW PICTURE" onPress={() => { setImage(null); setFeatures([]); setPlaylist([]); }}/>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // global
  text: {
    color: '#fff',
    fontFamily: 'CircularStd-Bold',
  },
  container: {
    backgroundColor: '#101010',
    height: '100%'
  },
  title: {
    fontSize: 50,
    marginVertical: 25,
    marginTop: 100,
    letterSpacing: -1.25,
    textAlign: 'center',
  },
  image: {
    marginBottom: 20,
    width: 350,
    height: 'auto',
    resizeMode: 'contain',
    alignSelf: 'center',
    borderRadius: 7,
  },
  activityIndicator: {
    marginBottom: 'auto',
    paddingVertical: 50,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 50,
    marginHorizontal: 'auto',
    borderRadius: 50,
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  buttonText: {
    color: '#000',
    fontFamily: 'CircularStd',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    marginBottom: 75,
  },
  uploadContainer: {
  },
  convertContainer: {
    marginHorizontal: 20,
    flexDirection: 'row',
  }
});