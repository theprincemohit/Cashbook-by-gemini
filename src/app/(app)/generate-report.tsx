import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  AppColors,
  AppSpacing,
  AppBorderRadius,
  AppFontSizes,
} from '@/constants/theme';
import { getTransactions, type Transaction } from '@/lib/transactions';

export default function GenerateReportScreen() {
  const { passbookId, passbookName, businessName } = useLocalSearchParams<{
    passbookId: string;
    passbookName: string;
    businessName: string;
  }>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Custom date range state
  const [customDateFrom, setCustomDateFrom] = useState<Date>(new Date());
  const [customDateTo, setCustomDateTo] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Load all transactions for PDF report
  const fetchAllTransactions = useCallback(async () => {
    if (!passbookId) return;
    setIsLoading(true);
    // Fetch with a high limit to compile all transactions for report
    const result = await getTransactions(passbookId, 0, 5000);
    if (result.error) {
      setError(result.error);
    } else {
      setTransactions(result.data ?? []);
      setError('');
    }
    setIsLoading(false);
  }, [passbookId]);

  useEffect(() => {
    fetchAllTransactions();
  }, [fetchAllTransactions]);

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromPicker(false);
    if (selectedDate) {
      setCustomDateFrom(selectedDate);
      if (selectedDate > customDateTo) {
        setCustomDateTo(selectedDate);
      }
    }
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    setShowToPicker(false);
    if (selectedDate) {
      setCustomDateTo(selectedDate);
    }
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter logic (computes in real-time)
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // 1. Type filter
    if (activeFilter !== 'all') {
      result = result.filter((t) => t.type === activeFilter);
    }

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          (t.remark && t.remark.toLowerCase().includes(q)) ||
          (t.contact?.name && t.contact.name.toLowerCase().includes(q))
      );
    }

    // 3. Date filter
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
        cutoff = new Date(startOfDay);
        cutoff.setMonth(cutoff.getMonth() - 1);
      }
      result = result.filter((t) => new Date(t.date) >= cutoff);
    }

    // 4. Amount filter
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

  // Dynamic totals calculated from the current filtered transactions list
  const filteredTotals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'credit') {
        credit += t.amount;
      } else {
        debit += t.amount;
      }
    }
    return { credit, debit, balance: credit - debit };
  }, [filteredTransactions]);

  const clearAllFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
    setDateFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setCustomDateFrom(new Date());
    setCustomDateTo(new Date());
  };

  const getFiltersDescription = () => {
    const parts: string[] = [];
    if (activeFilter !== 'all') parts.push(`Type: ${activeFilter.toUpperCase()}`);
    if (searchQuery.trim()) parts.push(`Search: "${searchQuery}"`);
    if (dateFilter !== 'all') {
      if (dateFilter === 'custom') {
        parts.push(`Date: ${formatShortDate(customDateFrom)} to ${formatShortDate(customDateTo)}`);
      } else {
        parts.push(`Date: ${dateFilter.toUpperCase()}`);
      }
    }
    if (minAmount) parts.push(`Min: ₹${minAmount}`);
    if (maxAmount) parts.push(`Max: ₹${maxAmount}`);
    return parts.length > 0 ? parts.join(', ') : 'All Data';
  };

  // Compile PDF HTML content and share it
  const handleGeneratePDF = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert('No Data', 'No transactions found matching the applied filters.');
      return;
    }

    setIsGenerating(true);

    try {
      const filtersDesc = getFiltersDescription();
      const balanceColor = filteredTotals.balance >= 0 ? '#10B981' : '#EF4444';
      const balancePrefix = filteredTotals.balance >= 0 ? '+' : '';

      const tableRows = filteredTransactions
        .map((t, idx) => {
          const isCredit = t.type === 'credit';
          const rowColor = isCredit ? '#10B981' : '#EF4444';
          const typeLabel = isCredit ? 'Credit (In)' : 'Debit (Out)';
          const amountSign = isCredit ? '+' : '-';
          const dateStr = formatDateString(t.date);

          return `
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 10px; text-align: center; color: #64748B;">${idx + 1}</td>
              <td style="padding: 10px; color: #1E293B;">${dateStr}</td>
              <td style="padding: 10px; color: #1E293B; font-weight: 500;">${t.remark || (isCredit ? 'Cash In' : 'Cash Out')}</td>
              <td style="padding: 10px; color: #475569;">${t.contact?.name || '—'}</td>
              <td style="padding: 10px; text-align: center; color: ${isCredit ? '#10B981' : '#EF4444'}; font-weight: 600;">${typeLabel}</td>
              <td style="padding: 10px; text-align: right; color: ${rowColor}; font-weight: 700;">${amountSign} ₹${t.amount.toLocaleString('en-IN')}</td>
            </tr>
          `;
        })
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${passbookName} Ledger Report</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1E293B;
              margin: 0;
              padding: 30px;
              background-color: #FFFFFF;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #10B981;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .header-info h1 {
              font-size: 28px;
              margin: 0 0 6px 0;
              color: #0F172A;
              font-weight: 800;
            }
            .header-info p {
              margin: 0;
              color: #475569;
              font-size: 15px;
            }
            .header-meta {
              text-align: right;
              font-size: 13px;
              color: #64748B;
              line-height: 1.5;
            }
            .summary-row {
              display: flex;
              gap: 16px;
              margin-bottom: 30px;
            }
            .summary-box {
              flex: 1;
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 12px;
              padding: 18px;
            }
            .summary-box.balance-box {
              background-color: #F0FDF4;
              border-color: #DCFCE7;
            }
            .summary-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748B;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .summary-value {
              font-size: 22px;
              font-weight: 800;
              color: #0F172A;
            }
            .section-title {
              font-size: 18px;
              font-weight: 800;
              color: #0F172A;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #F1F5F9;
              color: #475569;
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
              padding: 12px 10px;
              border-bottom: 2px solid #E2E8F0;
            }
            td {
              padding: 12px 10px;
              font-size: 13px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 11px;
              color: #94A3B8;
              border-top: 1px solid #E2E8F0;
              padding-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <h1>CashDiary Ledger</h1>
              <p>Passbook: <strong>${passbookName}</strong>${businessName ? ` · Business: <strong>${businessName}</strong>` : ''}</p>
            </div>
            <div class="header-meta">
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Filters:</strong> ${filtersDesc}</p>
            </div>
          </div>

          <div class="summary-row">
            <div class="summary-box balance-box">
              <div class="summary-label">Net Balance</div>
              <div class="summary-value" style="color: ${balanceColor};">${balancePrefix} ₹${filteredTotals.balance.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Total Credit</div>
              <div class="summary-value" style="color: #10B981;">₹${filteredTotals.credit.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Total Debit</div>
              <div class="summary-value" style="color: #EF4444;">₹${filteredTotals.debit.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div class="section-title">Ledger Entries (${filteredTransactions.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 6%; text-align: center;">#</th>
                <th style="width: 15%; text-align: left;">Date</th>
                <th style="width: 39%; text-align: left;">Remark</th>
                <th style="width: 18%; text-align: left;">Contact</th>
                <th style="width: 10%; text-align: center;">Type</th>
                <th style="width: 12%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            Generated via CashDiary app. Track your daily transactions securely.
          </div>
        </body>
        </html>
      `;

      // Render PDF statement
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Share / save file via native overlay
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${passbookName} Ledger Report`,
        uti: 'com.adobe.pdf',
      });
    } catch (err: any) {
      Alert.alert('Report Generation Failed', err.message || 'An error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTransactionRow = ({ item, index }: { item: Transaction; index: number }) => {
    const isCredit = item.type === 'credit';
    return (
      <View style={styles.previewRow}>
        <Text style={styles.previewIdx}>{index + 1}</Text>
        <View style={styles.previewInfo}>
          <Text style={styles.previewRemark} numberOfLines={1}>
            {item.remark || (isCredit ? 'Cash In' : 'Cash Out')}
          </Text>
          <Text style={styles.previewDate}>
            {formatDateString(item.date)} {item.contact?.name ? `· ${item.contact.name}` : ''}
          </Text>
        </View>
        <Text
          style={[
            styles.previewAmount,
            { color: isCredit ? AppColors.success : AppColors.error },
          ]}
        >
          {isCredit ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
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
              <Text style={styles.topBarTitle}>View Report</Text>
              <View style={{ width: 60 }} />
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={AppColors.accentSolid} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Info Box */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>📖 {passbookName}</Text>
                  {businessName ? (
                    <Text style={styles.infoSubtitle}>🏢 {businessName}</Text>
                  ) : null}
                </View>

                {/* Filters Board */}
                <View style={styles.board}>
                  <Text style={styles.boardTitle}>🔍 Report Filters</Text>

                  {/* 1. Keyword Search */}
                  <Text style={styles.sectionLabel}>Search Remarks / Contacts</Text>
                  <View style={styles.searchWrapper}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Type query to filter..."
                      placeholderTextColor={AppColors.textPlaceholder}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Text style={styles.searchClear}>✕</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* 2. Type Badges */}
                  <Text style={styles.sectionLabel}>Transaction Type</Text>
                  <View style={styles.badgeRow}>
                    {(['all', 'credit', 'debit'] as const).map((type) => {
                      const isActive = activeFilter === type;
                      const label = type === 'all' ? 'All' : type === 'credit' ? '↓ Credit' : '↑ Debit';
                      return (
                        <Pressable
                          key={type}
                          onPress={() => setActiveFilter(type)}
                          style={[
                            styles.badge,
                            isActive && styles.badgeActive,
                          ]}
                        >
                          <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* 3. Date Presets */}
                  <Text style={styles.sectionLabel}>Date Duration</Text>
                  <View style={styles.gridRow}>
                    {([
                      { key: 'all', label: 'All Time' },
                      { key: 'today', label: 'Today' },
                      { key: 'week', label: 'This Week' },
                      { key: 'month', label: 'This Month' },
                      { key: 'custom', label: '📅 Custom' },
                    ] as const).map((opt) => {
                      const isActive = dateFilter === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          onPress={() => setDateFilter(opt.key)}
                          style={[
                            styles.gridBadge,
                            isActive && styles.badgeActive,
                          ]}
                        >
                          <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Custom pickers inline inside filters board */}
                  {dateFilter === 'custom' && (
                    <View style={styles.customDateBlock}>
                      <View style={styles.dateCol}>
                        <Text style={styles.dateColLabel}>From</Text>
                        {Platform.OS === 'android' ? (
                          <Pressable
                            onPress={() => setShowFromPicker(true)}
                            style={styles.dateBtn}
                          >
                            <Text style={styles.dateText}>{formatShortDate(customDateFrom)}</Text>
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
                      <Text style={styles.dateSep}>→</Text>
                      <View style={styles.dateCol}>
                        <Text style={styles.dateColLabel}>To</Text>
                        {Platform.OS === 'android' ? (
                          <Pressable
                            onPress={() => setShowToPicker(true)}
                            style={styles.dateBtn}
                          >
                            <Text style={styles.dateText}>{formatShortDate(customDateTo)}</Text>
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

                  {/* 4. Amount Limits */}
                  <Text style={styles.sectionLabel}>Amount Limit (₹)</Text>
                  <View style={styles.amountInputRow}>
                    <View style={styles.amountInputWrapper}>
                      <TextInput
                        style={styles.amountInput}
                        value={minAmount}
                        onChangeText={setMinAmount}
                        placeholder="Min Amount"
                        placeholderTextColor={AppColors.textPlaceholder}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={styles.amountSep}>—</Text>
                    <View style={styles.amountInputWrapper}>
                      <TextInput
                        style={styles.amountInput}
                        value={maxAmount}
                        onChangeText={setMaxAmount}
                        placeholder="Max Amount"
                        placeholderTextColor={AppColors.textPlaceholder}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Reset Button */}
                  <Pressable
                    onPress={clearAllFilters}
                    style={({ pressed }) => [
                      styles.resetBtn,
                      pressed && styles.resetBtnPressed,
                    ]}
                  >
                    <Text style={styles.resetBtnText}>Reset Filters</Text>
                  </Pressable>
                </View>

                {/* Filtered Statistics Summary Card */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>📊 Stats Preview (Filtered)</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Credit (In)</Text>
                      <Text style={[styles.statValue, { color: AppColors.success }]}>
                        ₹{filteredTotals.credit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Debit (Out)</Text>
                      <Text style={[styles.statValue, { color: AppColors.error }]}>
                        ₹{filteredTotals.debit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statBox, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: AppSpacing.sm, marginTop: AppSpacing.sm }]}>
                    <Text style={styles.statLabel}>Net Balance</Text>
                    <Text style={[styles.statValue, { color: filteredTotals.balance >= 0 ? AppColors.success : AppColors.error }]}>
                      ₹{filteredTotals.balance.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Entries Preview */}
                <View style={styles.previewSection}>
                  <Text style={styles.previewTitle}>
                    📝 Report Entries Preview ({filteredTransactions.length})
                  </Text>
                  {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyPreview}>
                      <Text style={styles.emptyText}>No matching transactions found</Text>
                    </View>
                  ) : (
                    <View style={styles.previewList}>
                      {filteredTransactions.slice(0, 10).map((item, idx) => (
                        <View key={item.id}>
                          {renderTransactionRow({ item, index: idx })}
                        </View>
                      ))}
                      {filteredTransactions.length > 10 ? (
                        <Text style={styles.moreLabel}>
                          + {filteredTransactions.length - 10} more transactions will be included in the report.
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Print Action Button */}
            {!isLoading && (
              <Pressable
                onPress={handleGeneratePDF}
                disabled={isGenerating || filteredTransactions.length === 0}
                style={({ pressed }) => [
                  styles.generateBtn,
                  pressed && styles.generateBtnPressed,
                  (isGenerating || filteredTransactions.length === 0) && styles.generateBtnDisabled,
                ]}
              >
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.generateBtnGradient}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.generateBtnText}>Generate PDF Report</Text>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  scrollContent: {
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  backBtn: {
    paddingVertical: AppSpacing.sm,
    width: 60,
  },
  backBtnPressed: { opacity: 0.6 },
  backText: {
    fontSize: AppFontSizes.md,
    color: AppColors.accentSolid,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: AppFontSizes.md,
    color: AppColors.textPrimary,
    fontWeight: '800',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
  },
  infoTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
  },
  // Filters board style
  board: {
    backgroundColor: AppColors.bgSecondary,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
  },
  boardTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.md,
  },
  sectionLabel: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: AppSpacing.sm,
    color: AppColors.textMuted,
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
  badgeRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  badge: {
    flex: 1,
    height: 38,
    borderRadius: AppBorderRadius.full,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    backgroundColor: AppColors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: AppColors.success,
  },
  badgeText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  badgeTextActive: {
    color: AppColors.success,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridBadge: {
    width: '48%',
    height: 38,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    backgroundColor: AppColors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Custom Date layout
  customDateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    marginTop: AppSpacing.sm,
  },
  dateCol: {
    flex: 1,
  },
  dateColLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textMuted,
    marginBottom: 4,
  },
  dateBtn: {
    height: 36,
    borderRadius: AppBorderRadius.sm,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    backgroundColor: AppColors.bgInput,
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.md,
  },
  dateText: {
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  dateSep: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.md,
    marginTop: 14,
  },
  // Amount limit styles
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  amountInputWrapper: {
    flex: 1,
    height: 40,
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    paddingHorizontal: AppSpacing.md,
    justifyContent: 'center',
  },
  amountInput: {
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.sm,
    paddingVertical: 0,
  },
  amountSep: {
    color: AppColors.textMuted,
  },
  resetBtn: {
    marginTop: AppSpacing.md,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: AppBorderRadius.md,
  },
  resetBtnPressed: {
    opacity: 0.7,
  },
  resetBtnText: {
    color: AppColors.error,
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Stats card styles
  statsCard: {
    backgroundColor: AppColors.bgSecondary,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
  },
  statsTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: AppFontSizes.md,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  // Preview lists
  previewSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.md,
  },
  previewTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.md,
  },
  emptyPreview: {
    alignItems: 'center',
    paddingVertical: AppSpacing.lg,
  },
  emptyText: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.sm,
  },
  previewList: {
    gap: AppSpacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  previewIdx: {
    width: 24,
    color: AppColors.textMuted,
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  previewInfo: {
    flex: 1,
    marginLeft: AppSpacing.sm,
  },
  previewRemark: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  previewDate: {
    fontSize: 10,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  previewAmount: {
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  moreLabel: {
    fontSize: 11,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginTop: AppSpacing.sm,
    fontStyle: 'italic',
  },
  // Floating action button
  generateBtn: {
    marginHorizontal: AppSpacing.lg,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  generateBtnGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnPressed: {
    opacity: 0.9,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
  },
});
