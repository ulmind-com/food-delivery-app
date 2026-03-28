import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Minus, X } from 'lucide-react-native';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../constants/ThemeContext';
import { resolveImageURL } from '../lib/image-utils';
import { useRouter } from 'expo-router';

interface ProductDetailSheetProps {
  item: any | null;
  onClose: () => void;
}

export function ProductDetailSheet({ item, onClose }: ProductDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const snapPoints = useMemo(() => ['70%', '95%'], []);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const { items, addItem, incrementItem, decrementItem } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={isDark ? 0.7 : 0.5}
      />
    ),
    [isDark]
  );

  React.useEffect(() => {
    if (item) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [item]);

  if (!item) return null;

  const cartItem = items.find((i) => i._id === item._id);
  const displayPrice = item.price || item.variants?.[0]?.price || 0;
  const imageUrl = resolveImageURL(item.image || item.imageURL);

  const handleAdd = () => {
    if (!isAuthenticated()) {
      onClose();
      router.push('/(auth)/login');
      return;
    }
    addItem({
      _id: item._id,
      name: item.name,
      price: Number(displayPrice),
      image: imageUrl,
      type: item.type,
      category: typeof item.category === 'object' ? item.category?._id : item.category,
    });
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => bottomSheetRef.current?.close()} style={styles.closeBtn}>
          <X size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
        />

        <View style={styles.detailsContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.priceTag, { color: colors.foreground }]}>₹{displayPrice}</Text>

          {item.description && (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {item.description}
            </Text>
          )}
        </View>
      </BottomSheetScrollView>

      {/* Sticky Bottom Bar */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || 20,
          },
        ]}
      >
        <View style={styles.actionContainer}>
          {cartItem ? (
            <View style={[styles.counterContainer, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={decrementItem.bind(null, cartItem.itemId)}
              >
                <Minus size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.counterText, { color: colors.primary }]}>{cartItem.quantity}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={incrementItem.bind(null, cartItem.itemId)}
              >
                <Plus size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
            >
              <Text style={[styles.addText, { color: colors.primaryForeground }]}>Add item ₹{displayPrice}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: 300,
  },
  detailsContainer: {
    padding: 24,
  },
  title: {
    fontFamily: 'Inter-Black',
    fontSize: 24,
    marginBottom: 8,
  },
  priceTag: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 16,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  actionContainer: {
    width: '100%',
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 2,
    height: 56,
  },
  counterButton: {
    paddingHorizontal: 24,
    height: '100%',
    justifyContent: 'center',
  },
  counterText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
});
