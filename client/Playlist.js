import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Audio } from 'expo-av';

const Playlist = ({ playlist }) => {
  const [soundObject, setSoundObject] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (soundObject) {
        soundObject.unloadAsync().catch((error) => console.error('Failed to unload sound', error));
      }
    };
  }, [soundObject]);

  const handleSongNamePress = (url) => {
    Linking.openURL(url);
  };

  const handlePlayButtonPress = async (url) => {
    try {
      if (isLoading) {
        console.log('Audio is still loading...');
        return;
      }

      if (soundObject && currentSong === url) {
        if (isPlaying) {
          await soundObject.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundObject.playAsync();
          setIsPlaying(true);
        }
      } else {
        setIsLoading(true);

        if (soundObject) {
          await soundObject.stopAsync();
        }

        const newSoundObject = new Audio.Sound();
        await newSoundObject.loadAsync({ uri: url });
        setSoundObject(newSoundObject);
        setCurrentSong(url);
        await newSoundObject.playAsync();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.playlistContainer}>
      {playlist.map((item, index) => (
        <View key={index} style={[styles.text, styles.songContainer]}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.coverImage }} style={[styles.text, styles.coverImage]} />
            <TouchableOpacity style={styles.playButton} onPress={() => handlePlayButtonPress(item.audio)}>
              {isPlaying && currentSong === item.audio ? (<View style={styles.pauseIcon}/>) : (<View style={styles.playIcon} />)}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.text, styles.songDetails]} onPress={() => handleSongNamePress(item.link)}>
            <Text style={[styles.text, styles.songName]}>{item.name}</Text>
            <Text style={[styles.text, styles.artistName]}>{item.artist}</Text>
            <Text style={[styles.text, styles.caption]}>{item.caption}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    color: '#fff',
    fontFamily: 'CircularStd-Bold',
  },
  playlistContainer: {
    marginHorizontal: 'auto',
    width: '95%',
    marginBottom: 25,
  },
  songContainer: {
    // backgroundColor: '#282828',
    justifyContent: 'space-between',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    margin: 5,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
    width: 40,
    height: 40,
    right: 28,
  },
  playIcon: {
    left: 14,
    top: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'rgba(255, 255, 255, 0.7)',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pauseIcon: {
    left: 13,
    top: 12,
    width: 15,
    height: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
  },
  coverImage: {
    width: 75,
    height: 75,
    marginRight: 10,
  },
  songDetails: {
    flex: 1,
    alignItems: 'flex-start',
  },
  songName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  artistName: {
    color: '#b3b3b3',
    fontSize: 20,
  },
  caption: {
    backgroundColor: '#282828',
    color: '#B3B3B3',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 50,
    fontSize: 12,
  },
});

export default Playlist;