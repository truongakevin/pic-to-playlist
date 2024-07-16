import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const Features = ({ features }) => {

  const renderFeature = ({ item }) => (
    <View style={[styles.text, styles.features]}>
        <View style={[styles.text, styles.feature]}>
            <Text style={[styles.text, styles.itemFeat]}>{item.feature}</Text>
            <Text style={[styles.text, styles.itemProb]}>{item.probability}</Text>
        </View>
    </View>
  );

  return (
    <View style={styles.featuresContainer}>
      <FlatList
        horizontal={true}
        data={features}
        renderItem={renderFeature}
        contentContainerStyle={styles.feature}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    color: '#fff',
    fontFamily: 'CircularStd-Bold',
  },
  //features
  featuresContainer: {
    marginHorizontal: 'auto',
    width: '95%',
    marginBottom: 10,
  },
  features: {
    padding: 10,
    flexWrap: 'wrap',
    backgroundColor: '#282828',
    borderRadius: 50,
    padding: 4,
    paddingHorizontal: 8,
    margin: 4,
  },
  feature: {
    width: '100%',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  itemFeat: {
    // color: '#000',
    fontSize: 16,
  },
  itemProb: {
    color: '#B3B3B3',
    fontSize: 12,
  }
});

export default Features;