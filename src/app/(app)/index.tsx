import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AppBorderRadius,
  AppColors,
  AppFontSizes,
  AppSpacing,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getBusinesses, type Business } from '@/lib/businesses';

interface BusinessItemProps {
  item: Business;
  index: number;
  onPress: (item: Business) => void;
  formatDate: (dateStr: string) => string;
}

const BusinessItem = memo(({ item, index, onPress, formatDate }: BusinessItemProps) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index, 10) * 80,
      useNativeDriver: true,
    }).start();
  }, [itemAnim, index]);

  return (
    <Animated.View style={{ opacity: itemAnim, transform: [{ translateY: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }}>
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.businessCard,
          pressed && styles.businessCardPressed,
        ]}
      >
        <View style={styles.businessIconWrapper}>
          <LinearGradient
            colors={[AppColors.accentStart, AppColors.accentEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.businessIconGradient}
          >
            <Text style={styles.businessIconText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.businessInfo}>
          <Text style={styles.businessName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.businessDate}>
            Created {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={styles.businessArrow}>›</Text>
      </Pressable>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  const fetchBusinesses = useCallback(async () => {
    const result = await getBusinesses();
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data ?? [];
      setBusinesses(data);
      setError('');

      // If user already has at least one business, directly navigate to business-detail
      if (data.length > 0) {
        let targetBusiness = data[0];
        try {
          const lastSavedId = await AsyncStorage.getItem('last_selected_business_id');
          if (lastSavedId) {
            const found = data.find((b) => b.id === lastSavedId);
            if (found) targetBusiness = found;
          }
        } catch (e) {
          console.log('Error reading last_selected_business_id:', e);
        }

        router.replace({
          pathname: '/(app)/business-detail',
          params: { id: targetBusiness.id, name: targetBusiness.name },
        });
        return;
      }
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBusinesses();
    }, [fetchBusinesses])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBusinesses();
  };

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Good Morning'
      : currentHour < 17
        ? 'Good Afternoon'
        : 'Good Evening';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleBusinessPress = useCallback((item: Business) => {
    router.push({
      pathname: '/(app)/business-detail',
      params: { id: item.id, name: item.name },
    });
  }, []);

  const renderBusinessItem = useCallback(({ item, index }: { item: Business; index: number }) => (
    <BusinessItem
      item={item}
      index={index}
      onPress={handleBusinessPress}
      formatDate={formatDate}
    />
  ), [handleBusinessPress, formatDate]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🏢</Text>
      <Text style={styles.emptyTitle}>No businesses yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first business to start tracking cash flow
      </Text>
      <Pressable
        onPress={() => router.push('/(app)/create-business')}
        style={({ pressed }) => [
          styles.addBtn,
          pressed && styles.addBtnPressed,
        ]}
      >
        <LinearGradient
          colors={[AppColors.accentStart, AppColors.accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.addBtnGradient}
        >
          <Text style={styles.addBtnText}>+ Add First Business</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            pressed && styles.signOutBtnPressed,
          ]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Summary Card */}
      {/* <View style={styles.summaryCard}>
        <LinearGradient
          colors={[AppColors.accentStart, AppColors.accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryGradient}
        >
          <Text style={styles.summaryLabel}>Your Businesses</Text>
          <Text style={styles.summaryCount}>{businesses.length}</Text>
          <Text style={styles.summarySubtext}>
            {businesses.length === 0
              ? 'Get started by creating your first business'
              : businesses.length === 1
                ? 'business registered'
                : 'businesses registered'}
          </Text>
        </LinearGradient>
      </View> */}

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      ) : null}

      {/* Section Header */}
      {/* <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Businesses</Text>
        <Pressable
          onPress={() => router.push('/(app)/create-business')}
          style={({ pressed }) => [
            styles.addBtn,
            pressed && styles.addBtnPressed,
          ]}
        >
          <LinearGradient
            colors={[AppColors.accentStart, AppColors.accentEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtnGradient}
          >
            <Text style={styles.addBtnText}>+ Add New</Text>
          </LinearGradient>
        </Pressable>
      </View> */}
    </>
  );

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AppColors.accentSolid} />
            </View>
          ) : (
            <FlatList
              data={businesses}
              keyExtractor={(item) => item.id}
              renderItem={renderBusinessItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={AppColors.accentSolid}
                  colors={[AppColors.accentSolid]}
                />
              }
            />
          )}
        </Animated.View>
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
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? AppSpacing.xxl : AppSpacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
  },
  userName: {
    fontSize: AppFontSizes.xl,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginTop: AppSpacing.xs,
  },
  signOutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  signOutBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  signOutText: {
    color: AppColors.textSecondary,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  // Summary Card
  summaryCard: {
    borderRadius: AppBorderRadius.xl,
    overflow: 'hidden',
    marginBottom: AppSpacing.lg,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryGradient: {
    padding: AppSpacing.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: AppFontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: AppSpacing.xs,
  },
  summaryCount: {
    fontSize: AppFontSizes.hero,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summarySubtext: {
    fontSize: AppFontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: AppSpacing.xs,
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
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  sectionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  addBtn: {
    borderRadius: AppBorderRadius.full,
    marginTop: 10,
    overflow: 'hidden',
  },
  addBtnPressed: {
    opacity: 0.8,
  },
  addBtnGradient: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
  },
  // Business Card
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  businessCardPressed: {
    backgroundColor: AppColors.bgInputFocused,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  businessIconWrapper: {
    marginRight: AppSpacing.md,
    shadowColor: AppColors.glowAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  businessIconGradient: {
    width: 48,
    height: 48,
    borderRadius: AppBorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessIconText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  businessDate: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textMuted,
  },
  businessArrow: {
    fontSize: 24,
    color: AppColors.textMuted,
    marginLeft: AppSpacing.sm,
  },
  // Empty State
  emptyState: {
    backgroundColor: AppColors.bgCard,
    borderRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: AppColors.bgCardBorder,
    padding: AppSpacing.xl,
    alignItems: 'center',
    marginTop: AppSpacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: AppSpacing.md,
  },
  emptyTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  emptySubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
