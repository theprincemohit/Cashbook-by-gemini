import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppColors } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';

interface BottomTabBarProps {
  activeTab: 'home' | 'settings';
}

export default function BottomTabBar({ activeTab }: BottomTabBarProps) {
  const { activeBusiness } = useBusiness();
  const selectedBusinessId = activeBusiness?.id || '';
  const businessName = activeBusiness?.name || 'Business';

  return (
    <View style={styles.bottomTabBar}>
      <Pressable
        style={styles.bottomTabItem}
        onPress={() => {
          if (activeTab !== 'home') router.push('/(app)/business-detail');
        }}
      >
        <View style={[styles.tabContent, activeTab === 'home' && styles.activeTabBg]}>
          <Feather name="book" size={22} color={activeTab === 'home' ? AppColors.accentSolid : '#94A3B8'} />
          <Text style={[styles.bottomTabLabel, activeTab === 'home' && { color: AppColors.accentSolid }]}>CashDiary</Text>
        </View>
      </Pressable>

      <Pressable
        style={styles.bottomTabItem}
        onPress={() => {
          if (activeTab !== 'settings') {
            router.push({ pathname: '/(app)/settings', params: { id: selectedBusinessId, name: businessName } });
          }
        }}
      >
        <View style={[styles.tabContent, activeTab === 'settings' && styles.activeTabBg]}>
          <Feather name="settings" size={22} color={activeTab === 'settings' ? AppColors.accentSolid : '#94A3B8'} />
          <Text style={[styles.bottomTabLabel, activeTab === 'settings' && { color: AppColors.accentSolid }]}>Settings</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    zIndex: 1000,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  activeTabBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  bottomTabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
