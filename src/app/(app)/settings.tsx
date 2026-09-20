import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { AppColors, AppFontSizes, AppSpacing, AppBorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function SettingsScreen() {
  const { signOut } = useAuth();

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
            <Text style={styles.sectionTitle}>Account</Text>
            
            <Pressable style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed]} onPress={signOut}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconWrapper, { backgroundColor: 'rgba(248, 113, 113, 0.15)' }]}>
                  <Feather name="log-out" size={18} color="#F87171" />
                </View>
                <Text style={[styles.settingItemText, { color: '#F87171' }]}>Sign Out</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
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
    fontWeight: '500',
  },
});
