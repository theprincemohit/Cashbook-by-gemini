import DateTimePicker from '@react-native-community/datetimepicker';
import * as ExpoContacts from 'expo-contacts/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
import Pdf from 'react-native-pdf';

import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import {
  createContact,
  deleteContact,
  getContacts,
  updateContact,
  type Contact,
} from '@/lib/contacts';
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
  const [fullReceiptUrl, setFullReceiptUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [receiptPickerModalVisible, setReceiptPickerModalVisible] = useState(false);

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
  const [manualContactPhone, setManualContactPhone] = useState('');

  // Manage Contacts Modal State
  const [manageContactsModalVisible, setManageContactsModalVisible] = useState(false);
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

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

  const openContactPickerModal = () => {
    setContactSearchQuery('');
    setShowManualAddInput(false);
    setManualContactName('');
    setManualContactPhone('');
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

  const handleSelectPhoneContact = async (phoneContactName: string, phoneNumber?: string) => {
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
    const result = await createContact(phoneContactName.trim(), phoneNumber?.trim());
    if (result.data) {
      setContacts((prev) => [...prev, result.data!]);
      setSelectedContactId(result.data.id);
      setContactModalVisible(false);
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const startEditingContact = (contact: Contact) => {
    setEditingContact(contact);
    setEditContactName(contact.name);
    setEditContactPhone(contact.phone || '');
  };

  const handleSaveEditContact = async () => {
    if (!editingContact) return;
    const nameTrimmed = editContactName.trim();
    if (!nameTrimmed) {
      Alert.alert('Error', 'Contact name cannot be empty.');
      return;
    }

    const result = await updateContact(editingContact.id, nameTrimmed, editContactPhone.trim());
    if (result.data) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContact.id ? result.data! : c))
      );
      setEditingContact(null);
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleDeleteContact = (contact: Contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${contact.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteContact(contact.id);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              setContacts((prev) => prev.filter((c) => c.id !== contact.id));
              if (selectedContactId === contact.id) {
                setSelectedContactId(null);
              }
              if (editingContact?.id === contact.id) {
                setEditingContact(null);
              }
            }
          },
        },
      ]
    );
  };

  const handleAddManualContact = async () => {
    const nameToSave = manualContactName.trim() || contactSearchQuery.trim();
    if (!nameToSave) return;

    await handleSelectPhoneContact(nameToSave, manualContactPhone.trim());
    setManualContactName('');
    setManualContactPhone('');
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
        const result = await createContact(contactName, phoneNumber);
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

  const pickFromGallery = async () => {
    setReceiptPickerModalVisible(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'CashDiary needs access to your photos to attach receipts.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
        setExistingReceiptUrl(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick image from gallery.');
    }
  };

  const pickFromCamera = async () => {
    setReceiptPickerModalVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'CashDiary needs camera permission to take receipt photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
        setExistingReceiptUrl(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture photo with camera.');
    }
  };

  const pickFromFileManager = async () => {
    setReceiptPickerModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
        setExistingReceiptUrl(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick file from file manager.');
    }
  };

  const handlePickReceipt = () => {
    setReceiptPickerModalVisible(true);
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

  const handleOpenAttachment = (url: string) => {
    setFullReceiptUrl(url);
  };

  const handleShareReceipt = async (url: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('ph://')) {
          await Sharing.shareAsync(url);
        } else {
          const filename = `receipt_${Date.now()}.jpg`;
          const localUri = FileSystem.documentDirectory + filename;
          const downloadRes = await FileSystem.downloadAsync(url, localUri);
          await Sharing.shareAsync(downloadRes.uri);
        }
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
      }
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Failed to share receipt.');
    }
  };

  const handleDownloadReceipt = async (url: string) => {
    try {
      setIsDownloading(true);
      const filename = `receipt_${Date.now()}.jpg`;
      const localUri = FileSystem.documentDirectory + filename;

      if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('ph://')) {
        Alert.alert('Success', 'Receipt is already saved locally on your device.');
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
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: AppBorderRadius.md,
                    paddingHorizontal: AppSpacing.md,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                  }}>
                    <Pressable
                      onPress={() => {
                        const target = receiptUri || existingReceiptUrl;
                        if (target) handleOpenAttachment(target);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}
                    >
                      {(() => {
                        const targetUrl = (receiptUri || existingReceiptUrl || '').toLowerCase();
                        const isDoc = targetUrl.endsWith('.pdf') || targetUrl.endsWith('.doc') || targetUrl.endsWith('.docx') || targetUrl.includes('application/pdf');

                        if (isDoc) {
                          return <Text style={{ fontSize: 20, width: 20, height: 20, textAlign: 'center', marginRight: 10 }}>📄</Text>;
                        }

                        return (
                          <Image
                            source={{ uri: receiptUri || existingReceiptUrl || undefined }}
                            style={{ width: 20, height: 20, borderRadius: 4, marginRight: 10 }}
                            resizeMode="cover"
                          />
                        );
                      })()}
                      <Text style={{ color: '#FFFFFF', fontSize: AppFontSizes.md, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                        {(receiptUri || existingReceiptUrl)?.split('/').pop() || 'Attachment'}
                      </Text>
                      <Text style={{ color: '#818CF8', fontSize: AppFontSizes.xs, fontWeight: '600', marginLeft: 6 }}>🔍 View</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setReceiptUri(null);
                        setExistingReceiptUrl(null);
                      }}
                      hitSlop={10}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700' }}>✕</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickReceipt}
                    style={styles.receiptUploadBtn}
                  >
                    <Text style={styles.receiptUploadIcon}>📌</Text>
                    <Text style={styles.receiptUploadText}>
                      Attach receipt (Gallery, Camera, Files)
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
                      : type === 'credit'
                      ? ['#059669', '#10B981']
                      : ['#DC2626', '#EF4444']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.buttonGradient,
                    {
                      shadowColor: type === 'credit' ? '#10B981' : '#EF4444',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 6,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {(() => {
                        const icon = type === 'credit' ? '↓' : '↑';
                        const label = type === 'credit' ? 'Cash In' : 'Cash Out';
                        const num = parseFloat(amount);
                        const formattedAmount = !isNaN(num) && num > 0 ? ` ₹${num.toLocaleString('en-IN')}` : '';

                        if (isEdit) {
                          return `Save Changes${formattedAmount}`;
                        }
                        return `${icon} Save${formattedAmount} (${label})`;
                      })()}
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
              <Pressable
                onPress={() => {
                  setManageSearchQuery('');
                  setManageContactsModalVisible(true);
                }}
                style={styles.modalBackBtn}
                hitSlop={10}
              >
                <Text style={{ fontSize: 20 }}>⚙️</Text>
              </Pressable>
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
                            <Text style={styles.partySubText}>{item.phone}</Text>
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
                const existingNamesSet = new Set(
                  contacts.map((c) => c.name.trim().toLowerCase())
                );
                const filteredPhone = phoneContacts.filter((c) => {
                  const isAlreadyAdded = existingNamesSet.has(c.name.trim().toLowerCase());
                  const matchesSearch = c.name.toLowerCase().includes(contactSearchQuery.toLowerCase());
                  return !isAlreadyAdded && matchesSearch;
                });

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
                            onPress={() => handleSelectPhoneContact(item.name, item.phone)}
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
                <View style={styles.manualInputsCol}>
                  <TextInput
                    style={styles.manualTextInput}
                    placeholder="Enter party/contact name"
                    placeholderTextColor="#6B7280"
                    value={manualContactName}
                    onChangeText={setManualContactName}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.manualTextInput, { marginTop: 8 }]}
                    placeholder="Enter phone number (optional)"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    value={manualContactPhone}
                    onChangeText={setManualContactPhone}
                  />
                </View>
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

        {/* Manage Contacts Modal */}
        <Modal
          visible={manageContactsModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setManageContactsModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Pressable
                onPress={() => setManageContactsModalVisible(false)}
                style={styles.modalBackBtn}
                hitSlop={10}
              >
                <Text style={styles.modalBackIcon}>←</Text>
              </Pressable>
              <Text style={styles.modalTitleText}>Manage Contacts</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.modalSearchBox}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search saved contacts..."
                placeholderTextColor="#6B7280"
                value={manageSearchQuery}
                onChangeText={setManageSearchQuery}
              />
              {manageSearchQuery.length > 0 && (
                <Pressable onPress={() => setManageSearchQuery('')}>
                  <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Contact Edit Form (when editing) */}
            {editingContact ? (
              <View style={[styles.manualInputCard, { position: 'relative', bottom: 0, marginBottom: 16 }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', marginBottom: 8 }}>
                  Edit Contact
                </Text>
                <View style={styles.manualInputsCol}>
                  <TextInput
                    style={styles.manualTextInput}
                    placeholder="Contact name"
                    placeholderTextColor="#6B7280"
                    value={editContactName}
                    onChangeText={setEditContactName}
                  />
                  <TextInput
                    style={[styles.manualTextInput, { marginTop: 8 }]}
                    placeholder="Phone number"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    value={editContactPhone}
                    onChangeText={setEditContactPhone}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={[styles.manualSaveBtn, { flex: 1, backgroundColor: '#374151', marginTop: 0 }]}
                    onPress={() => setEditingContact(null)}
                  >
                    <Text style={styles.manualSaveBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.manualSaveBtn, { flex: 1, marginTop: 0 }]}
                    onPress={handleSaveEditContact}
                  >
                    <Text style={styles.manualSaveBtnText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Contacts List */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {(() => {
                const filtered = contacts.filter((c) =>
                  c.name.toLowerCase().includes(manageSearchQuery.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <Text style={styles.emptyContactsText}>
                      {manageSearchQuery ? 'No matching contacts' : 'No saved contacts yet'}
                    </Text>
                  );
                }

                return filtered.map((item) => {
                  const initial = item.name.charAt(0).toUpperCase();
                  return (
                    <View key={item.id} style={styles.partyItemRow}>
                      <View style={[styles.avatarCircle, { backgroundColor: '#7C3AED' }]}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                      <View style={styles.partyInfoCol}>
                        <Text style={styles.partyNameText}>{item.name}</Text>
                        {item.phone ? (
                          <Text style={styles.partySubText}>{item.phone}</Text>
                        ) : null}
                      </View>

                      {/* Action buttons: Edit & Delete */}
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Pressable
                          onPress={() => startEditingContact(item)}
                          hitSlop={8}
                        >
                          <Text style={{ fontSize: 18 }}>✏️</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteContact(item)}
                          hitSlop={8}
                        >
                          <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Full Page Receipt View & Download Modal */}
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
                onPress={() => fullReceiptUrl && handleShareReceipt(fullReceiptUrl)}
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
                    padding: 1.5,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: '#1E1E24',
                      borderRadius: 10.5,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 18 }}>🔗</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Share</Text>
                  </View>
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
        {/* Bottom Sheet Modal for Receipt Source Selection */}
        <Modal
          visible={receiptPickerModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setReceiptPickerModalVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              justifyContent: 'flex-end',
            }}
            onPress={() => setReceiptPickerModalVisible(false)}
          >
            <Pressable
              style={{
                backgroundColor: '#1E1E2A',
                borderTopLeftRadius: AppBorderRadius.xl,
                borderTopRightRadius: AppBorderRadius.xl,
                paddingHorizontal: AppSpacing.lg,
                paddingTop: AppSpacing.lg,
                paddingBottom: Platform.OS === 'ios' ? 40 : AppSpacing.xl,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: AppSpacing.lg,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: AppFontSizes.md + 1,
                    fontWeight: '700',
                  }}
                >
                  Attach image and pdf
                </Text>
                <Pressable
                  onPress={() => setReceiptPickerModalVisible(false)}
                  hitSlop={10}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#9CA3AF', fontSize: 16, fontWeight: '700' }}>✕</Text>
                </Pressable>
              </View>

              {/* Options */}
              <View style={{ gap: 8 }}>
                {/* 1. Take Photo */}
                <Pressable
                  onPress={pickFromCamera}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: AppBorderRadius.md,
                      paddingHorizontal: AppSpacing.md,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>📷</Text>
                  </View>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: AppFontSizes.sm + 1,
                      fontWeight: '600',
                    }}
                  >
                    Take photo using camera
                  </Text>
                </Pressable>

                {/* 2. Choose from Gallery */}
                <Pressable
                  onPress={pickFromGallery}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: AppBorderRadius.md,
                      paddingHorizontal: AppSpacing.md,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>🖼️</Text>
                  </View>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: AppFontSizes.sm + 1,
                      fontWeight: '600',
                    }}
                  >
                    Choose from gallery
                  </Text>
                </Pressable>

                {/* 3. Choose PDF / Document */}
                <Pressable
                  onPress={pickFromFileManager}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: AppBorderRadius.md,
                      paddingHorizontal: AppSpacing.md,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>📄</Text>
                  </View>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: AppFontSizes.sm + 1,
                      fontWeight: '600',
                    }}
                  >
                    Choose pdf
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: AppBorderRadius.md,
    padding: 4,
    marginBottom: AppSpacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: AppBorderRadius.sm + 2,
  },
  typeBtnActiveCredit: {
    backgroundColor: '#059669',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  typeBtnActiveDebit: {
    backgroundColor: '#DC2626',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  typeBtnText: {
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Inputs
  inputGroup: { marginBottom: AppSpacing.md },
  inputLabel: {
    fontSize: AppFontSizes.xs + 1,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: AppSpacing.md,
    minHeight: 46,
  },
  inputIcon: { fontSize: 15, marginRight: AppSpacing.sm },
  input: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.sm + 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  inputText: {
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.sm + 1,
  },
  // Amount
  amountSymbol: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    marginRight: AppSpacing.sm,
  },
  amountInput: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.xl + 4,
    fontWeight: '800',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderStyle: 'dashed',
    borderRadius: AppBorderRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 12,
    minHeight: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  receiptUploadIcon: { fontSize: 16, marginRight: 8 },
  receiptUploadText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '500',
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
    flexDirection: 'column',
    backgroundColor: '#272738',
    padding: AppSpacing.md,
    marginHorizontal: AppSpacing.lg,
    borderRadius: AppBorderRadius.md,
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
  },
  manualInputsCol: {
    width: '100%',
  },
  manualTextInput: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 10,
    borderRadius: AppBorderRadius.sm,
  },
  manualSaveBtn: {
    backgroundColor: '#8B5CF6',
    width: '100%',
    paddingVertical: 12,
    borderRadius: AppBorderRadius.sm,
    marginTop: AppSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: AppFontSizes.md,
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
