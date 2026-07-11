import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
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
import { createContact, getContacts, type Contact } from '@/lib/contacts';
import {
  createTransaction,
  updateTransaction,
  uploadReceipt,
} from '@/lib/transactions';

export default function TransactionFormScreen() {
  const params = useLocalSearchParams<{
    passbookId: string;
    passbookName: string;
    mode: 'create' | 'edit';
    transactionId?: string;
    txnType?: 'credit' | 'debit';
    txnAmount?: string;
    txnRemark?: string;
    txnDate?: string;
    txnReceiptUrl?: string;
    txnContactId?: string;
    txnContactName?: string;
  }>();

  const isEdit = params.mode === 'edit';

  // Form State
  const [type, setType] = useState<'credit' | 'debit'>(
    params.txnType || 'debit'
  );
  const [amount, setAmount] = useState(params.txnAmount || '');
  const [remark, setRemark] = useState(params.txnRemark || '');

  // Date State
  const [date, setDate] = useState(
    params.txnDate ? new Date(params.txnDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Receipt State
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(
    params.txnReceiptUrl || null
  );

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    params.txnContactId || null
  );
  const [showNewContactInput, setShowNewContactInput] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

    loadContacts();
  }, [fadeAnim, slideAnim]);

  const loadContacts = async () => {
    const result = await getContacts();
    if (result.data) {
      setContacts(result.data);
    }
  };

  const handleCreateContact = async () => {
    if (!newContactName.trim()) return;
    const result = await createContact(newContactName.trim());
    if (result.data) {
      setContacts([...contacts, result.data]);
      setSelectedContactId(result.data.id);
      setNewContactName('');
      setShowNewContactInput(false);
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Sorry, we need camera roll permissions to upload receipts.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
      setExistingReceiptUrl(null); // Clear existing if picking new
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!params.passbookId) {
      setError('Passbook information is missing.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      let finalReceiptUrl = existingReceiptUrl;

      // Upload new receipt if selected
      if (receiptUri) {
        const uploadResult = await uploadReceipt(receiptUri);
        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
        finalReceiptUrl = uploadResult.url;
      }

      const payload = {
        type,
        amount: parsedAmount,
        remark: remark.trim(),
        date: date.toISOString(),
        receipt_url: finalReceiptUrl,
        contact_id: selectedContactId,
      };

      let result;
      if (isEdit && params.transactionId) {
        result = await updateTransaction(params.transactionId, payload);
      } else {
        result = await createTransaction({
          ...payload,
          passbook_id: params.passbookId,
        });
      }

      if (result.error) {
        throw new Error(result.error);
      }

      router.back();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}
              hitSlop={12}
            >
              <Text style={styles.backText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
              {isEdit ? 'Edit Transaction' : 'New Transaction'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Error */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              {/* Type Toggle */}
              <View style={styles.typeToggle}>
                <Pressable
                  onPress={() => setType('credit')}
                  style={[
                    styles.typeBtn,
                    type === 'credit' && styles.typeBtnActiveCredit,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      type === 'credit' && styles.typeBtnTextActive,
                    ]}
                  >
                    ↓ Cash In (Credit)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setType('debit')}
                  style={[
                    styles.typeBtn,
                    type === 'debit' && styles.typeBtnActiveDebit,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      type === 'debit' && styles.typeBtnTextActive,
                    ]}
                  >
                    ↑ Cash Out (Debit)
                  </Text>
                </Pressable>
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <View style={styles.inputWrapper}>
                  <Text
                    style={[
                      styles.amountSymbol,
                      {
                        color:
                          type === 'credit'
                            ? AppColors.success
                            : AppColors.error,
                      },
                    ]}
                  >
                    ₹
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={amount}
                    onChangeText={(text) => {
                      // Allow only numbers and one decimal
                      if (/^\d*\.?\d{0,2}$/.test(text)) {
                        setAmount(text);
                        if (error) setError('');
                      }
                    }}
                    keyboardType="decimal-pad"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                {Platform.OS === 'android' && (
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={styles.inputWrapper}
                  >
                    <Text style={styles.inputIcon}>📅</Text>
                    <Text style={styles.inputText}>
                      {date.toLocaleDateString('en-IN')}
                    </Text>
                  </Pressable>
                )}
                {(showDatePicker || Platform.OS === 'ios') && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    themeVariant="dark"
                    textColor="white"
                  />
                )}
              </View>

              {/* Remark */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Remark / Description</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📝</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="What was this for?"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={remark}
                    onChangeText={setRemark}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Contact (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact (Optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.contactsScroll}
                  contentContainerStyle={styles.contactsContainer}
                >
                  <Pressable
                    onPress={() => setSelectedContactId(null)}
                    style={[
                      styles.contactChip,
                      selectedContactId === null && styles.contactChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.contactChipText,
                        selectedContactId === null &&
                        styles.contactChipTextSelected,
                      ]}
                    >
                      None
                    </Text>
                  </Pressable>

                  {contacts.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedContactId(c.id)}
                      style={[
                        styles.contactChip,
                        selectedContactId === c.id &&
                        styles.contactChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.contactChipText,
                          selectedContactId === c.id &&
                          styles.contactChipTextSelected,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}

                  <Pressable
                    onPress={() => setShowNewContactInput(true)}
                    style={styles.contactChip}
                  >
                    <Text style={styles.contactChipText}>+ New</Text>
                  </Pressable>
                </ScrollView>

                {showNewContactInput && (
                  <View style={[styles.inputWrapper, { marginTop: AppSpacing.sm }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="New contact name"
                      placeholderTextColor={AppColors.textPlaceholder}
                      value={newContactName}
                      onChangeText={setNewContactName}
                      autoFocus
                    />
                    <Pressable
                      onPress={handleCreateContact}
                      style={styles.saveContactBtn}
                    >
                      <Text style={styles.saveContactBtnText}>Save</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Receipt Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Receipt (Optional)</Text>
                {(receiptUri || existingReceiptUrl) ? (
                  <View style={styles.receiptPreviewContainer}>
                    <Image
                      source={{ uri: receiptUri || existingReceiptUrl || undefined }}
                      style={styles.receiptPreview}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => {
                        setReceiptUri(null);
                        setExistingReceiptUrl(null);
                      }}
                      style={styles.receiptRemoveBtn}
                    >
                      <Text style={styles.receiptRemoveBtnText}>✕ Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickImage}
                    style={styles.receiptUploadBtn}
                  >
                    <Text style={styles.receiptUploadIcon}>📸</Text>
                    <Text style={styles.receiptUploadText}>
                      Tap to attach receipt image
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  isSubmitting && styles.buttonDisabled,
                  { marginTop: AppSpacing.xl },
                ]}
              >
                <LinearGradient
                  colors={
                    isSubmitting
                      ? [AppColors.buttonDisabled, AppColors.buttonDisabled]
                      : [AppColors.accentStart, AppColors.accentEnd]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isEdit ? 'Save Changes' : 'Save Transaction'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: Platform.OS === 'android' ? AppSpacing.xl : AppSpacing.sm,
    paddingBottom: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  backBtn: { paddingVertical: AppSpacing.sm },
  backBtnPressed: { opacity: 0.6 },
  backText: {
    fontSize: AppFontSizes.md,
    color: AppColors.textSecondary,
    width: 60,
  },
  // Content
  scrollContent: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl * 2,
  },
  content: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  // Error
  errorContainer: {
    backgroundColor: AppColors.errorBg,
    borderRadius: AppBorderRadius.sm,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: { color: AppColors.error, fontSize: AppFontSizes.sm },
  // Type Toggle
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: AppBorderRadius.md,
    padding: 4,
    marginBottom: AppSpacing.xl,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    borderRadius: AppBorderRadius.sm,
  },
  typeBtnActiveCredit: { backgroundColor: AppColors.successBg },
  typeBtnActiveDebit: { backgroundColor: AppColors.errorBg },
  typeBtnText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  typeBtnTextActive: {
    color: AppColors.textPrimary,
  },
  // Inputs
  inputGroup: { marginBottom: AppSpacing.lg },
  inputLabel: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: AppSpacing.md,
    minHeight: 56,
  },
  inputIcon: { fontSize: 16, marginRight: AppSpacing.sm },
  input: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.md,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
  },
  inputText: {
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.md,
  },
  // Amount
  amountSymbol: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    marginRight: AppSpacing.sm,
  },
  amountInput: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.hero,
    fontWeight: '800',
    paddingVertical: Platform.OS === 'ios' ? 16 : 8,
  },
  // Contacts
  contactsScroll: {
    marginHorizontal: -AppSpacing.md, // Bleed edge
  },
  contactsContainer: {
    paddingHorizontal: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  contactChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  contactChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: AppColors.accentSolid,
  },
  contactChipText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  contactChipTextSelected: {
    color: AppColors.textPrimary,
  },
  saveContactBtn: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: AppBorderRadius.sm,
  },
  saveContactBtnText: {
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  // Receipt
  receiptUploadBtn: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  receiptUploadIcon: { fontSize: 32, marginBottom: AppSpacing.sm },
  receiptUploadText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
  },
  receiptPreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: AppBorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptPreview: {
    width: '100%',
    height: '100%',
  },
  receiptRemoveBtn: {
    position: 'absolute',
    top: AppSpacing.sm,
    right: AppSpacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.full,
  },
  receiptRemoveBtnText: {
    color: '#FFF',
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  // Button
  button: {
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  buttonDisabled: { shadowOpacity: 0, elevation: 0 },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
