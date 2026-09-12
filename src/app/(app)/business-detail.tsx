import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
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
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { deleteBusiness, getBusinesses, updateBusiness, type Business } from '@/lib/businesses';
import { getPassbooks, type Passbook } from '@/lib/passbooks';
import { getPassbookBalances } from '@/lib/transactions';

interface PassbookItemProps {
  item: Passbook;
  index: number;
  balance?: number;
  isLoadingBalance?: boolean;
  onPress: (item: Passbook) => void;
  formatDate: (dateStr: string) => string;
  colors: [string, string];
}

const PassbookItem = memo(({ item, index, balance, isLoadingBalance, onPress, formatDate, colors }: PassbookItemProps) => {
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
            <Text style={styles.passbookIconText}>📒</Text>
          </LinearGradient>
        </View>
        <View style={styles.passbookInfo}>
          <Text style={styles.passbookName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.passbookDate}>
            Created {formatDate(item.created_at)}
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

export default function BusinessDetailScreen() {
  const { id: initialId, name: initialName } = useLocalSearchParams<{ id: string; name: string }>();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const [selectedBusinessId, setSelectedBusinessId] = useState(initialId || '');
  const [businessName, setBusinessName] = useState(initialName ?? 'Business');
  const [passbooks, setPassbooks] = useState<Passbook[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Businesses list state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessBottomSheetVisible, setBusinessBottomSheetVisible] = useState(false);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    setIsLoading(true);
    const result = await getPassbooks(bId);
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data ?? [];
      setPassbooks(data);
      setError('');
      if (data.length > 0) {
        setIsLoadingBalances(true);
        const balancesRes = await getPassbookBalances(data.map((p) => p.id));
        if (balancesRes.data) {
          const map: Record<string, number> = {};
          Object.entries(balancesRes.data).forEach(([id, val]) => {
            map[id] = val.balance;
          });
          setBalances(map);
        }
        setIsLoadingBalances(false);
      } else {
        setBalances({});
      }
    }
    setIsLoading(false);
    setIsRefreshing(false);
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
    setSelectedBusinessId(b.id);
    setBusinessName(b.name);
    setBusinessBottomSheetVisible(false);
    try {
      await AsyncStorage.setItem('last_selected_business_id', b.id);
    } catch (e) {
      console.log('Failed to save last selected business id:', e);
    }
    fetchPassbooks(b.id);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditName(businessName);
    setEditError('');
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Business name cannot be empty');
      return;
    }
    if (trimmed === businessName) {
      setEditModalVisible(false);
      return;
    }
    setEditLoading(true);
    setEditError('');
    const result = await updateBusiness(selectedBusinessId, trimmed);
    setEditLoading(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setBusinessName(trimmed);
      setBusinesses((prev) =>
        prev.map((item) => (item.id === selectedBusinessId ? { ...item, name: trimmed } : item))
      );
      setEditModalVisible(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteError('');
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.trim() !== businessName.trim()) {
      setDeleteError('Business name does not match');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    const result = await deleteBusiness(selectedBusinessId);
    setDeleteLoading(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeleteModalVisible(false);
      router.back();
    }
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
        onPress={handlePassbookPress}
        formatDate={formatDate}
        colors={colors}
      />
    );
  }, [handlePassbookPress, formatDate, balances, isLoadingBalances]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📒</Text>
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
          { marginTop: 10 },
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

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Passbooks</Text>
      </View>
    </>
  );

  // ── Edit Modal ────────────────────────────────────────────────────────────
  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => !editLoading && setEditModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !editLoading && setEditModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <Text style={styles.modalTitle}>✏️  Rename Business</Text>
            <Text style={styles.modalSubtitle}>
              Enter a new name for this business
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                editError ? styles.modalInputError : null,
              ]}
              value={editName}
              onChangeText={(text) => {
                setEditName(text);
                if (editError) setEditError('');
              }}
              placeholder="Business name"
              placeholderTextColor={AppColors.textPlaceholder}
              autoFocus
              editable={!editLoading}
              returnKeyType="done"
              onSubmitEditing={handleEditSave}
            />

            {editError ? (
              <Text style={styles.modalErrorText}>⚠ {editError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                disabled={editLoading}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && styles.modalBtnPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleEditSave}
                disabled={editLoading || !editName.trim()}
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  pressed && styles.modalBtnPressed,
                  (!editName.trim() || editLoading) && styles.modalBtnDisabled,
                ]}
              >
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGradient}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Save</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Delete Modal ──────────────────────────────────────────────────────────
  const renderDeleteModal = () => (
    <Modal
      visible={deleteModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => !deleteLoading && setDeleteModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !deleteLoading && setDeleteModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <Text style={styles.modalTitleTextDelete}>🗑️  Delete Business</Text>
            <Text style={styles.modalSubtitle}>
              This action cannot be undone. All passbooks and transactions under this business will be permanently deleted.
            </Text>
            <Text style={styles.modalConfirmInstruction}>
              Type <Text style={styles.modalBoldText}>{businessName}</Text> to confirm:
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                deleteError ? styles.modalInputError : null,
              ]}
              value={deleteConfirmText}
              onChangeText={(text) => {
                setDeleteConfirmText(text);
                if (deleteError) setDeleteError('');
              }}
              placeholder={businessName}
              placeholderTextColor={AppColors.textPlaceholder}
              autoCapitalize="none"
              editable={!deleteLoading}
            />

            {deleteError ? (
              <Text style={styles.modalErrorText}>⚠ {deleteError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleteLoading}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && styles.modalBtnPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteConfirm}
                disabled={
                  deleteLoading ||
                  deleteConfirmText.trim() !== businessName.trim()
                }
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && styles.modalBtnPressed,
                  (deleteConfirmText.trim() !== businessName.trim() ||
                    deleteLoading) &&
                  styles.modalBtnDisabled,
                ]}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalDeleteBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
            <ActivityIndicator size="small" color={AppColors.accentSolid} style={{ marginVertical: 20 }} />
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

            <View style={styles.topBarActions}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.topBarIconBtn,
                  pressed && styles.topBarIconBtnPressed,
                ]}
                hitSlop={8}
              >
                <Text style={styles.topBarIconText}>🚪</Text>
              </Pressable>
              <Pressable
                onPress={openEditModal}
                style={({ pressed }) => [
                  styles.topBarIconBtn,
                  pressed && styles.topBarIconBtnPressed,
                ]}
                hitSlop={8}
              >
                <Text style={styles.topBarIconText}>✏️</Text>
              </Pressable>
              <Pressable
                onPress={openDeleteModal}
                style={({ pressed }) => [
                  styles.topBarIconBtn,
                  styles.topBarDeleteBtn,
                  pressed && styles.topBarIconBtnPressed,
                ]}
                hitSlop={8}
              >
                <Text style={styles.topBarIconText}>🗑️</Text>
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AppColors.accentSolid} />
            </View>
          ) : (
            <FlatList
              data={passbooks}
              keyExtractor={(item) => item.id}
              renderItem={renderPassbookItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
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
      </SafeAreaView>

      {renderEditModal()}
      {renderDeleteModal()}
      {renderBusinessBottomSheet()}
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
    paddingBottom: 100,
  },
  // Floating Action Button (FAB)
  fabContainer: {
    position: 'absolute',
    bottom: 24,
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
});
