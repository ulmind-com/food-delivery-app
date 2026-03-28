import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../constants/ThemeContext';

interface Category {
  _id: string;
  name: string;
  image?: string;
  imageURL?: string;
}

interface CategoryCarouselProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryCarousel({ categories, selected, onSelect }: CategoryCarouselProps) {
  const { colors } = useTheme();

  const allItems = [{ _id: '', name: 'All', image: null }];
  const combined = [...allItems, ...categories];

  // Split into 2 rows for the exact Swiggy horizontal scroll feel
  const mid = Math.ceil(combined.length / 2);
  const topRow = combined.slice(0, mid);
  const bottomRow = combined.slice(mid);

  const renderItem = (item: any) => {
    const isSelected = selected === item._id;
    const imageUrl = item.image || item.imageURL;

    return (
      <TouchableOpacity
        key={item._id}
        activeOpacity={0.7}
        onPress={() => onSelect(item._id)}
        style={styles.itemContainer}
      >
        <View
          style={[
            styles.imageContainer,
            {
              borderColor: isSelected ? colors.primary : colors.border,
              backgroundColor: colors.card,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text style={{ fontSize: 24 }}>🍽️</Text>
          )}
        </View>
        <Text
          style={[
            styles.name,
            {
              color: isSelected ? colors.foreground : colors.mutedForeground,
              fontFamily: isSelected ? 'Inter-Bold' : 'Inter-Medium',
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.gridContainer}>
        <View style={styles.row}>
          {topRow.map(renderItem)}
        </View>
        {bottomRow.length > 0 && (
          <View style={styles.row}>
            {bottomRow.map(renderItem)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gridContainer: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  itemContainer: {
    alignItems: 'center',
    width: 72,
    gap: 8,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 12,
    textAlign: 'center',
  },
});
