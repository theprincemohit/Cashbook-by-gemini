import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '@/constants/theme';

type Lang = 'en' | 'hi';

const content = {
  en: {
    title: 'How to Use',
    subtitle: 'Get started with CashDiary in a few simple steps',
    tip: 'Pull down on any list to refresh the latest data from the server.',
    steps: [
      {
        icon: 'business' as const,
        iconLib: 'ionicons' as const,
        color: '#6366F1',
        title: 'Create a Business',
        desc: 'Start by adding your business. Tap the business selector at the top and press "Add New Business".',
      },
      {
        icon: 'book',
        iconLib: 'feather' as const,
        color: '#10B981',
        title: 'Add a Passbook',
        desc: 'Each business can have multiple passbooks. Tap "+ Add New Passbook" to create one for a client, vendor, or project.',
      },
      {
        icon: 'file-text',
        iconLib: 'feather' as const,
        color: '#F59E0B',
        title: 'Record Transactions',
        desc: 'Open a passbook and tap the "+" button to record a cash-in or cash-out transaction with a note and date.',
      },
      {
        icon: 'trending-up',
        iconLib: 'feather' as const,
        color: '#EC4899',
        title: 'Track Balances',
        desc: 'Every passbook shows the running net balance automatically. Green means you are owed money, red means you owe.',
      },
      {
        icon: 'bar-chart-2',
        iconLib: 'feather' as const,
        color: '#3B82F6',
        title: 'Generate Reports',
        desc: 'Go to a passbook and tap "Generate Report" to export a summary of all transactions as a shareable PDF.',
      },
      {
        icon: 'settings',
        iconLib: 'feather' as const,
        color: '#94A3B8',
        title: 'Manage Settings',
        desc: 'Use the Settings tab to update your profile, manage your subscription, or switch between businesses.',
      },
    ],
  },
  hi: {
    title: 'उपयोग कैसे करें',
    subtitle: 'कुछ आसान चरणों में CashDiary शुरू करें',
    tip: 'सर्वर से नवीनतम डेटा अपडेट करने के लिए किसी भी सूची को नीचे खींचें।',
    steps: [
      {
        icon: 'business' as const,
        iconLib: 'ionicons' as const,
        color: '#6366F1',
        title: 'व्यवसाय बनाएं',
        desc: 'सबसे पहले अपना व्यवसाय जोड़ें। ऊपर दिए बिज़नेस सेलेक्टर पर टैप करें और "Add New Business" दबाएं।',
      },
      {
        icon: 'book',
        iconLib: 'feather' as const,
        color: '#10B981',
        title: 'पासबुक जोड़ें',
        desc: 'हर व्यवसाय में कई पासबुक हो सकती हैं। किसी ग्राहक, विक्रेता या प्रोजेक्ट के लिए "+ Add New Passbook" पर टैप करें।',
      },
      {
        icon: 'file-text',
        iconLib: 'feather' as const,
        color: '#F59E0B',
        title: 'लेनदेन दर्ज करें',
        desc: 'पासबुक खोलें और "+" बटन दबाकर नकद जमा या निकासी का लेनदेन नोट और तारीख के साथ दर्ज करें।',
      },
      {
        icon: 'trending-up',
        iconLib: 'feather' as const,
        color: '#EC4899',
        title: 'बैलेंस ट्रैक करें',
        desc: 'हर पासबुक में नेट बैलेंस अपने आप दिखता है। हरा रंग मतलब आपको पैसे मिलने हैं, लाल मतलब आपको देने हैं।',
      },
      {
        icon: 'bar-chart-2',
        iconLib: 'feather' as const,
        color: '#3B82F6',
        title: 'रिपोर्ट बनाएं',
        desc: 'पासबुक खोलें और "Generate Report" पर टैप करें — सभी लेनदेन की PDF रिपोर्ट शेयर करें।',
      },
      {
        icon: 'settings',
        iconLib: 'feather' as const,
        color: '#94A3B8',
        title: 'सेटिंग्स प्रबंधित करें',
        desc: 'Settings टैब का उपयोग करके अपनी प्रोफ़ाइल अपडेट करें, सब्सक्रिप्शन देखें या व्यवसाय बदलें।',
      },
    ],
  },
};

export default function HowToUseScreen() {
  const [lang, setLang] = useState<Lang>('en');
  const t = content[lang];

  return (
    <LinearGradient
      colors={[AppColors.bgPrimary, AppColors.bgSecondary, '#0F1729']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>{t.title}</Text>
              <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
            </View>
          </View>

          {/* EN / HI toggle */}
          <Pressable
            onPress={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
            style={styles.langToggle}
          >
            <Text style={[styles.langOption, lang === 'en' && styles.langOptionActive]}>EN</Text>
            <View style={styles.langDivider} />
            <Text style={[styles.langOption, lang === 'hi' && styles.langOptionActive]}>हि</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {t.steps.map((step, idx) => (
            <View key={idx} style={styles.card}>
              {/* Icon + connector */}
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: step.color + '22' }]}>
                  {step.iconLib === 'ionicons' ? (
                    <Ionicons name={step.icon as any} size={22} color={step.color} />
                  ) : (
                    <Feather name={step.icon as any} size={22} color={step.color} />
                  )}
                </View>
                {idx < t.steps.length - 1 && <View style={styles.connector} />}
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>
                    {lang === 'en' ? `Step ${idx + 1}` : `चरण ${idx + 1}`}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{step.title}</Text>
                <Text style={styles.cardDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          {/* Footer tip */}
          <View style={styles.tip}>
            <Feather name="info" size={14} color={AppColors.accentSolid} />
            <Text style={styles.tipText}>{t.tip}</Text>
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: Platform.OS === 'android' ? AppSpacing.xxl : AppSpacing.md,
    paddingBottom: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: AppSpacing.md,
  },
  backBtn: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: AppFontSizes.xs + 1,
    marginTop: 2,
  },
  // Language toggle pill
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: AppBorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  langOption: {
    color: '#6B7280',
    fontSize: AppFontSizes.xs + 1,
    fontWeight: '600',
  },
  langOptionActive: {
    color: AppColors.accentSolid,
  },
  langDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  listContent: {
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.lg,
    paddingBottom: 120,
  },
  card: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  cardLeft: {
    alignItems: 'center',
    marginRight: AppSpacing.md,
    width: 44,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 4,
    marginBottom: 4,
  },
  cardContent: {
    flex: 1,
    paddingBottom: AppSpacing.lg,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: AppBorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  stepBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: AppFontSizes.sm + 1,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: AppFontSizes.xs + 1,
    lineHeight: 19,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    padding: AppSpacing.md,
    marginTop: AppSpacing.sm,
  },
  tipText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: AppFontSizes.xs + 1,
    lineHeight: 18,
  },
});
