import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Features = ({ features }) => {

  return (
    <View style={styles.featuresContainer}>
      {features.map((item, index) => (
        <View key={index} style={[styles.text, styles.feature]}>
          <Text style={[styles.text, styles.itemFeat]}>{item.feature}</Text>
          <Text style={[styles.text, styles.itemProb]}>{item.probability}</Text>
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
  featuresContainer: {
    marginHorizontal: 'auto',
    width: '95%',
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  feature: {
    backgroundColor: '#282828',
    borderRadius: 50,
    paddingHorizontal: 15,
    paddingVertical: 5,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemFeat: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  itemProb: {
    color: '#B3B3B3',
    fontSize: 12,
    textAlign: 'center',
  }
});

export default Features;