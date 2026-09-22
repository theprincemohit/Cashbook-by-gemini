import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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

import { Feather, Ionicons } from '@expo/vector-icons';

import BottomTabBar from '@/components/BottomTabBar';
import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import { getBusinesses, type Business } from '@/lib/businesses';
import { getPassbooks, type Passbook } from '@/lib/passbooks';

interface PassbookItemProps {
  item: Passbook;
  index: number;
  onPress: (item: Passbook) => void;
  formatDate: (dateStr: string) => string;
  colors: [string, string];
}

const PassbookItem = memo(({ item, index, onPress, formatDate, colors }: PassbookItemProps) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index, 10) * 80,
      useNativeDriver: true,
    }).start();
  }, [itemAnim, index]);

  const currentBalance = item.net_balance;
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
            {item.last_transaction_date ? `Updated ${formatDate(item.last_transaction_date)}` : `Created ${formatDate(item.created_at)}`}
          </Text>
        </View>

        <View style={styles.passbookBalanceContainer}>
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
              ? `- ₹${Math.abs(item.net_balance).toLocaleString('en-IN')}`
              : `₹${item.net_balance.toLocaleString('en-IN')}`}
          </Text>
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
  const params = useLocalSearchParams();
  const { activeBusiness, setActiveBusiness } = useBusiness();

  const hasConsumedParams = useRef(false);

  useEffect(() => {
    if (
      !hasConsumedParams.current &&
      params.id &&
      params.name &&
      typeof params.id === 'string' &&
      typeof params.name === 'string'
    ) {
      if (activeBusiness?.id !== params.id) {
        setActiveBusiness({ id: params.id, name: params.name });
      }
      hasConsumedParams.current = true;
      // Clear params to prevent re-setting if we navigate away and back
      router.setParams({ id: '', name: '' });
    }
  }, [params.id, params.name, activeBusiness?.id, setActiveBusiness]);
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
      setPassbooks(data);
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
    setIsLoading(true);
    setActiveBusiness({ id: b.id, name: b.name });
    setBusinessBottomSheetVisible(false);
    await fetchPassbooks(b.id);
    setIsLoading(false);
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
        onPress={handlePassbookPress}
        formatDate={formatDate}
        colors={colors}
      />
    );
  }, [handlePassbookPress, formatDate]);

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
          {/* Header: × close + title + divider */}
          <View style={styles.sheetHeader}>
            <Pressable
              onPress={() => setBusinessBottomSheetVisible(false)}
              style={styles.sheetCloseBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.sheetTitle}>Select Business</Text>
          </View>

          {isLoadingBusinesses ? (
            <ScrollView style={{ maxHeight: 260, marginVertical: 6 }}>
              {[1, 2, 3].map((i) => (
                <BusinessRowSkeleton key={i} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView style={{ maxHeight: 260, marginVertical: 6 }} showsVerticalScrollIndicator={false} bounces={false}>
              {[...businesses]
                .sort((a, b) => {
                  if (a.id === selectedBusinessId) return -1;
                  if (b.id === selectedBusinessId) return 1;
                  return ((b as any).passbook_count ?? 0) - ((a as any).passbook_count ?? 0);
                })
                .map((b) => {
                const isChecked = b.id === selectedBusinessId;
                const bookCount = (b as any).passbook_count ?? 0;
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
                    {/* Building icon */}
                    <View style={[
                      styles.bsIcon,
                      isChecked && styles.bsIconSelected,
                    ]}>
                      <Ionicons
                        name="business"
                        size={20}
                        color={isChecked ? AppColors.accentStart : '#6B7280'}
                      />
                    </View>

                    {/* Name + book count */}
                    <View style={styles.bsInfo}>
                      <Text style={[
                        styles.businessRowName,
                        isChecked && styles.businessRowNameSelected,
                      ]}>
                        {b.name}
                      </Text>
                      <Text style={styles.bsBookCount}>
                        {bookCount === 1 ? '1 Book' : `${bookCount} Books`}
                      </Text>
                    </View>

                    {/* Green circle checkmark for selected */}
                    {isChecked && (
                      <View style={styles.bsCheckCircle}>
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      </View>
                    )}
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
          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Left: icon + name + subtitle — tappable to open sheet */}
            <Pressable
              onPress={() => setBusinessBottomSheetVisible(true)}
              style={styles.topBarLeft}
            >
              {/* Building icon in rounded square */}
              <View style={styles.topBarIcon}>
                <Ionicons name="business" size={16} color="#9CA3AF" />
              </View>

              {/* Name + chevron + subtitle */}
              <View style={styles.topBarInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.topBarName} numberOfLines={1}>
                    {businessName.length > 15 ? businessName.slice(0, 15) + '…' : businessName}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </View>
                <Text style={styles.topBarSubtitle}>Tap to switch business</Text>
              </View>
            </Pressable>
          </View>

          {isLoading ? (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {renderHeader()}
              {[1, 2, 3].map((i) => (
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
        <BottomTabBar activeTab="home" />
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
    paddingTop: AppSpacing.md,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: 6,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  topBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  topBarInfo: {
    flex: 1,
  },
  topBarName: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
    lineHeight: 18,
  },
  topBarSubtitle: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 1,
  },
  topBarRightBtn: {
    paddingLeft: AppSpacing.md,
    paddingVertical: 4,
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
  // Header: × close button + title
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: AppSpacing.md,
    marginBottom: AppSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
  },
  // Business rows
  businessRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: AppBorderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  businessRowItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  businessRowItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: AppColors.accentStart,
  },
  businessRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Building icon square
  bsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bsIconSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  bsInfo: {
    flex: 1,
  },
  bsBookCount: {
    color: '#94A3B8',
    fontSize: AppFontSizes.xs + 1,
    marginTop: 1,
  },
  // Green circle checkmark
  bsCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Kept for TS compatibility (no longer rendered)
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
    color: '#E2E8F0',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
  },
  businessRowNameSelected: {
    color: '#FFFFFF',
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

});
