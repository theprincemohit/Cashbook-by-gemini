import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import { deleteBusiness, updateBusiness } from '@/lib/businesses';
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
        <Text style={styles.passbookArrow}>›</Text>
      </Pressable>
    </Animated.View>
  );
});

export default function BusinessDetailScreen() {
  const { id, name: initialName } = useLocalSearchParams<{ id: string; name: string }>();

  const [businessName, setBusinessName] = useState(initialName ?? 'Business');
  const [passbooks, setPassbooks] = useState<Passbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const fetchPassbooks = useCallback(async () => {
    if (!id) return;
    const result = await getPassbooks(id);
    if (result.error) {
      setError(result.error);
    } else {
      setPassbooks(result.data ?? []);
      setError('');
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchPassbooks();
    }, [fetchPassbooks])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPassbooks();
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
    const result = await updateBusiness(id, trimmed);
    setEditLoading(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setBusinessName(trimmed);
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
    const result = await deleteBusiness(id);
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
        onPress={handlePassbookPress}
        formatDate={formatDate}
        colors={colors}
      />
    );
  }, [handlePassbookPress, formatDate]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📒</Text>
      <Text style={styles.emptyTitle}>No passbooks yet</Text>
      <Text style={styles.emptySubtitle}>
        Create a passbook to start recording transactions for this business
      </Text>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Business Info Card */}
      <View style={styles.businessCard}>
        <LinearGradient
          colors={[AppColors.accentStart, AppColors.accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.businessGradient}
        >
          <View style={styles.businessInitialWrapper}>
            <Text style={styles.businessInitial}>
              {(businessName ?? 'B').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.businessName}>{businessName ?? 'Business'}</Text>
          <Text style={styles.businessSubtext}>
            {passbooks.length}{' '}
            {passbooks.length === 1 ? 'passbook' : 'passbooks'}
          </Text>
        </LinearGradient>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      ) : null}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Passbooks</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/create-passbook',
              params: { businessId: id, businessName: businessName },
            })
          }
          style={({ pressed }) => [
            styles.addBtn,
            pressed && styles.addBtnPressed,
          ]}
        >
          <LinearGradient
            colors={[AppColors.accentStart, AppColors.accentEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtnGradient}
          >
            <Text style={styles.addBtnText}>+ Add New</Text>
          </LinearGradient>
        </Pressable>
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
                    <ActivityIndicator size="small" color="#FFFFFF" />
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
  const deleteNameMatches =
    deleteConfirmText.trim() === businessName.trim();

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
            <Text style={styles.modalTitle}>🗑️  Delete Business</Text>
            <Text style={styles.modalSubtitle}>
              This action is permanent. All passbooks and transactions in this
              business will be deleted.
            </Text>

            <View style={styles.deleteWarningBox}>
              <Text style={styles.deleteWarningText}>
                To confirm, type{' '}
                <Text style={styles.deleteWarningBold}>{businessName}</Text>
                {' '}below
              </Text>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                styles.modalInputDelete,
                deleteError ? styles.modalInputError : null,
              ]}
              value={deleteConfirmText}
              onChangeText={(text) => {
                setDeleteConfirmText(text);
                if (deleteError) setDeleteError('');
              }}
              placeholder={`Type "${businessName}" to delete`}
              placeholderTextColor={AppColors.textPlaceholder}
              autoFocus
              editable={!deleteLoading}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => deleteNameMatches && handleDeleteConfirm()}
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
                disabled={deleteLoading || !deleteNameMatches}
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && styles.modalBtnPressed,
                  (!deleteNameMatches || deleteLoading) &&
                  styles.modalBtnDisabled,
                ]}
              >
                <View style={styles.modalDeleteInner}>
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Delete</Text>
                  )}
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}
              hitSlop={12}
            >
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <View style={styles.topBarActions}>
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
        </Animated.View>
      </SafeAreaView>

      {renderEditModal()}
      {renderDeleteModal()}
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
    paddingBottom: AppSpacing.xxl,
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
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  passbookCardPressed: {
    backgroundColor: AppColors.bgInputFocused,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  passbookIconWrapper: {
    marginRight: AppSpacing.md,
  },
  passbookIconGradient: {
    width: 48,
    height: 48,
    borderRadius: AppBorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passbookIconText: {
    fontSize: 22,
  },
  passbookInfo: {
    flex: 1,
  },
  passbookName: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  passbookDate: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textMuted,
  },
  passbookArrow: {
    fontSize: 24,
    color: AppColors.textMuted,
    marginLeft: AppSpacing.sm,
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
});
