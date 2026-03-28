import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, Zap } from 'lucide-react-native';
import { useCartStore } from '../store/useCartStore';
import { useTheme, Colors } from '../constants/ThemeContext';
import { resolveImageURL } from '../lib/image-utils';

// Reusing Veg/Non-Veg icons from web design
const VegIcon = () => (
  <View style={[styles.typeIconContainer, { borderColor: Colors.light.success }]}>
    <View style={[styles.typeIconInner, { backgroundColor: Colors.light.success, borderRadius: 4 }]} />
  </View>
);

const NonVegIcon = () => (
  <View style={[styles.typeIconContainer, { borderColor: Colors.light.danger }]}>
    <View style={[styles.typeIconInner, { 
      borderBottomWidth: 6, 
      borderLeftWidth: 4, 
      borderRightWidth: 4, 
      borderBottomColor: Colors.light.danger,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      backgroundColor: 'transparent'
    }]} />
  </View>
);

interface ProductCardProps {
  item: any;
  onPress?: () => void;
}

export function ProductCard({ item, onPress }: ProductCardProps) {
  const { colors, isDark } = useTheme();
  
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);

  const cartItem = items.find((i) => i._id === item._id);
  const displayPrice = item.price || item.variants?.[0]?.price || 0;
  const imageUrl = resolveImageURL(item.image || item.imageURL);

  const handleAdd = (e?: any) => {
    // Stop propagation so outer card onPress doesn't fire
    if (e && e.stopPropagation) e.stopPropagation();
    addItem({
      _id: item._id,
      name: item.name,
      price: Number(displayPrice),
      image: imageUrl,
      type: item.type,
      category: typeof item.category === 'object' ? item.category?._id : item.category,
    });
  };

  const handleIncrement = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (cartItem) incrementItem(cartItem.itemId);
  };

  const handleDecrement = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (cartItem) decrementItem(cartItem.itemId);
  };

  const hasDiscount = item.hasDiscount;
  const categoryName = typeof item.category === 'object' ? item.category?.name : item.category;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { 
          backgroundColor: colors.card,
          borderColor: hasDiscount ? (isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)') : colors.border,
        }
      ]}
    >
      <View style={styles.contentContainer}>
        {/* Badges row */}
        <View style={styles.badgeRow}>
          {item.type === 'Veg' ? <VegIcon /> : item.type === 'Non-Veg' ? <NonVegIcon /> : null}
          {categoryName && (
            <Text style={[styles.categoryText, { color: colors.mutedForeground }]}>
              {categoryName}
            </Text>
          )}
          {hasDiscount && (
            <View style={styles.dealBadge}>
              <Zap size={10} color="#16a34a" fill="#16a34a" />
              <Text style={styles.dealText}>Deal</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {item.name}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          {hasDiscount && item.originalPrice ? (
            <>
              <View style={styles.originalPriceContainer}>
                <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                  ₹{item.originalPrice}
                </Text>
                <View style={styles.strikethrough} />
              </View>
              <Text style={[styles.priceTag, { color: colors.success }]}>₹{displayPrice}</Text>
            </>
          ) : (
            <Text style={[styles.priceTag, { color: colors.foreground }]}>₹{displayPrice}</Text>
          )}
        </View>

        {/* Description */}
        {item.description && (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={hasDiscount ? 1 : 2}>
            {item.description}
          </Text>
        )}
      </View>

      {/* Right Column: Image + Add Button */}
      <View style={styles.imageColumn}>
        <View style={[styles.imageContainer, hasDiscount && { borderWidth: 2, borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
          
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountPercent}>{item.discountPercentage}%</Text>
              <Text style={styles.discountOff}>OFF</Text>
            </View>
          )}
        </View>

        {/* Add Button — uses Pressable with stopPropagation */}
        <View style={styles.actionContainer}>
          {cartItem ? (
            <View style={[styles.counterContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={styles.counterButton}
                onPress={handleDecrement}
              >
                <Minus size={14} color={colors.success} />
              </Pressable>
              <Text style={[styles.counterText, { color: colors.success }]}>{cartItem.quantity}</Text>
              <Pressable
                style={styles.counterButton}
                onPress={handleIncrement}
              >
                <Plus size={14} color={colors.success} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleAdd}
            >
              <Text style={[styles.addText, { color: colors.success }]}>ADD</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  typeIconContainer: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  typeIconInner: {
    width: 6,
    height: 6,
  },
  categoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
    marginLeft: 'auto',
  },
  dealText: {
    color: '#16a34a',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  originalPriceContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  originalPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  strikethrough: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: '#EF4444',
    width: '100%',
    top: '50%',
    transform: [{ rotate: '-8deg' }],
  },
  priceTag: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 16,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  imageColumn: {
    alignItems: 'center',
    width: 110,
  },
  imageContainer: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#EF4444', // Red-ish
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  discountPercent: {
    color: '#FFF',
    fontFamily: 'Inter-Black',
    fontSize: 11,
  },
  discountOff: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },
  actionContainer: {
    marginTop: -16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addText: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 14,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
  },
  counterButton: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
  },
  counterText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    minWidth: 20,
    textAlign: 'center',
  },
});
