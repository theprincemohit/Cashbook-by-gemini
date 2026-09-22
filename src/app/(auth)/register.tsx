import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
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

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
  }, [fadeAnim, slideAnim]);

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleSignUp = async () => {
    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please create a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await signUp(email.trim(), password, fullName.trim());

    if (result.success) {
      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: email.trim() },
      });
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }

    setIsSubmitting(false);
  };

  const clearError = () => {
    if (error) setError('');
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
            {/* Branding */}
            <View style={styles.brandSection}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[AppColors.accentStart, AppColors.accentEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoIcon}>₹</Text>
                </LinearGradient>
              </View>
              <View style={styles.brandTextContainer}>
                <Text style={styles.appName}>CashDiary</Text>
                <Text style={styles.tagline}>Start tracking your finances</Text>
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create Account</Text>
              <Text style={styles.cardSubtitle}>
                Sign up to start managing your cash book
              </Text>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      clearError();
                    }}
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>✉</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      clearError();
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearError();
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!isSubmitting}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={8}
                  >
                    <Text style={styles.eyeIcon}>
                      {showPassword ? '🙈' : '👁'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={AppColors.textPlaceholder}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      clearError();
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
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

              {/* Sign Up Button */}
              <Pressable
                onPress={handleSignUp}
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
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Secondary Sign In Button with LinearGradient Border */}
              <Link href="/(auth)/login" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButtonWrapper,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={[AppColors.accentStart, AppColors.accentEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBorderContainer}
                  >
                    <View style={styles.secondaryButtonInner}>
                      <Text style={styles.secondaryButtonText}>Sign In</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Link>
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
  // Branding
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.lg + 2,
  },
  logoContainer: {
    marginRight: AppSpacing.md,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: AppBorderRadius.md + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontSize: AppFontSizes.xl + 2,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: AppFontSizes.xs + 1,
    color: AppColors.textSecondary,
    marginTop: 1,
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
    fontSize: AppFontSizes.lg + 2,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: AppFontSizes.xs + 1,
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.md + 4,
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
  // Inputs
  inputGroup: {
    marginBottom: AppSpacing.sm + 4,
  },
  inputLabel: {
    fontSize: AppFontSizes.xs + 1,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 4,
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
    fontSize: 15,
    marginRight: AppSpacing.sm,
  },
  input: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: AppFontSizes.sm + 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
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
    fontSize: 16,
  },
  // Primary Button
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
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AppSpacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    marginHorizontal: AppSpacing.md,
    fontSize: AppFontSizes.xs,
    color: AppColors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Secondary Button with Gradient Border
  secondaryButtonWrapper: {
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
  },
  gradientBorderContainer: {
    padding: 1.5,
    borderRadius: AppBorderRadius.md,
  },
  secondaryButtonInner: {
    backgroundColor: '#0E1424',
    borderRadius: AppBorderRadius.md - 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
  },
});
