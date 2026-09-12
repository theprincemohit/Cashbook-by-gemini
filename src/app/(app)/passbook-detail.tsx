import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
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
import Pdf from 'react-native-pdf';

import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import { deletePassbook, updatePassbook } from '@/lib/passbooks';
import {
  deleteTransaction,
  getTransactions,
  getTransactionTotals,
  type Transaction,
} from '@/lib/transactions';

interface TransactionItemProps {
  item: Transaction;
  index: number;
  onPress: (item: Transaction) => void;
  onLongPress: (item: Transaction) => void;
  onReceiptPress?: (url: string) => void;
  formatDate: (dateStr: string) => string;
}

const TransactionItem = memo(({
  item,
  index,
  onPress,
  onLongPress,
  onReceiptPress,
  formatDate,
}: TransactionItemProps) => {
  const isCredit = item.type === 'credit';
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index, 10) * 60,
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
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        style={({ pressed }) => [
          styles.txnCard,
          pressed && styles.txnCardPressed,
        ]}
      >
        {/* Left: icon + info */}
        <View style={styles.txnLeft}>
          <View
            style={[
              styles.txnIcon,
              { backgroundColor: isCredit ? AppColors.successBg : AppColors.errorBg },
            ]}
          >
            <Text style={styles.txnIconText}>{isCredit ? '↓' : '↑'}</Text>
          </View>
          <View style={styles.txnInfo}>
            <Text style={styles.txnRemark} numberOfLines={1}>
              {item.remark || (isCredit ? 'Cash In' : 'Cash Out')}
            </Text>
            <View style={styles.txnMeta}>
              <Text style={styles.txnDate}>{formatDate(item.date)}</Text>
              {item.contact?.name ? (
                <Text style={styles.txnContact}>
                  {' '}
                  · {item.contact.name}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Right: amount + receipt indicator */}
        <View style={styles.txnRight}>
          <Text
            style={[
              styles.txnAmount,
              { color: isCredit ? AppColors.success : AppColors.error },
            ]}
          >
            {isCredit ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
          </Text>
          {item.receipt_url ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (onReceiptPress && item.receipt_url) {
                  onReceiptPress(item.receipt_url);
                }
              }}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}
            >
              <Text style={styles.txnReceipt}>📎 View</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function PassbookDetailScreen() {
  const { passbookId, passbookName: initialName, businessName } = useLocalSearchParams<{
    passbookId: string;
    passbookName: string;
    businessName: string;
  }>();

  const [passbookName, setPassbookName] = useState(initialName ?? 'Passbook');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Totals state
  const [totalCredit, setTotalCredit] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Custom date range state
  const [customDateFrom, setCustomDateFrom] = useState<Date>(new Date());
  const [customDateTo, setCustomDateTo] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Date range bottom sheet state
  const [dateBottomSheetVisible, setDateBottomSheetVisible] = useState(false);

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

  // Receipt Modal State
  const [fullReceiptUrl, setFullReceiptUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleOpenAttachment = (url: string) => {
    setFullReceiptUrl(url);
  };

  const handleDownloadReceipt = async (url: string) => {
    try {
      setIsDownloading(true);
      const filename = `receipt_${Date.now()}.jpg`;
      const localUri = FileSystem.documentDirectory + filename;

      if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('ph://')) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(url);
        } else {
          Alert.alert('Success', `Receipt stored at: ${url}`);
        }
      } else {
        const downloadRes = await FileSystem.downloadAsync(url, localUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert('Saved', `Receipt downloaded to: ${downloadRes.uri}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Failed to download receipt.');
    } finally {
      setIsDownloading(false);
    }
  };

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

  const fetchTransactions = useCallback(async () => {
    if (!passbookId) return;
    setIsLoading(true);
    setError('');

    // Fetch totals
    const totalsResult = await getTransactionTotals(passbookId);
    if (totalsResult.error) {
      setError(totalsResult.error);
    } else if (totalsResult.data) {
      setTotalCredit(totalsResult.data.total_credit);
      setTotalDebit(totalsResult.data.total_debit);
    }

    // Fetch first page
    const result = await getTransactions(passbookId, 0, 20);
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data ?? [];
      setTransactions(data);
      setPage(0);
      setHasMore(data.length === 20);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [passbookId]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (!passbookId) return;

    // Fetch totals
    const totalsResult = await getTransactionTotals(passbookId);
    if (totalsResult.error) {
      setError(totalsResult.error);
    } else if (totalsResult.data) {
      setTotalCredit(totalsResult.data.total_credit);
      setTotalDebit(totalsResult.data.total_debit);
    }

    // Fetch page 0
    const result = await getTransactions(passbookId, 0, 20);
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data ?? [];
      setTransactions(data);
      setPage(0);
      setHasMore(data.length === 20);
    }
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoading || isLoadingMore || !hasMore || !passbookId) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const result = await getTransactions(passbookId, nextPage, 20);

    if (result.error) {
      setError(result.error);
    } else {
      const newData = result.data ?? [];
      if (newData.length > 0) {
        setTransactions((prev) => [...prev, ...newData]);
        setPage(nextPage);
      }
      setHasMore(newData.length === 20);
    }
    setIsLoadingMore(false);
  };

  const handleDeleteTxn = useCallback((txn: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ₹${txn.amount.toLocaleString('en-IN')} ${txn.type} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTransaction(txn.id);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              fetchTransactions();
            }
          },
        },
      ]
    );
  }, [fetchTransactions]);

  const handleEditTxn = useCallback((txn: Transaction) => {
    router.push({
      pathname: '/(app)/transaction-form',
      params: {
        passbookId,
        passbookName,
        mode: 'edit',
        transactionId: txn.id,
        txnType: txn.type,
        txnAmount: String(txn.amount),
        txnRemark: txn.remark,
        txnDate: txn.date,
        txnReceiptUrl: txn.receipt_url ?? '',
        txnContactId: txn.contact_id ?? '',
        txnContactName: txn.contact?.name ?? '',
      },
    });
  }, [passbookId, passbookName]);

  // ── Edit Passbook ─────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditName(passbookName);
    setEditError('');
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Passbook name cannot be empty');
      return;
    }
    if (trimmed === passbookName) {
      setEditModalVisible(false);
      return;
    }
    setEditLoading(true);
    setEditError('');
    const result = await updatePassbook(passbookId, trimmed);
    setEditLoading(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setPassbookName(trimmed);
      setEditModalVisible(false);
    }
  };

  // ── Delete Passbook ───────────────────────────────────────────────────────
  const openDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteError('');
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.trim() !== passbookName.trim()) {
      setDeleteError('Passbook name does not match');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    const result = await deletePassbook(passbookId);
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

  // Totals
  const balance = totalCredit - totalDebit;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Type filter
    if (activeFilter !== 'all') {
      result = result.filter((t) => t.type === activeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          (t.remark && t.remark.toLowerCase().includes(q)) ||
          (t.contact?.name && t.contact.name.toLowerCase().includes(q))
      );
    }

    // Date filter
    if (dateFilter === 'custom') {
      const from = new Date(customDateFrom.getFullYear(), customDateFrom.getMonth(), customDateFrom.getDate());
      const to = new Date(customDateTo.getFullYear(), customDateTo.getMonth(), customDateTo.getDate(), 23, 59, 59, 999);
      result = result.filter((t) => {
        const d = new Date(t.date);
        return d >= from && d <= to;
      });
    } else if (dateFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let cutoff: Date;
      if (dateFilter === 'today') {
        cutoff = startOfDay;
      } else if (dateFilter === 'week') {
        cutoff = new Date(startOfDay);
        cutoff.setDate(cutoff.getDate() - 7);
      } else {
        // month
        cutoff = new Date(startOfDay);
        cutoff.setMonth(cutoff.getMonth() - 1);
      }
      result = result.filter((t) => new Date(t.date) >= cutoff);
    }

    // Amount filter
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    if (!isNaN(min)) {
      result = result.filter((t) => t.amount >= min);
    }
    if (!isNaN(max)) {
      result = result.filter((t) => t.amount <= max);
    }

    return result;
  }, [transactions, activeFilter, searchQuery, dateFilter, minAmount, maxAmount, customDateFrom, customDateTo]);

  const hasActiveFilters =
    activeFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    minAmount !== '' ||
    maxAmount !== '';

  const clearAllFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
    setDateFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setCustomDateFrom(new Date());
    setCustomDateTo(new Date());
  };

  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const onFromDateChange = (_event: any, selectedDate?: Date) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomDateFrom(selectedDate);
      // If 'from' is after 'to', push 'to' forward
      if (selectedDate > customDateTo) {
        setCustomDateTo(selectedDate);
      }
    }
  };

  const onToDateChange = (_event: any, selectedDate?: Date) => {
    setShowToPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomDateTo(selectedDate);
    }
  };

  const filterOptions: { key: 'all' | 'credit' | 'debit'; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: transactions.length },
    { key: 'credit', label: '↓ Credit', count: transactions.filter((t) => t.type === 'credit').length },
    { key: 'debit', label: '↑ Debit', count: transactions.filter((t) => t.type === 'debit').length },
  ];

  const dateOptions: { key: 'all' | 'today' | 'week' | 'month' | 'custom'; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: '📅 Custom' },
  ];

  const renderTransactionItem = useCallback(({
    item,
    index,
  }: {
    item: Transaction;
    index: number;
  }) => (
    <TransactionItem
      item={item}
      index={index}
      onPress={handleEditTxn}
      onLongPress={handleDeleteTxn}
      onReceiptPress={(url) => handleOpenAttachment(url)}
      formatDate={formatDate}
    />
  ), [handleEditTxn, handleDeleteTxn, handleOpenAttachment, formatDate]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💰</Text>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first credit or debit entry to get started
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: AppSpacing.sm, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={AppColors.accentSolid} />
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Passbook Summary Card */}
      <View style={styles.summaryCard}>
        <LinearGradient
          colors={[AppColors.accentStart, AppColors.accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryRowsContainer}>
            {/* 1st row: Net Balance */}
            <View style={styles.summaryRowItem}>
              <Text style={styles.summaryRowLabel}>Net Balance</Text>
              <Text
                style={[
                  styles.summaryRowValue,
                  styles.summaryNetBalanceValue,
                  balance < 0 ? styles.summaryNetBalanceNegative : null,
                ]}
              >
                {balance < 0
                  ? `- ₹ ${Math.abs(balance).toLocaleString('en-IN')}`
                  : `₹ ${balance.toLocaleString('en-IN')}`}
              </Text>
            </View>

            <View style={styles.summaryRowSeparator} />

            {/* 2nd row: Cash In (+) */}
            <View style={styles.summaryRowItem}>
              <Text style={styles.summaryRowLabel}>Cash In (+)</Text>
              <Text style={[styles.summaryRowValue, styles.summaryCashInValue]}>
                ₹ {totalCredit.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryRowSeparator} />

            {/* 3rd row: Cash Out (-) */}
            <View style={styles.summaryRowItem}>
              <Text style={styles.summaryRowLabel}>Cash Out (-)</Text>
              <Text style={[styles.summaryRowValue, styles.summaryCashOutValue]}>
                ₹ {totalDebit.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
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
        <Text style={styles.sectionTitle}>
          Transactions ({filteredTransactions.length})
        </Text>
        <View style={styles.sectionHeaderButtons}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(app)/generate-report',
                params: { passbookId, passbookName, businessName },
              })
            }
            style={({ pressed }) => [
              styles.reportBtn,
              pressed && styles.reportBtnPressed,
            ]}
          >
            <Text style={styles.reportBtnText}>📄 Report</Text>
          </Pressable>

          <Pressable
            onPress={() => setDateBottomSheetVisible(true)}
            style={({ pressed }) => [
              styles.filterIconBtn,
              pressed && styles.filterIconBtnPressed,
              hasActiveFilters && styles.filterIconBtnActive,
            ]}
          >
            <Text style={styles.filterIconBtnText}>🔍</Text>
            {hasActiveFilters && (
              <View style={styles.activeFilterDotBadge}>
                <Text style={styles.activeFilterDotText}>
                  {
                    (searchQuery.trim() ? 1 : 0) +
                    (activeFilter !== 'all' ? 1 : 0) +
                    (dateFilter !== 'all' ? 1 : 0) +
                    (minAmount !== '' || maxAmount !== '' ? 1 : 0)
                  }
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Hint / Clear Filters */}
      <View style={styles.filterFooter}>
        <Text style={styles.hint}>Tap to edit · Long press to delete</Text>
        {hasActiveFilters && (
          <Pressable
            onPress={clearAllFilters}
            style={({ pressed }) => [
              styles.clearFiltersBtn,
              pressed && styles.clearFiltersBtnPressed,
            ]}
          >
            <Text style={styles.clearFiltersText}>✕ Clear Filters</Text>
          </Pressable>
        )}
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
            <Text style={styles.modalTitle}>✏️  Rename Passbook</Text>
            <Text style={styles.modalSubtitle}>
              Enter a new name for this passbook
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
              placeholder="Passbook name"
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
  const deleteNameMatches = deleteConfirmText.trim() === passbookName.trim();

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
            <Text style={styles.modalTitle}>🗑️  Delete Passbook</Text>
            <Text style={styles.modalSubtitle}>
              This action is permanent. All transactions in this passbook will
              be deleted.
            </Text>

            <View style={styles.deleteWarningBox}>
              <Text style={styles.deleteWarningText}>
                To confirm, type{' '}
                <Text style={styles.deleteWarningBold}>{passbookName}</Text>
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
              placeholder={`Type "${passbookName}" to delete`}
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

  const renderDateBottomSheet = () => (
    <Modal
      visible={dateBottomSheetVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setDateBottomSheetVisible(false)}
    >
      <View style={styles.bottomSheetOverlay}>
        {/* Background tap overlay */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setDateBottomSheetVisible(false)}
        />

        {/* Card content wrapped in KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={styles.bottomSheetCard}>
            {/* Drag indicator */}
            <View style={styles.bottomSheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.bottomSheetTitle}>Search & Filter</Text>
              <Text style={styles.bottomSheetSubtitle}>Refine transactions in this passbook</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScrollContent}
            >
              {/* 1. Search Query */}
              <Text style={styles.sheetSectionTitle}>Search Remarks / Contacts</Text>
              <View style={styles.sheetSearchContainer}>
                <Text style={styles.sheetSearchIcon}>🔍</Text>
                <TextInput
                  style={styles.sheetSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Type keywords..."
                  placeholderTextColor={AppColors.textPlaceholder}
                  returnKeyType="done"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Text style={styles.sheetSearchClear}>✕</Text>
                  </Pressable>
                )}
              </View>

              {/* 2. Transaction Type */}
              <Text style={styles.sheetSectionTitle}>Transaction Type</Text>
              <View style={styles.sheetGridRow}>
                {filterOptions.map((opt) => {
                  const isActive = activeFilter === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setActiveFilter(opt.key)}
                      style={({ pressed }) => [
                        styles.sheetOptionBadge,
                        isActive && styles.sheetOptionBadgeActive,
                        pressed && styles.sheetOptionBadgePressed,
                      ]}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={[AppColors.accentStart, AppColors.accentEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.sheetOptionBadgeGradient}
                        >
                          <Text style={styles.sheetOptionBadgeTextActive}>
                            {opt.label}
                          </Text>
                          <View style={styles.sheetOptionCountActive}>
                            <Text style={styles.sheetOptionCountTextActive}>
                              {opt.count}
                            </Text>
                          </View>
                        </LinearGradient>
                      ) : (
                        <View style={styles.sheetOptionBadgeInner}>
                          <Text style={styles.sheetOptionBadgeText}>{opt.label}</Text>
                          <View style={styles.sheetOptionCount}>
                            <Text style={styles.sheetOptionCountText}>{opt.count}</Text>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* 3. Date Filter Options */}
              <Text style={styles.sheetSectionTitle}>Date Duration</Text>
              <View style={[styles.sheetGridRow, { flexWrap: 'wrap' }]}>
                {dateOptions.map((opt) => {
                  const isActive = dateFilter === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setDateFilter(opt.key)}
                      style={({ pressed }) => [
                        styles.sheetOptionBadge,
                        isActive && styles.sheetOptionBadgeActive,
                        pressed && styles.sheetOptionBadgePressed,
                        { width: '48%' }, // grid of 2 columns
                      ]}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={[AppColors.accentStart, AppColors.accentEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.sheetOptionBadgeGradient}
                        >
                          <Text style={styles.sheetOptionBadgeTextActive}>
                            {opt.label}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.sheetOptionBadgeInner}>
                          <Text style={styles.sheetOptionBadgeText}>{opt.label}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom Range inline */}
              {dateFilter === 'custom' && (
                <View style={styles.sheetCustomDateContainer}>
                  <View style={styles.customDateCol}>
                    <Text style={styles.customDateLabel}>From</Text>
                    {Platform.OS === 'android' ? (
                      <Pressable
                        onPress={() => setShowFromPicker(true)}
                        style={styles.customDateBtn}
                      >
                        <Text style={styles.customDateIcon}>📅</Text>
                        <Text style={styles.customDateText}>
                          {formatShortDate(customDateFrom)}
                        </Text>
                      </Pressable>
                    ) : null}
                    {(showFromPicker || Platform.OS === 'ios') && (
                      <DateTimePicker
                        value={customDateFrom}
                        mode="date"
                        display="default"
                        onChange={onFromDateChange}
                        themeVariant="dark"
                        textColor="white"
                      />
                    )}
                  </View>
                  <Text style={styles.customDateSeparator}>→</Text>
                  <View style={styles.customDateCol}>
                    <Text style={styles.customDateLabel}>To</Text>
                    {Platform.OS === 'android' ? (
                      <Pressable
                        onPress={() => setShowToPicker(true)}
                        style={styles.customDateBtn}
                      >
                        <Text style={styles.customDateIcon}>📅</Text>
                        <Text style={styles.customDateText}>
                          {formatShortDate(customDateTo)}
                        </Text>
                      </Pressable>
                    ) : null}
                    {(showToPicker || Platform.OS === 'ios') && (
                      <DateTimePicker
                        value={customDateTo}
                        mode="date"
                        display="default"
                        onChange={onToDateChange}
                        minimumDate={customDateFrom}
                        themeVariant="dark"
                        textColor="white"
                      />
                    )}
                  </View>
                </View>
              )}

              {/* 4. Amount Range */}
              <Text style={styles.sheetSectionTitle}>Amount Range (₹)</Text>
              <View style={styles.sheetAmountRow}>
                <View style={styles.sheetAmountWrapper}>
                  <Text style={styles.sheetAmountPrefix}>₹</Text>
                  <TextInput
                    style={styles.sheetAmountInput}
                    value={minAmount}
                    onChangeText={setMinAmount}
                    placeholder="Min"
                    placeholderTextColor={AppColors.textPlaceholder}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
                <Text style={styles.sheetAmountSeparator}>—</Text>
                <View style={styles.sheetAmountWrapper}>
                  <Text style={styles.sheetAmountPrefix}>₹</Text>
                  <TextInput
                    style={styles.sheetAmountInput}
                    value={maxAmount}
                    onChangeText={setMaxAmount}
                    placeholder="Max"
                    placeholderTextColor={AppColors.textPlaceholder}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Action Row */}
            <View style={styles.sheetActionRow}>
              <Pressable
                onPress={() => {
                  clearAllFilters();
                  setDateBottomSheetVisible(false);
                }}
                style={({ pressed }) => [
                  styles.sheetClearBtn,
                  pressed && styles.sheetClearBtnPressed,
                ]}
              >
                <Text style={styles.sheetClearText}>Reset All</Text>
              </Pressable>

              <Pressable
                onPress={() => setDateBottomSheetVisible(false)}
                style={({ pressed }) => [
                  styles.sheetApplyBtn,
                  pressed && styles.sheetApplyBtnPressed,
                ]}
              >
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sheetApplyGradient}
                >
                  <Text style={styles.sheetApplyText}>Apply Filters</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
            <View style={styles.topBarLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && styles.backBtnPressed,
                ]}
                hitSlop={12}
              >
                <Text style={styles.backText}>←</Text>
              </Pressable>
              <View style={styles.topBarTitleContainer}>
                <Text style={styles.topBarPassbookName} numberOfLines={1}>
                  {passbookName ?? 'Passbook'}
                </Text>
                {businessName ? (
                  <Text style={styles.topBarBusinessName} numberOfLines={1}>
                    {businessName}
                  </Text>
                ) : null}
              </View>
            </View>
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
              data={filteredTransactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransactionItem}
              ListHeaderComponent={renderHeader}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.2}
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
                  pathname: '/(app)/transaction-form',
                  params: { passbookId, passbookName, mode: 'create' },
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
                  <Text style={styles.fabText}>New Entry</Text>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>
      </SafeAreaView>

      {renderEditModal()}
      {renderDeleteModal()}
      {renderDateBottomSheet()}

      {/* Full Page Receipt Modal */}
      <Modal
        visible={!!fullReceiptUrl}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFullReceiptUrl(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#121214' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#121214',
            position: 'relative',
          }}>
            <Pressable
              onPress={() => setFullReceiptUrl(null)}
              style={{ position: 'absolute', left: 16, padding: 8 }}
              hitSlop={12}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '400' }}>‹</Text>
            </Pressable>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>Attachment Preview</Text>
          </View>

          {/* Main Preview Area */}
          {fullReceiptUrl ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
              {(() => {
                const urlLower = fullReceiptUrl.toLowerCase();
                const isDoc = urlLower.endsWith('.pdf') || urlLower.endsWith('.doc') || urlLower.endsWith('.docx') || urlLower.includes('application/pdf');

                if (isDoc) {
                  return (
                    <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}>
                      <Pdf
                        trustAllCerts={false}
                        source={{ uri: fullReceiptUrl, cache: true }}
                        onLoadComplete={(numberOfPages) => {
                          console.log(`PDF loaded. Total pages: ${numberOfPages}`);
                        }}
                        onError={(error) => {
                          console.log('PDF Error:', error);
                        }}
                        style={{ flex: 1, width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
                      />
                    </View>
                  );
                }

                return (
                  <Image
                    source={{ uri: fullReceiptUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                );
              })()}
            </View>
          ) : null}

          {/* Bottom Dual Action Bar (Share & Download) */}
          <View style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 16,
            backgroundColor: '#121214',
            gap: 12,
          }}>
            <Pressable
              onPress={() => fullReceiptUrl && handleDownloadReceipt(fullReceiptUrl)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  height: 52,
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={[AppColors.accentStart, AppColors.accentEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18 }}>🔗</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Share</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => fullReceiptUrl && handleDownloadReceipt(fullReceiptUrl)}
              disabled={isDownloading}
              style={({ pressed }) => [
                {
                  flex: 1,
                  height: 52,
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDownloading
                    ? [AppColors.buttonDisabled, AppColors.buttonDisabled]
                    : [AppColors.accentStart, AppColors.accentEnd]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ color: '#FFFFFF', fontSize: 16 }}>↓</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Download</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
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
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: AppSpacing.sm,
  },
  backBtn: {
    paddingVertical: AppSpacing.xs,
    paddingRight: AppSpacing.xs + 2,
  },
  backBtnPressed: { opacity: 0.6 },
  backText: {
    fontSize: 22,
    color: AppColors.accentSolid,
    fontWeight: '700',
  },
  topBarTitleContainer: {
    flex: 1,
    marginLeft: 2,
  },
  topBarPassbookName: {
    fontSize: AppFontSizes.md + 1,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topBarBusinessName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
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
  // Summary Card
  summaryCard: {
    borderRadius: AppBorderRadius.xl,
    overflow: 'hidden',
    marginBottom: AppSpacing.lg,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryGradient: {
    padding: AppSpacing.md + 2,
  },
  summaryHeaderRow: {
    marginBottom: AppSpacing.sm + 2,
  },
  summaryPassbookName: {
    fontSize: AppFontSizes.lg,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryBusinessName: {
    fontSize: AppFontSizes.xs,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  summaryRowsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: AppBorderRadius.lg,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  summaryRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryRowSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  summaryRowLabel: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  summaryRowValue: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryNetBalanceValue: {
    fontSize: AppFontSizes.lg,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryNetBalanceNegative: {
    color: '#FCA5A5',
  },
  summaryCashInValue: {
    color: '#34D399',
  },
  summaryCashOutValue: {
    color: '#F87171',
  },
  summaryItemLabel: {
    fontSize: AppFontSizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: AppSpacing.xs,
  },
  summaryItemValue: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
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
  errorText: { color: AppColors.error, fontSize: AppFontSizes.sm },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.xs,
  },
  sectionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  addBtn: { borderRadius: AppBorderRadius.full, overflow: 'hidden' },
  addBtnPressed: { opacity: 0.8 },
  addBtnGradient: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  hint: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textMuted,
    marginBottom: AppSpacing.md,
  },
  // Transaction Card
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  txnCardPressed: {
    backgroundColor: AppColors.bgInputFocused,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  txnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  txnIconText: { fontSize: 18, fontWeight: '700' },
  txnInfo: { flex: 1 },
  txnRemark: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  txnMeta: { flexDirection: 'row', alignItems: 'center' },
  txnDate: { fontSize: AppFontSizes.xs, color: AppColors.textMuted },
  txnContact: { fontSize: AppFontSizes.xs, color: AppColors.textSecondary },
  txnRight: { alignItems: 'flex-end', marginLeft: AppSpacing.sm },
  txnAmount: { fontSize: AppFontSizes.md, fontWeight: '800' },
  txnReceipt: { fontSize: 14, marginTop: 2 },
  // Empty
  emptyState: {
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.xl,
    alignItems: 'center',
    marginTop: AppSpacing.sm,
  },
  emptyIcon: { fontSize: 48, marginBottom: AppSpacing.md },
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
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    marginBottom: AppSpacing.sm,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: AppSpacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: AppFontSizes.sm,
    color: AppColors.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    fontSize: 14,
    color: AppColors.textMuted,
    paddingLeft: AppSpacing.sm,
  },
  // Filter Badges
  filterScroll: {
    marginBottom: AppSpacing.sm,
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  filterBadge: {
    borderRadius: AppBorderRadius.full,
    overflow: 'hidden',
  },
  filterBadgeActive: {
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  filterBadgePressed: {
    opacity: 0.7,
  },
  filterBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 6,
    gap: 6,
  },
  filterBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgCard,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    borderRadius: AppBorderRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 6,
    gap: 6,
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
  },
  filterBadgeText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  filterCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountText: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  // Amount Filter
  amountFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  amountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    height: 40,
  },
  amountPrefix: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textMuted,
    marginRight: 4,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    fontSize: AppFontSizes.sm,
    color: AppColors.textPrimary,
    paddingVertical: 0,
  },
  amountSeparator: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.sm,
  },
  // Filter Footer
  filterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  clearFiltersBtn: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 4,
    borderRadius: AppBorderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearFiltersBtnPressed: {
    opacity: 0.7,
  },
  clearFiltersText: {
    color: AppColors.error,
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  // Custom Date Range
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  customDateCol: {
    flex: 1,
  },
  customDateLabel: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    height: 40,
    gap: AppSpacing.sm,
  },
  customDateIcon: {
    fontSize: 14,
  },
  customDateText: {
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  customDateSeparator: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.md,
    marginTop: AppSpacing.md,
  },
  // Main search & filter trigger in header
  mainFilterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.bgCard,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    borderRadius: AppBorderRadius.md,
    paddingHorizontal: AppSpacing.md,
    height: 48,
    marginBottom: AppSpacing.md,
  },
  mainFilterTriggerPressed: {
    opacity: 0.7,
  },
  mainFilterTriggerActive: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  mainFilterTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  mainFilterTriggerIcon: {
    fontSize: 16,
    color: AppColors.textMuted,
  },
  mainFilterTriggerText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  mainFilterTriggerTextActive: {
    color: AppColors.success,
    fontWeight: '700',
  },
  mainFilterTriggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  activeFilterCountBadge: {
    backgroundColor: AppColors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  mainFilterTriggerArrow: {
    fontSize: 16,
  },
  // Bottom Sheet General
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  bottomSheetOverlayTap: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: '#141B2D',
    borderTopLeftRadius: AppBorderRadius.xl,
    borderTopRightRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: AppSpacing.lg,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginBottom: AppSpacing.md,
  },
  sheetHeader: {
    marginBottom: AppSpacing.md,
  },
  bottomSheetTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  bottomSheetSubtitle: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textSecondary,
  },
  sheetScrollContent: {
    paddingBottom: AppSpacing.lg,
  },
  sheetSectionTitle: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  // Sheet Search Bar
  sheetSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    height: 44,
    marginBottom: AppSpacing.sm,
  },
  sheetSearchIcon: {
    fontSize: 14,
    marginRight: AppSpacing.sm,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: AppFontSizes.sm,
    color: AppColors.textPrimary,
    paddingVertical: 0,
  },
  sheetSearchClear: {
    fontSize: 14,
    color: AppColors.textMuted,
    paddingLeft: AppSpacing.sm,
  },
  // Grid/Row layouts for options inside sheet
  sheetGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: AppSpacing.sm,
  },
  sheetOptionBadge: {
    flex: 1,
    minWidth: '30%',
    borderRadius: AppBorderRadius.full,
    overflow: 'hidden',
  },
  sheetOptionBadgeActive: {
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetOptionBadgePressed: {
    opacity: 0.7,
  },
  sheetOptionBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 8,
    gap: 6,
    height: 38,
  },
  sheetOptionBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.bgCard,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    borderRadius: AppBorderRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 8,
    gap: 6,
    height: 38,
  },
  sheetOptionBadgeTextActive: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
  },
  sheetOptionBadgeText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  sheetOptionCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionCountTextActive: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sheetOptionCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionCountText: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  // Custom date container inside sheet
  sheetCustomDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    marginBottom: AppSpacing.sm,
  },
  // Amount Range
  sheetAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  sheetAmountWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    height: 40,
  },
  sheetAmountPrefix: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textMuted,
    marginRight: 4,
    fontWeight: '600',
  },
  sheetAmountInput: {
    flex: 1,
    fontSize: AppFontSizes.sm,
    color: AppColors.textPrimary,
    paddingVertical: 0,
  },
  sheetAmountSeparator: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.sm,
  },
  // Action Bottom Row
  sheetActionRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: AppSpacing.md,
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  sheetClearBtn: {
    flex: 1,
    height: 48,
    borderRadius: AppBorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetClearBtnPressed: {
    opacity: 0.7,
  },
  sheetClearText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  sheetApplyBtn: {
    flex: 2,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  sheetApplyBtnPressed: {
    opacity: 0.9,
  },
  sheetApplyGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetApplyText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
  },
  // Section Header Action Buttons
  sectionHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  reportBtn: {
    height: 36,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
  },
  reportBtnPressed: {
    opacity: 0.7,
  },
  reportBtnText: {
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterIconBtnPressed: {
    opacity: 0.7,
  },
  filterIconBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  filterIconBtnText: {
    fontSize: 16,
  },
  activeFilterDotBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activeFilterDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
