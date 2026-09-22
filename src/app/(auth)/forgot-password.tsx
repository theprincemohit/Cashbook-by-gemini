import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordScreen() {
  const { resetPasswordForEmail, verifyRecoveryOtp, updatePassword } = useAuth();

  // Step state: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
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
  }, [step, fadeAnim, slideAnim]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await resetPasswordForEmail(trimmedEmail);
    setIsSubmitting(false);

    if (result.success) {
      setInfoMessage(result.message || 'OTP code has been sent to your email.');
      setStep(2);
    } else {
      setError(result.message || 'Failed to send OTP code. Please check your email and try again.');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await verifyRecoveryOtp(email.trim(), trimmedOtp);
    setIsSubmitting(false);

    if (result.success) {
      setError('');
      setInfoMessage('');
      setStep(3);
    } else {
      setError(result.message || 'Invalid or expired OTP code. Please try again.');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);
    const result = await resetPasswordForEmail(email.trim());
    setIsSubmitting(false);
    if (result.success) {
      setInfoMessage(result.message || 'A new OTP code has been sent to your email.');
    } else {
      setError(result.message || 'Failed to resend OTP code.');
    }
  };

  // Step 3: Create New Password & Confirm Password
  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!confirmPassword) {
      setError('Please confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (result.success) {
      setStep(4);
    } else {
      setError(result.message || 'Failed to update password. Please try again.');
    }
  };

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
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
            {/* Top Bar Back Button */}
            <Pressable
              onPress={() => {
                if (step > 1 && step < 4) {
                  setError('');
                  setInfoMessage('');
                  setStep((prev) => (prev - 1) as 1 | 2 | 3);
                } else {
                  router.back();
                }
              }}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={12}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>

            {/* Branding Header */}
            <View style={styles.brandSection}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoIcon}>🔑</Text>
                </LinearGradient>
              </View>
              <Text style={styles.appName}>Reset Password</Text>
              <Text style={styles.tagline}>
                {step === 1
                  ? 'Enter your email to receive a password reset OTP'
                  : step === 2
                    ? 'Enter the verification OTP sent to your email'
                    : step === 3
                      ? 'Set a new secure password for your account'
                      : 'Password updated successfully'}
              </Text>
            </View>

            {/* Card Container */}
            <View style={styles.card}>
              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              {/* Info Message */}
              {infoMessage && !error ? (
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>ℹ {infoMessage}</Text>
                </View>
              ) : null}

              {/* STEP 1: Enter Email */}
              {step === 1 && (
                <>
                  <Text style={styles.cardTitle}>Find Your Account</Text>
                  <Text style={styles.cardSubtitle}>
                    Enter your registered email address and we'll send you an OTP code to reset your password.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>✉</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor={AppColors.textPlaceholder}
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (error) setError('');
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSendOtp}
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
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {/* STEP 2: Enter OTP */}
              {step === 2 && (
                <>
                  <Text style={styles.cardTitle}>Verify OTP Code</Text>
                  <Text style={styles.cardSubtitle}>
                    We've sent a 6-digit OTP code to <Text style={styles.boldText}>{email}</Text>.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>OTP Code</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>🔢</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor={AppColors.textPlaceholder}
                        value={otp}
                        onChangeText={(text) => {
                          setOtp(text);
                          if (error) setError('');
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={handleVerifyOtp}
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
                        <Text style={styles.buttonText}>Verify OTP</Text>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the OTP? </Text>
                    <Pressable onPress={handleResendOtp} disabled={isSubmitting}>
                      <Text style={styles.resendAction}>Resend OTP</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* STEP 3: Create New Password */}
              {step === 3 && (
                <>
                  <Text style={styles.cardTitle}>Create New Password</Text>
                  <Text style={styles.cardSubtitle}>
                    Enter and confirm your new password below.
                  </Text>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Enter new password (min. 6 chars)"
                        placeholderTextColor={AppColors.textPlaceholder}
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          if (error) setError('');
                        }}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        editable={!isSubmitting}
                      />
                      <Pressable
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}
                        hitSlop={8}
                      >
                        <Text style={styles.eyeIcon}>
                          {showNewPassword ? '🙈' : '👁'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Confirm new password"
                        placeholderTextColor={AppColors.textPlaceholder}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (error) setError('');
                        }}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!isSubmitting}
                      />
                      <Pressable
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                        hitSlop={8}
                      >
                        <Text style={styles.eyeIcon}>
                          {showConfirmPassword ? '🙈' : '👁'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleResetPassword}
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
                        <Text style={styles.buttonText}>Reset Password</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              {/* STEP 4: Success Screen */}
              {step === 4 && (
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>🎉</Text>
                  <Text style={styles.cardTitle}>Password Reset Complete!</Text>
                  <Text style={styles.cardSubtitle}>
                    Your password has been successfully updated. You can now sign in using your new password.
                  </Text>

                  <Pressable
                    onPress={() => router.replace('/(auth)/login')}
                    style={({ pressed }) => [
                      styles.button,
                      { width: '100%', marginTop: AppSpacing.md },
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <LinearGradient
                      colors={[AppColors.accentStart, AppColors.accentEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>Back to Sign In</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}

              {/* Back to Sign In Link */}
              {step !== 4 && (
                <View style={styles.linkContainer}>
                  <Text style={styles.linkText}>Remembered your password? </Text>
                  <Pressable onPress={() => router.replace('/(auth)/login')}>
                    <Text style={styles.linkAction}>Sign In</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.xxl,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: AppSpacing.md,
  },
  backBtnText: {
    fontSize: AppFontSizes.md,
    color: AppColors.accentSolid,
    fontWeight: '600',
  },
  // Branding
  brandSection: {
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  logoContainer: {
    marginBottom: AppSpacing.sm,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: AppBorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: AppFontSizes.xxl,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    marginTop: AppSpacing.xs,
    textAlign: 'center',
  },
  // Card
  card: {
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: AppColors.shadowDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  cardSubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: AppSpacing.lg,
  },
  boldText: {
    color: AppColors.textPrimary,
    fontWeight: '700',
  },
  // Notifications
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
  infoContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: AppBorderRadius.sm,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  infoText: {
    color: '#60A5FA',
    fontSize: AppFontSizes.sm,
  },
  // Inputs
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
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: AppSpacing.md,
    padding: AppSpacing.xs,
  },
  eyeIcon: {
    fontSize: 18,
  },
  // Button
  button: {
    marginTop: AppSpacing.md,
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
  // Resend
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: AppSpacing.md,
  },
  resendText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
  },
  resendAction: {
    color: AppColors.accentSolid,
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Link
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: AppSpacing.lg,
  },
  linkText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
  },
  linkAction: {
    color: AppColors.accentSolid,
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Success
  successContainer: {
    alignItems: 'center',
    paddingVertical: AppSpacing.md,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: AppSpacing.md,
  },
});
