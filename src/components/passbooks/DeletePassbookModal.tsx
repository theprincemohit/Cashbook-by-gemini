import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '@/constants/theme';

interface DeletePassbookModalProps {
  visible: boolean;
  onClose: () => void;
  passbookName: string;
  deleteConfirmText: string;
  setDeleteConfirmText: (text: string) => void;
  deleteError: string;
  setDeleteError: (text: string) => void;
  deleteLoading: boolean;
  onDeleteConfirm: () => void;
}

export function DeletePassbookModal({
  visible,
  onClose,
  passbookName,
  deleteConfirmText,
  setDeleteConfirmText,
  deleteError,
  setDeleteError,
  deleteLoading,
  onDeleteConfirm,
}: DeletePassbookModalProps) {
  const deleteNameMatches = deleteConfirmText.trim() === passbookName.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !deleteLoading && onClose()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !deleteLoading && onClose()}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Feather name="trash-2" size={22} color="#F87171" />
              <Text style={[styles.modalTitle, { marginBottom: 0, color: '#F87171' }]}>
                Delete Passbook
              </Text>
            </View>
            <Text style={styles.modalSubtitle}>
              This action is permanent. All transactions in this passbook will be deleted.
            </Text>

            <View style={styles.deleteWarningBox}>
              <Text style={styles.deleteWarningText}>
                To confirm, type{' '}
                <Text style={styles.deleteWarningBold}>{passbookName}</Text> below
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
              onSubmitEditing={() => deleteNameMatches && onDeleteConfirm()}
            />

            {deleteError ? (
              <Text style={styles.modalErrorText}>⚠ {deleteError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                disabled={deleteLoading}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && styles.modalBtnPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onDeleteConfirm}
                disabled={deleteLoading || !deleteNameMatches}
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && styles.modalBtnPressed,
                  (!deleteNameMatches || deleteLoading) && styles.modalBtnDisabled,
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
  deleteWarningBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  deleteWarningText: {
    color: '#FCA5A5',
    fontSize: AppFontSizes.sm,
    lineHeight: 20,
  },
  deleteWarningBold: {
    fontWeight: '700',
    color: '#FFFFFF',
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
  modalInputDelete: {
    borderColor: 'rgba(248, 113, 113, 0.3)',
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  modalDeleteBtn: {
    flex: 1,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#EF4444',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalDeleteInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.md,
    fontWeight: '700',
  },
});
