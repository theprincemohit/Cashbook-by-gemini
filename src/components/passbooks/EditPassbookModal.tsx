import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '@/constants/theme';

interface EditPassbookModalProps {
  visible: boolean;
  onClose: () => void;
  editName: string;
  setEditName: (text: string) => void;
  editError: string;
  setEditError: (text: string) => void;
  editLoading: boolean;
  onEditSave: () => void;
}

export function EditPassbookModal({
  visible,
  onClose,
  editName,
  setEditName,
  editError,
  setEditError,
  editLoading,
  onEditSave,
}: EditPassbookModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !editLoading && onClose()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !editLoading && onClose()}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Feather name="edit-2" size={22} color="#FFFFFF" />
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Rename Passbook</Text>
            </View>
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
              onSubmitEditing={onEditSave}
            />

            {editError ? (
              <Text style={styles.modalErrorText}>⚠ {editError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                disabled={editLoading}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && styles.modalBtnPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onEditSave}
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
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: AppSpacing.lg,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: AppSpacing.sm,
  },
  modalSubtitle: {
    fontSize: AppFontSizes.sm + 1,
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.lg,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: AppBorderRadius.md,
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  modalInputError: {
    borderColor: '#EF4444',
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.md,
    marginTop: -AppSpacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    marginTop: AppSpacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: AppBorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  modalBtnPressed: {
    opacity: 0.7,
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
  },
});
