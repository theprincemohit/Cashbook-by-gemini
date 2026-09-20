import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { useBusiness } from '@/context/BusinessContext';

import { Feather } from '@expo/vector-icons';

import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import { getBusinesses, type Business } from '@/lib/businesses';
import { getPassbooks, type Passbook } from '@/lib/passbooks';
import { getPassbookBalances } from '@/lib/transactions';

interface PassbookItemProps {
  item: Passbook;
  index: number;
  balance?: number;
  isLoadingBalance?: boolean;
  latestTxnDate?: string;
  onPress: (item: Passbook) => void;
  formatDate: (dateStr: string) => string;
  colors: [string, string];
}

const PassbookItem = memo(({ item, index, balance, isLoadingBalance, latestTxnDate, onPress, formatDate, colors }: PassbookItemProps) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index, 10) * 80,
      useNativeDriver: true,
    }).start();
  }, [itemAnim, index]);

  const currentBalance = balance ?? 0;
  const isPositive = currentBalance > 0;
  const isNegative = currentBalance < 0;

  return (
    <Animated.View
      style={{
        opacity: itemAnim,
        transform: [
          {
            translateY: itemAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [15, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.passbookCard,
          pressed && styles.passbookCardPressed,
        ]}
      >
        <View style={styles.passbookIconWrapper}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.passbookIconGradient}
          >
            <Feather name="book" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={styles.passbookInfo}>
          <Text style={styles.passbookName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.passbookDate}>
            {latestTxnDate ? `Updated ${formatDate(latestTxnDate)}` : `Created ${formatDate(item.created_at)}`}
          </Text>
        </View>

        <View style={styles.passbookBalanceContainer}>
          {isLoadingBalance ? (
            <ActivityIndicator size="small" color={AppColors.accentSolid} />
          ) : (
            <Text
              style={[
                styles.passbookBalanceText,
                isPositive
                  ? styles.balancePositive
                  : isNegative
                    ? styles.balanceNegative
                    : styles.balanceZero,
              ]}
            >
              {isNegative
                ? `- ₹${Math.abs(currentBalance).toLocaleString('en-IN')}`
                : `₹${currentBalance.toLocaleString('en-IN')}`}
            </Text>
          )}
        </View>

        <Text style={styles.passbookArrow}>›</Text>
      </Pressable>
    </Animated.View>
  );
});

const PassbookSkeleton = () => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={[styles.passbookCard, { opacity: anim, borderColor: 'transparent' }]}>
      <View style={[styles.passbookIconWrapper, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={styles.passbookInfo}>
        <View style={{ width: 120, height: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ width: 80, height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
      </View>
      <View style={styles.passbookBalanceContainer}>
        <View style={{ width: 60, height: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
};

const BusinessRowSkeleton = () => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={[styles.businessRowItem, { opacity: anim, borderColor: 'transparent' }]}>
      <View style={styles.businessRowLeft}>
        <View style={[styles.checkboxSquare, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'transparent' }]} />
        <View style={{ width: 120, height: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginLeft: 12 }} />
      </View>
    </Animated.View>
  );
};

export default function BusinessDetailScreen() {
  const { activeBusiness, setActiveBusiness } = useBusiness();
  const selectedBusinessId = activeBusiness?.id || '';
  const businessName = activeBusiness?.name || 'Business';
  const [passbooks, setPassbooks] = useState<Passbook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPassbooks = useMemo(() => {
    if (!searchQuery.trim()) return passbooks;
    return passbooks.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [passbooks, searchQuery]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const hasFetchedInitialRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [latestTxnDates, setLatestTxnDates] = useState<Record<string, string>>({});

  // Businesses list state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessBottomSheetVisible, setBusinessBottomSheetVisible] = useState(false);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);

  // FAB scroll state
  const [isFabCollapsed, setIsFabCollapsed] = useState(false);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 30) {
      setIsFabCollapsed(true);
    } else {
      setIsFabCollapsed(false);
    }
  }, []);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const fetchPassbooks = useCallback(async (bId: string) => {
    if (!bId) return;
    if (!hasFetchedInitialRef.current) {
      setIsLoading(true);
    }
    const result = await getPassbooks(bId);
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data ?? [];
      setError('');
      if (data.length > 0) {
        setIsLoadingBalances(true);
        const balancesRes = await getPassbookBalances(data.map((p) => p.id));
        if (balancesRes.data) {
          const map: Record<string, number> = {};
          const datesMap: Record<string, string> = {};
          Object.entries(balancesRes.data).forEach(([id, val]) => {
            map[id] = val.balance;
            if (val.latest_txn_date) {
              datesMap[id] = val.latest_txn_date;
            }
          });
          setBalances(map);
          setLatestTxnDates(datesMap);

          const sortedData = [...data].sort((a, b) => {
            const dateA = balancesRes.data![a.id]?.latest_txn_date || a.created_at;
            const dateB = balancesRes.data![b.id]?.latest_txn_date || b.created_at;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
          setPassbooks(sortedData);
        } else {
          setPassbooks(data);
        }
        setIsLoadingBalances(false);
      } else {
        setBalances({});
        setPassbooks(data);
      }
    }
    setIsLoading(false);
    setIsRefreshing(false);
    hasFetchedInitialRef.current = true;
  }, []);

  const loadBusinessesList = useCallback(async () => {
    setIsLoadingBusinesses(true);
    const res = await getBusinesses();
    if (res.data) {
      setBusinesses(res.data);
    }
    setIsLoadingBusinesses(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedBusinessId) {
        fetchPassbooks(selectedBusinessId);
      }
      loadBusinessesList();
    }, [selectedBusinessId, fetchPassbooks, loadBusinessesList])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (selectedBusinessId) {
      fetchPassbooks(selectedBusinessId);
    }
    loadBusinessesList();
  };

  const handleSelectBusiness = async (b: Business) => {
    setActiveBusiness({ id: b.id, name: b.name });
    setBusinessBottomSheetVisible(false);
    fetchPassbooks(b.id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Color palette for passbook icons
  const passbookColors: [string, string][] = [
    ['#8B5CF6', '#A78BFA'], // Purple
    ['#F59E0B', '#FBBF24'], // Amber
    ['#EC4899', '#F472B6'], // Pink
    ['#3B82F6', '#60A5FA'], // Blue
    ['#14B8A6', '#2DD4BF'], // Teal
    ['#EF4444', '#F87171'], // Red
  ];

  const handlePassbookPress = useCallback((item: Passbook) => {
    router.push({
      pathname: '/(app)/passbook-detail',
      params: {
        passbookId: item.id,
        passbookName: item.name,
        businessName: businessName,
      },
    });
  }, [businessName]);

  const renderPassbookItem = useCallback(({
    item,
    index,
  }: {
    item: Passbook;
    index: number;
  }) => {
    const colors = passbookColors[index % passbookColors.length];
    return (
      <PassbookItem
        item={item}
        index={index}
        balance={balances[item.id]}
        isLoadingBalance={isLoadingBalances}
        latestTxnDate={latestTxnDates[item.id]}
        onPress={handlePassbookPress}
        formatDate={formatDate}
        colors={colors}
      />
    );
  }, [handlePassbookPress, formatDate, balances, isLoadingBalances]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="book" size={48} color={AppColors.accentSolid} style={{ marginBottom: 16 }} />
      <Text style={styles.emptyTitle}>No passbooks yet</Text>
      <Text style={styles.emptySubtitle}>
        Create a passbook to start recording transactions for this business
      </Text>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(app)/create-passbook',
            params: { businessId: selectedBusinessId, businessName: businessName },
          })
        }
        style={({ pressed }) => [
          styles.addBtn,
          { marginTop: 50 },
          pressed && styles.addBtnPressed,
        ]}
      >
        <LinearGradient
          colors={[AppColors.accentStart, AppColors.accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.addBtnGradient}
        >
          <Text style={styles.addBtnText}>+ Add New Passbook </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      ) : null}

      {/* Search Bar */}
      {passbooks.length >= 5 && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search passbooks..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Passbooks</Text>
      </View>
    </>
  );

  // ── Business List Bottom Sheet Modal ───────────────────────────────────────
  const renderBusinessBottomSheet = () => (
    <Modal
      visible={businessBottomSheetVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setBusinessBottomSheetVisible(false)}
    >
      <View style={styles.sheetOverlay}>
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setBusinessBottomSheetVisible(false)}
        />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Business</Text>

          {isLoadingBusinesses ? (
            <ScrollView style={{ maxHeight: 260, marginVertical: 6 }}>
              {[1, 2, 3].map((i) => (
                <BusinessRowSkeleton key={i} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView style={{ maxHeight: 260, marginVertical: 6 }}>
              {businesses.map((b) => {
                const isChecked = b.id === selectedBusinessId;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => handleSelectBusiness(b)}
                    style={({ pressed }) => [
                      styles.businessRowItem,
                      pressed && styles.businessRowItemPressed,
                      isChecked && styles.businessRowItemSelected,
                    ]}
                  >
                    <View style={styles.businessRowLeft}>
                      <View
                        style={[
                          styles.checkboxSquare,
                          isChecked && styles.checkboxSquareChecked,
                        ]}
                      >
                        {isChecked && <Text style={styles.checkmarkText}>✓</Text>}
                      </View>
                      <Text
                        style={[
                          styles.businessRowName,
                          isChecked && styles.businessRowNameSelected,
                        ]}
                      >
                        {b.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            onPress={() => {
              setBusinessBottomSheetVisible(false);
              router.push('/(app)/create-business');
            }}
            style={({ pressed }) => [
              styles.addBusinessBtnInSheet,
              pressed && { opacity: 0.8 },
            ]}
          >
            <LinearGradient
              colors={[AppColors.accentStart, AppColors.accentEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBusinessBtnGradient}
            >
              <Text style={styles.addBusinessBtnText}>+ Add New Business</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Bar with Business Dropdown */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => {
                loadBusinessesList();
                setBusinessBottomSheetVisible(true);
              }}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  paddingHorizontal: AppSpacing.md,
                  paddingVertical: AppSpacing.xs + 2,
                  borderRadius: AppBorderRadius.lg,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  gap: 8,
                  maxWidth: '70%',
                },
              ]}
            >
              <View style={{ flexShrink: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: AppFontSizes.md, fontWeight: '700' }} numberOfLines={1}>
                  {businessName.slice(0, 10) ?? 'Select Business'}
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 10, marginTop: 1 }}>
                  Tap to switch Business
                </Text>
              </View>
              <Text style={{ color: '#818CF8', fontSize: 12 }}>▼</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {renderHeader()}
              {[1, 2, 3, 4, 5].map((i) => (
                <PassbookSkeleton key={i} />
              ))}
            </ScrollView>
          ) : (
            <FlatList
              data={filteredPassbooks}
              keyExtractor={(item) => item.id}
              renderItem={renderPassbookItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={true}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={AppColors.accentSolid}
                  colors={[AppColors.accentSolid]}
                />
              }
            />
          )}

          {/* Floating Action Button (FAB) */}
          {!isLoading && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/create-passbook',
                  params: { businessId: selectedBusinessId, businessName: businessName },
                })
              }
              style={({ pressed }) => [
                styles.fabContainer,
                pressed && styles.fabPressed,
              ]}
            >
              <LinearGradient
                colors={[AppColors.accentStart, AppColors.accentEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.fabGradient,
                  isFabCollapsed ? styles.fabCollapsed : styles.fabExtended,
                ]}
              >
                <Text style={styles.fabIcon}>+</Text>
                {!isFabCollapsed && (
                  <Text style={styles.fabText}>Add New Passbook</Text>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>

        {/* Custom Bottom Tab Bar */}
        <View style={styles.bottomTabBar}>
          <Pressable style={styles.bottomTabItem} onPress={() => { }}>
            <Feather name="book" size={24} color={AppColors.accentSolid} />
            <Text style={[styles.bottomTabLabel, { color: AppColors.accentSolid }]}>CashDiary</Text>
          </Pressable>

          <Pressable style={styles.bottomTabItem} onPress={() => router.push({ pathname: '/(app)/settings', params: { id: selectedBusinessId, name: businessName } })}>
            <Feather name="settings" size={24} color="#94A3B8" />
            <Text style={styles.bottomTabLabel}>Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Full Page Modals */}
      {businessBottomSheetVisible && renderBusinessBottomSheet()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? AppSpacing.xxl : AppSpacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: 160,
  },
  // Floating Action Button (FAB)
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    borderRadius: AppBorderRadius.full,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppBorderRadius.full,
  },
  fabExtended: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 10,
    gap: 6,
  },
  fabCollapsed: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  backBtn: {
    paddingVertical: AppSpacing.sm,
    paddingRight: AppSpacing.md,
    alignSelf: 'flex-start',
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backText: {
    fontSize: AppFontSizes.md,
    color: AppColors.accentSolid,
    fontWeight: '600',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  topBarIconBtn: {
    width: 40,
    height: 40,
    borderRadius: AppBorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  topBarIconBtnPressed: {
    opacity: 0.6,
  },
  topBarIconText: {
    fontSize: 18,
  },
  // Business Info Card
  businessCard: {
    borderRadius: AppBorderRadius.xl,
    overflow: 'hidden',
    marginBottom: AppSpacing.lg,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  businessGradient: {
    padding: AppSpacing.lg,
    alignItems: 'center',
  },
  businessInitialWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  businessInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  businessName: {
    fontSize: AppFontSizes.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: AppSpacing.xs,
  },
  businessSubtext: {
    fontSize: AppFontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Error
  errorContainer: {
    backgroundColor: AppColors.errorBg,
    borderRadius: AppBorderRadius.sm,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: AppColors.error,
    fontSize: AppFontSizes.sm,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: AppBorderRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: AppSpacing.sm,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    paddingVertical: 2,
  },
  clearSearchBtn: {
    padding: 4,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  sectionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  addBtn: {
    borderRadius: AppBorderRadius.full,
    overflow: 'hidden',
  },
  addBtnPressed: {
    opacity: 0.8,
  },
  addBtnGradient: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Passbook Card
  passbookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 10,
    marginBottom: AppSpacing.xs + 2,
  },
  passbookCardPressed: {
    backgroundColor: AppColors.bgInputFocused,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  passbookIconWrapper: {
    marginRight: AppSpacing.sm + 2,
  },
  passbookIconGradient: {
    width: 38,
    height: 38,
    borderRadius: AppBorderRadius.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passbookIconText: {
    fontSize: 18,
  },
  passbookInfo: {
    flex: 1,
  },
  passbookName: {
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 1,
  },
  passbookDate: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  passbookBalanceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: AppSpacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppBorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  passbookBalanceText: {
    fontSize: AppFontSizes.xs + 1,
    fontWeight: '700',
  },
  balancePositive: {
    color: '#10B981',
  },
  balanceNegative: {
    color: '#EF4444',
  },
  balanceZero: {
    color: AppColors.textMuted,
  },
  passbookArrow: {
    fontSize: 18,
    color: AppColors.textMuted,
    marginLeft: AppSpacing.xs,
  },
  // Empty State
  emptyState: {
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.xl,
    alignItems: 'center',
    marginTop: AppSpacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: AppSpacing.md,
  },
  emptyTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  emptySubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Modal ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: '#1A2138',
    borderRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: AppSpacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  modalTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  modalSubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: AppSpacing.md,
  },
  modalInput: {
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: AppFontSizes.md,
    color: AppColors.textPrimary,
  },
  modalInputDelete: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  modalInputError: {
    borderColor: AppColors.error,
  },
  modalErrorText: {
    color: AppColors.error,
    fontSize: AppFontSizes.xs,
    marginTop: AppSpacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.lg,
  },
  modalCancelBtn: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 10,
    borderRadius: AppBorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  modalCancelText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  modalDeleteBtn: {
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  modalDeleteInner: {
    backgroundColor: AppColors.error,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: 10,
    borderRadius: AppBorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  modalDeleteText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  modalBtnPressed: {
    opacity: 0.7,
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
  // Delete warning box
  deleteWarningBox: {
    backgroundColor: AppColors.errorBg,
    borderRadius: AppBorderRadius.sm,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.20)',
  },
  deleteWarningText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    lineHeight: 20,
  },
  deleteWarningBold: {
    color: AppColors.error,
    fontWeight: '800',
  },

  // Bottom Sheet Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContent: {
    backgroundColor: '#1E1E2A',
    borderTopLeftRadius: AppBorderRadius.xl,
    borderTopRightRadius: AppBorderRadius.xl,
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : AppSpacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: AppSpacing.md,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  businessRowItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: AppBorderRadius.md,
    marginBottom: 4,
  },
  businessRowItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  businessRowItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  businessRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  businessRowName: {
    color: '#9CA3AF',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '500',
  },
  businessRowNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addBusinessBtnInSheet: {
    marginTop: 8,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  addBusinessBtnGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBusinessBtnText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
  },
  modalTitleTextDelete: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.error,
    marginBottom: AppSpacing.xs,
  },
  modalConfirmInstruction: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.sm,
  },
  modalBoldText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: 10,
    backgroundColor: AppColors.error,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  // Bottom Tab Bar
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    zIndex: 1000,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  bottomTabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
