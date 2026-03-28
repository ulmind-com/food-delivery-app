import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Home, Briefcase, Plus, CheckCircle2, ArrowLeft, Trash2 } from 'lucide-react-native';
import { userApi } from '../services/api';
import { useLocationStore, SavedAddress } from '../store/useLocationStore';
import { useTheme } from '../constants/ThemeContext';
import { Button } from '../components/ui/Button';

export default function AddressesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const { selectedAddress, setSelectedAddress } = useLocationStore();

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await userApi.getAddresses();
      // The API returns an array or an object { addresses: [] }. Let's handle both.
      const data = res.data.addresses || res.data;
      setAddresses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error fetching addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSelect = (addr: SavedAddress) => {
    setSelectedAddress(addr);
    router.back();
  };

  const handleDelete = async (id: string) => {
    try {
      await userApi.deleteAddress(id);
      if (selectedAddress?._id === id) {
        setSelectedAddress(null);
      }
      fetchAddresses();
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'HOME': return <Home size={20} color={colors.foreground} />;
      case 'WORK': return <Briefcase size={20} color={colors.foreground} />;
      default: return <MapPin size={20} color={colors.foreground} />;
    }
  };

  const renderItem = ({ item }: { item: SavedAddress }) => {
    const isSelected = selectedAddress?._id === item._id || selectedAddress?.id === item._id || selectedAddress?.id === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
        style={[styles.addressCard, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            {getIcon(item.type)}
            <Text style={[styles.typeText, { color: colors.foreground }]}>{item.type}</Text>
          </View>
          {isSelected && <CheckCircle2 size={20} color={colors.primary} />}
        </View>
        <Text style={[styles.addressText, { color: colors.mutedForeground }]}>
          {item.addressLine1}, {item.addressLine2 ? `${item.addressLine2}, ` : ''}{item.city}, {item.state} - {item.postalCode}
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id || item.id as string)}>
            <Trash2 size={16} color={colors.destructive} />
            <Text style={[styles.actionText, { color: colors.destructive }]}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MapPin size={48} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved addresses</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  Save an address to make your checkout faster
                </Text>
              </View>
            }
          />

          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Button
              title="ADD NEW ADDRESS"
              leftIcon={<Plus size={20} color={colors.primaryForeground} />}
              onPress={() => console.log('Location Map logic to be added')} 
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addressCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  addressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    gap: 4,
  },
  actionText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  footer: {
    padding: 16,
    paddingBottom: 32, // Safe area
    borderTopWidth: 1,
  },
});
