import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/context/AuthContext';
import {
  AppColors,
  AppSpacing,
  AppBorderRadius,
  AppFontSizes,
} from '@/constants/theme';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, resendOtp } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start a subtle pulse animation on the email icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleOtpChange = (text: string, index: number) => {
    setError('');
    setSuccessMsg('');

    // Handle pasted full OTP
    if (text.length > 1) {
      const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);

      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();

      // Auto-submit if all filled
      if (newOtp.every((d) => d !== '')) {
        handleVerify(newOtp.join(''));
      }
      return;
    }

    const digit = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (digit && newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpString?: string) => {
    const code = otpString || otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      triggerShake();
      return;
    }

    if (!email) {
      setError('Email not found. Please go back and try again.');
      return;
    }

    setError('');
    setIsVerifying(true);

    const result = await verifyOtp(email, code);

    if (result.success) {
      // Redirect to dashboard after successful verification
      router.replace('/(app)');
    } else {
      setError(result.message || 'Invalid OTP. Please try again.');
      triggerShake();
      // Clear the OTP inputs on failure
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }

    setIsVerifying(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !email) return;

    setError('');
    setSuccessMsg('');
    setIsResending(true);

    const result = await resendOtp(email);

    if (result.success) {
      setSuccessMsg(result.message || 'OTP resent successfully!');
      setResendTimer(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } else {
      setError(result.message || 'Failed to resend OTP.');
    }

    setIsResending(false);
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, start, middle, end) =>
        start + '•'.repeat(Math.max(middle.length, 3)) + end
      )
    : '';

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
            {/* Email Icon */}
            <View style={styles.brandSection}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Text style={styles.iconEmoji}>✉️</Text>
                </LinearGradient>
              </Animated.View>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit verification code to
              </Text>
              <Text style={styles.emailText}>{maskedEmail}</Text>
            </View>

            {/* Card */}
            <Animated.View
              style={[
                styles.card,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              {/* Success Message */}
              {successMsg ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>✓ {successMsg}</Text>
                </View>
              ) : null}

              {/* OTP Input Boxes */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      error ? styles.otpBoxError : null,
                    ]}
                  >
                    <TextInput
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={({ nativeEvent }) =>
                        handleKeyPress(nativeEvent.key, index)
                      }
                      keyboardType="number-pad"
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      selectTextOnFocus
                      editable={!isVerifying}
                      autoFocus={index === 0}
                    />
                  </View>
                ))}
              </View>

              {/* Verify Button */}
              <Pressable
                onPress={() => handleVerify()}
                disabled={isVerifying || otp.some((d) => !d)}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  (isVerifying || otp.some((d) => !d)) && styles.buttonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    isVerifying || otp.some((d) => !d)
                      ? [AppColors.buttonDisabled, AppColors.buttonDisabled]
                      : [AppColors.accentStart, AppColors.accentEnd]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Continue</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendLabel}>Didn't receive the code? </Text>
                {isResending ? (
                  <ActivityIndicator
                    color={AppColors.accentSolid}
                    size="small"
                  />
                ) : resendTimer > 0 ? (
                  <Text style={styles.resendTimer}>
                    Resend in {resendTimer}s
                  </Text>
                ) : (
                  <Pressable onPress={handleResend} hitSlop={8}>
                    <Text style={styles.resendAction}>Resend OTP</Text>
                  </Pressable>
                )}
              </View>

              {/* Back to Signup */}
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
                hitSlop={8}
              >
                <Text style={styles.backText}>← Back to Sign Up</Text>
              </Pressable>
            </Animated.View>
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
  // Branding / Header
  brandSection: {
    alignItems: 'center',
    marginBottom: AppSpacing.xl,
  },
  iconContainer: {
    marginBottom: AppSpacing.md,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: AppBorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 38,
  },
  title: {
    fontSize: AppFontSizes.xxl,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: AppSpacing.sm,
  },
  subtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.accentSolid,
    marginTop: AppSpacing.xs,
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
  // Success
  successContainer: {
    backgroundColor: AppColors.successBg,
    borderRadius: AppBorderRadius.sm,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successText: {
    color: AppColors.success,
    fontSize: AppFontSizes.sm,
  },
  // OTP
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: AppSpacing.lg,
    marginTop: AppSpacing.sm,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    maxHeight: 56,
    backgroundColor: AppColors.bgInput,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: AppColors.accentSolid,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  otpBoxError: {
    borderColor: AppColors.error,
    backgroundColor: AppColors.errorBg,
  },
  otpInput: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
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
    alignItems: 'center',
    marginTop: AppSpacing.lg,
  },
  resendLabel: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
  },
  resendTimer: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  resendAction: {
    color: AppColors.accentSolid,
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Back
  backButton: {
    alignItems: 'center',
    marginTop: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  backText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
  },
});
