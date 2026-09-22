import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { createBusiness } from '@/lib/businesses';
import {
  AppColors,
  AppSpacing,
  AppBorderRadius,
  AppFontSizes,
} from '@/constants/theme';

export default function CreateBusinessScreen() {
  const [businessName, setBusinessName] = useState('');
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
  }, [fadeAnim, slideAnim]);

  const handleCreate = async () => {
    const trimmed = businessName.trim();

    if (!trimmed) {
      setError('Please enter a business name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Business name must be at least 2 characters.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await createBusiness(trimmed);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.data) {
      router.replace({
        pathname: '/(app)/business-detail',
        params: {
          id: result.data.id,
          name: result.data.name,
        },
      });
    } else {
      router.back();
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
          <Animated.View
            style={[
              styles.container,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
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
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Text style={styles.icon}>🏢</Text>
                </LinearGradient>
              </View>

              <Text style={styles.title}>New Business</Text>
              <Text style={styles.subtitle}>
                Create a new business to start tracking your cash flow
              </Text>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              {/* Business Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📋</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. My Shop, Daily Expenses"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={businessName}
                    onChangeText={(text) => {
                      setBusinessName(text);
                      if (error) setError('');
                    }}
                    autoCapitalize="words"
                    autoFocus
                    editable={!isSubmitting}
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                  />
                </View>
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  isSubmitting && styles.buttonDisabled,
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
                    <Text style={styles.buttonText}>Create Business</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: AppSpacing.lg,
    paddingTop: Platform.OS === 'android' ? AppSpacing.xxl : AppSpacing.md,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.xl,
  },
  backBtn: {
    paddingVertical: AppSpacing.sm,
    paddingRight: AppSpacing.md,
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backText: {
    fontSize: AppFontSizes.md,
    color: AppColors.accentSolid,
    fontWeight: '600',
  },
  // Content
  content: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: AppSpacing.lg,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: AppBorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: AppFontSizes.xxl,
    fontWeight: '800',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: AppSpacing.xs,
  },
  subtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.xl,
    lineHeight: 20,
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
  // Input
  inputGroup: {
    marginBottom: AppSpacing.md,
  },
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
  },
  inputIcon: {
    fontSize: 16,
    marginRight: AppSpacing.sm,
  },
  input: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.md,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
  },
  // Button
  button: {
    marginTop: AppSpacing.lg,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    paddingVertical: 16,
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
