import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '../../constants/ThemeContext';
import { menuApi, restaurantApi } from '../../services/api';
import { CategoryCarousel } from '../../components/CategoryCarousel';
import { ProductCard } from '../../components/ProductCard';
import { ProductDetailSheet } from '../../components/ProductDetailSheet';
import { FloatingCartBar } from '../../components/FloatingCartBar';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const userName = useAuthStore((s) => s.user?.name);
  const cartItems = useCartStore((s) => s.items);

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search placeholder animation setup
  const placeholders = ['"Pizza"', '"Biryani"', '"Burger"', '"Ice Cream"', '"Rolls"'];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const fetchHomeData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        menuApi.getCategories(),
        menuApi.getMenu(), // Fetch all to avoid delay on clicking categories
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (e) {
      console.log('Error fetching home data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, []);

  const getFilteredProducts = () => {
    let result = products;
    if (selectedCategory) {
      result = result.filter(
        (p: any) =>
          (typeof p.category === 'object' ? p.category._id : p.category) === selectedCategory
      );
    }
    if (isVegOnly) {
      result = result.filter((p: any) => p.type === 'Veg');
    }
    return result;
  };

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const filteredProducts = getFilteredProducts();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header section */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Text style={[styles.locationTitle, { color: colors.foreground }]}>
            {userName ? `Hi, ${userName.split(' ')[0]}! 👋` : 'Deliver to'}
          </Text>
          <Text style={[styles.locationSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            Siliguri, West Bengal
          </Text>
        </View>
        <View style={styles.profileAvatarPlaceholder}>
          <Text style={{ fontSize: 24 }}>🍟</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Animated Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.searchText, { color: colors.mutedForeground }]}>
              Search {placeholders[placeholderIndex]}
            </Text>
            <View style={styles.searchIconBox}>
              <Search size={20} color={colors.primary} />
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* What's on your mind? */}
            <View style={styles.sectionHeader}>
              <View style={[styles.bulletPoint, { backgroundColor: colors.foreground }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                What's on your mind?
              </Text>
            </View>
            <CategoryCarousel
              categories={categories}
              selected={selectedCategory}
              onSelect={(id) => setSelectedCategory(id === selectedCategory ? '' : id)}
            />

            {/* Menu Divider line */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Product List */}
            <View style={styles.productListHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {selectedCategory
                  ? `Menu for ${categories.find((c: any) => c._id === selectedCategory)?.name || ''}`
                  : 'Recommended around you'}
              </Text>
            </View>

            <View style={styles.productListContainer}>
              {filteredProducts.map((item: any) => (
                <ProductCard 
                  key={item._id} 
                  item={item} 
                  onPress={() => setSelectedProduct(item)} 
                />
              ))}
              
              {filteredProducts.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No items found.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Add to Cart sticky bar */}
      <FloatingCartBar />

      {/* Reusable Bottom Sheet for Product Details */}
      <ProductDetailSheet 
        item={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  locationContainer: {
    flex: 1,
  },
  locationTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  locationSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  profileAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(252, 128, 25, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100, // Important padding for cart bottom bar
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  searchIconBox: {
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    marginTop: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 8,
  },
  bulletPoint: {
    width: 6,
    height: 16,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  divider: {
    height: 8,
    width: '100%',
    marginVertical: 20,
    opacity: 0.5,
  },
  productListHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  productListContainer: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});
