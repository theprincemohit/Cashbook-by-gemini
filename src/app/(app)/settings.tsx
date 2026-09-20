import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '@/constants/theme';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { deleteBusiness, updateBusiness } from '@/lib/businesses';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { activeBusiness, setActiveBusiness } = useBusiness();
  const businessName = activeBusiness?.name || 'Business';

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
    const result = await updateBusiness(activeBusiness?.id || '', trimmed);
    setEditLoading(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      if (activeBusiness) {
        setActiveBusiness({ id: activeBusiness.id, name: trimmed });
      }
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
    const result = await deleteBusiness(activeBusiness?.id || '');
    setDeleteLoading(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setActiveBusiness(null);
      setDeleteModalVisible(false);
      router.replace('/');
    }
  };

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Feather name="edit-2" size={22} color="#FFFFFF" />
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Rename Business</Text>
            </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Feather name="trash-2" size={22} color="#F87171" />
              <Text style={[styles.modalTitleTextDelete, { marginBottom: 0 }]}>Delete Business</Text>
            </View>
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

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Settings</Text>

            <View style={styles.businessInfoCard}>
              <View style={styles.businessInfoLeft}>
                <View style={styles.businessIconWrapper}>
                  <Feather name="briefcase" size={20} color={AppColors.accentSolid} />
                </View>
                <View>
                  <Text style={styles.businessInfoLabel}>Current Business</Text>
                  <Text style={styles.businessInfoName}>{businessName}</Text>
                </View>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed]} onPress={openEditModal}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconWrapper, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                  <Feather name="edit-2" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.settingItemText}>Rename Business</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>

            <Pressable style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed, { marginTop: 8 }]} onPress={openDeleteModal}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconWrapper, { backgroundColor: 'rgba(248, 113, 113, 0.15)' }]}>
                  <Feather name="trash-2" size={18} color="#F87171" />
                </View>
                <Text style={[styles.settingItemText, { color: '#F87171' }]}>Delete Business</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <Pressable style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed]} onPress={signOut}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconWrapper, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                  <Feather name="log-out" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.settingItemText}>Sign Out</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>
        </View>
        <BottomTabBar activeTab="settings" />
      </SafeAreaView>

      {renderEditModal()}
      {renderDeleteModal()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: AppFontSizes.lg,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: AppSpacing.lg,
  },
  section: {
    marginBottom: AppSpacing.xl,
  },
  sectionTitle: {
    fontSize: AppFontSizes.sm,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: AppSpacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  businessInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  businessInfoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  businessInfoName: {
    fontSize: AppFontSizes.md,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingItemText: {
    fontSize: AppFontSizes.md,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: AppSpacing.lg,
  },
  modalCard: {
    backgroundColor: AppColors.bgSecondary,
    borderRadius: AppBorderRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: AppSpacing.xs,
  },
  modalSubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.lg,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: AppSpacing.md,
  },
  modalInputError: {
    borderColor: AppColors.error,
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
  },
  modalErrorText: {
    color: AppColors.error,
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: AppSpacing.md,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: 10,
    borderRadius: AppBorderRadius.md,
    justifyContent: 'center',
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
  modalBtnPressed: {
    opacity: 0.8,
  },
  modalBtnDisabled: {
    opacity: 0.5,
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
  modalDeleteBtn: {
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
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
