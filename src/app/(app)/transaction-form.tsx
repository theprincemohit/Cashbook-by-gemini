import DateTimePicker from '@react-native-community/datetimepicker';
import * as ExpoContacts from 'expo-contacts/legacy';
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
  Modal,
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

  // Choose Party Modal State
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [phoneContacts, setPhoneContacts] = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [isLoadingPhoneContacts, setIsLoadingPhoneContacts] = useState(false);
  const [showManualAddInput, setShowManualAddInput] = useState(false);
  const [manualContactName, setManualContactName] = useState('');

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
    console.log("Contacts: ", result)
    if (result.data) {
      setContacts(result.data);
    }
  };

  const openContactPickerModal = () => {
    setContactSearchQuery('');
    setShowManualAddInput(false);
    setManualContactName('');
    setContactModalVisible(true);
    fetchPhoneContacts();
  };

  const fetchPhoneContacts = async () => {
    try {
      setIsLoadingPhoneContacts(true);
      const { status } = await ExpoContacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await ExpoContacts.getContactsAsync({
          fields: [ExpoContacts.Fields.PhoneNumbers, ExpoContacts.Fields.Name],
          sort: ExpoContacts.SortTypes.FirstName,
          pageSize: 50,
        });

        if (data) {
          const formatted = data
            .filter((c) => c.name || c.firstName)
            .map((c) => ({
              id: c.id,
              name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
              phone: c.phoneNumbers?.[0]?.number,
            }));
          setPhoneContacts(formatted);
        }
      }
    } catch (err) {
      console.log('Error loading phone contacts:', err);
    } finally {
      setIsLoadingPhoneContacts(false);
    }
  };

  const handleSelectAppContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setContactModalVisible(false);
  };

  const handleSelectPhoneContact = async (phoneContactName: string) => {
    if (!phoneContactName.trim()) return;

    // Check if already in app contacts
    const existing = contacts.find(
      (c) => c.name.toLowerCase() === phoneContactName.trim().toLowerCase()
    );

    if (existing) {
      Alert.alert('Error', "Contact already exists!");
      return;
    }

    // Create in database
    const result = await createContact(phoneContactName.trim());
    if (result.data) {
      setContacts((prev) => [...prev, result.data!]);
      setSelectedContactId(result.data.id);
      setContactModalVisible(false);
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleAddManualContact = async () => {
    const nameToSave = manualContactName.trim() || contactSearchQuery.trim();
    if (!nameToSave) return;

    await handleSelectPhoneContact(nameToSave);
    setManualContactName('');
    setShowManualAddInput(false);
  };

  const handlePickPhoneContact = async () => {
    try {
      // Request contacts permission
      const { status } = await ExpoContacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your contacts to use this feature.'
        );
        return;
      }

      // Open native contact picker
      const partialContact = await ExpoContacts.presentContactPickerAsync();
      if (!partialContact || !partialContact.id) return; // User cancelled

      // Fetch full details (including phone numbers) for the selected contact
      const pickedContact = await ExpoContacts.getContactByIdAsync(partialContact.id, [
        ExpoContacts.Fields.PhoneNumbers,
        ExpoContacts.Fields.Name,
      ]);
      if (!pickedContact) return;

      console.log("pickedContact with details: ", pickedContact);
      console.log("Phone numbers: ", pickedContact.phoneNumbers);

      // Get phone number if available
      const phoneNumber = pickedContact.phoneNumbers?.[0]?.number;

      // Get the contact's name
      const contactName = pickedContact.name || (pickedContact.firstName
        ? `${pickedContact.firstName || ''} ${pickedContact.lastName || ''}`.trim()
        : 'Unknown Contact');

      if (!contactName || contactName === 'Unknown Contact') {
        Alert.alert('Error', 'Selected contact has no name.');
        return;
      }

      // Check if this contact name already exists in the app
      const existingContact = contacts.find(
        (c) => c.name.toLowerCase() === contactName.toLowerCase()
      );

      if (existingContact) {
        // Select the existing contact
        setSelectedContactId(existingContact.id);
      } else {
        // Create a new contact in the app's database
        const result = await createContact(contactName);
        if (result.data) {
          setContacts((prev) => [...prev, result.data!]);
          setSelectedContactId(result.data.id);
        } else if (result.error) {
          Alert.alert('Error', result.error);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick a contact.');
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
                <Pressable
                  onPress={openContactPickerModal}
                  style={styles.inputWrapper}
                >
                  <Text style={styles.inputIcon}>👤</Text>
                  <Text style={styles.inputText}>
                    {selectedContactId
                      ? contacts.find((c) => c.id === selectedContactId)?.name || 'Selected Contact'
                      : 'Select Contact / Party'}
                  </Text>
                  <Text style={{ marginLeft: 'auto', color: AppColors.textMuted }}>▼</Text>
                </Pressable>
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

        {/* Choose Party Contact Modal */}
        <Modal
          visible={contactModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setContactModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Pressable
                onPress={() => setContactModalVisible(false)}
                style={styles.modalBackBtn}
                hitSlop={10}
              >
                <Text style={styles.modalBackIcon}>←</Text>
              </Pressable>
              <Text style={styles.modalTitleText}>Choose Party</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Search Input Bar */}
            <View style={styles.modalSearchBox}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Type to search and add"
                placeholderTextColor="#6B7280"
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
              />
              {contactSearchQuery.length > 0 && (
                <Pressable onPress={() => setContactSearchQuery('')}>
                  <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Added Parties (App Contacts) */}
              {(() => {
                const filteredApp = contacts.filter((c) =>
                  c.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
                );
                return (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      Added Parties ({filteredApp.length})
                    </Text>
                    {filteredApp.map((item) => {
                      const initial = item.name.charAt(0).toUpperCase();
                      const isSelected = selectedContactId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.partyItemRow,
                            isSelected && styles.partyItemRowSelected,
                          ]}
                          onPress={() => handleSelectAppContact(item.id)}
                        >
                          <View style={[styles.avatarCircle, { backgroundColor: '#7C3AED' }]}>
                            <Text style={styles.avatarText}>{initial}</Text>
                          </View>
                          <View style={styles.partyInfoCol}>
                            <Text style={styles.partyNameText}>{item.name}</Text>
                            <Text style={styles.partySubText}>Customer</Text>
                          </View>
                          {isSelected && <Text style={{ color: '#10B981', fontSize: 18 }}>✓</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}

              {/* Choose from Phone Contacts */}
              {(() => {
                const filteredPhone = phoneContacts.filter((c) =>
                  c.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
                );

                return (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      Choose from contacts ({filteredPhone.length})
                    </Text>

                    {isLoadingPhoneContacts ? (
                      <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 16 }} />
                    ) : filteredPhone.length === 0 ? (
                      <Text style={styles.emptyContactsText}>
                        {contactSearchQuery ? 'No matching phone contacts' : 'No phone contacts found'}
                      </Text>
                    ) : (
                      filteredPhone.map((item) => {
                        const initial = item.name.charAt(0).toUpperCase();
                        return (
                          <Pressable
                            key={item.id}
                            style={styles.partyItemRow}
                            onPress={() => handleSelectPhoneContact(item.name)}
                          >
                            <View style={[styles.avatarCircle, { backgroundColor: '#EC4899' }]}>
                              <Text style={styles.avatarText}>{initial}</Text>
                            </View>
                            <View style={styles.partyInfoCol}>
                              <Text style={styles.partyNameText}>{item.name}</Text>
                              {item.phone ? (
                                <Text style={styles.partySubText}>{item.phone}</Text>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                );
              })()}
            </ScrollView>

            {/* Manual Add Input Box (if open) */}
            {showManualAddInput && (
              <View style={styles.manualInputCard}>
                <TextInput
                  style={styles.manualTextInput}
                  placeholder="Enter party/contact name"
                  placeholderTextColor="#6B7280"
                  value={manualContactName}
                  onChangeText={setManualContactName}
                  autoFocus
                />
                <Pressable
                  style={styles.manualSaveBtn}
                  onPress={handleAddManualContact}
                >
                  <Text style={styles.manualSaveBtnText}>Add</Text>
                </Pressable>
              </View>
            )}

            {/* Bottom Floating Add Manually Button */}
            {!showManualAddInput && (
              <View style={styles.modalFabContainer}>
                <Pressable
                  style={styles.modalFabBtn}
                  onPress={() => {
                    if (contactSearchQuery.trim()) {
                      handleSelectPhoneContact(contactSearchQuery.trim());
                    } else {
                      setShowManualAddInput(true);
                    }
                  }}
                >
                  <Text style={styles.modalFabText}>
                    + Add {contactSearchQuery.trim() ? `"${contactSearchQuery.trim()}"` : 'manually'}
                  </Text>
                </Pressable>
              </View>
            )}
          </SafeAreaView>
        </Modal>
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
  phoneContactChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
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

  // ── Choose Party Modal Styles ──────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: '#1E1E2A',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: Platform.OS === 'android' ? AppSpacing.lg : AppSpacing.sm,
    paddingBottom: AppSpacing.md,
  },
  modalBackBtn: {
    padding: AppSpacing.xs,
  },
  modalBackIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  modalTitleText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272738',
    marginHorizontal: AppSpacing.lg,
    borderRadius: AppBorderRadius.md,
    paddingHorizontal: AppSpacing.md,
    height: 48,
    marginBottom: AppSpacing.md,
  },
  modalSearchIcon: {
    fontSize: 16,
    marginRight: AppSpacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: AppSpacing.lg,
  },
  modalSection: {
    marginBottom: AppSpacing.xl,
  },
  modalSectionTitle: {
    color: '#9CA3AF',
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
    marginBottom: AppSpacing.md,
    textTransform: 'none',
  },
  partyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  partyItemRowSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: AppBorderRadius.sm,
    paddingHorizontal: AppSpacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
  },
  partyInfoCol: {
    flex: 1,
  },
  partyNameText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  partySubText: {
    color: '#9CA3AF',
    fontSize: AppFontSizes.xs,
  },
  emptyContactsText: {
    color: '#6B7280',
    fontSize: AppFontSizes.sm,
    fontStyle: 'italic',
    marginVertical: AppSpacing.sm,
  },
  manualInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272738',
    padding: AppSpacing.md,
    marginHorizontal: AppSpacing.lg,
    borderRadius: AppBorderRadius.md,
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
  },
  manualTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
  },
  manualSaveBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.sm,
    marginLeft: AppSpacing.sm,
  },
  manualSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFabContainer: {
    position: 'absolute',
    bottom: 28,
    right: AppSpacing.lg,
  },
  modalFabBtn: {
    backgroundColor: '#818CF8',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: 14,
    borderRadius: AppBorderRadius.full,
    elevation: 6,
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalFabText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
  },
});
