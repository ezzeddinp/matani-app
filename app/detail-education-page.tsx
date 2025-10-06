import { ThemedView } from '@/components/themed-view';
import { EDUCATION_ARTICLES, EducationArticle } from '@/constants/education';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const priorityBadgeStyles: Record<EducationArticle['priority'], { background: string; text: string }> = {
  Kritis: { background: '#FDECEA', text: '#B71C1C' },
  Tinggi: { background: '#FFF4E5', text: '#E65100' },
  Sedang: { background: '#E3F2FD', text: '#1E88E5' },
};

const sectionIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  overview: 'reader-outline',
  warning: 'alert-circle-outline',
  actions: 'construct-outline',
  monitoring: 'analytics-outline',
  recommendation: 'leaf-outline',
};

export default function DetailEducationPage() {
  const router = useRouter();
  const { educationId } = useLocalSearchParams<{ educationId?: string }>();

  const article = useMemo(() => {
    if (typeof educationId !== 'string') {
      return null;
    }
    return EDUCATION_ARTICLES.find((item) => item.id === educationId) ?? null;
  }, [educationId]);

  const priorityStyle = article
    ? priorityBadgeStyles[article.priority]
    : { background: '#E0F2F1', text: '#0F766E' };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {article ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroEmoji}>{article.icon}</Text>
              </View>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroCategoryPill}>
                  <Ionicons name="bookmark-outline" size={14} color="#047857" />
                  <Text style={styles.heroCategoryText}>{article.category}</Text>
                </View>
                <View style={[styles.heroPriorityBadge, { backgroundColor: priorityStyle.background }]}>
                  <Text style={[styles.heroPriorityText, { color: priorityStyle.text }]}>
                    {article.priority}
                  </Text>
                </View>
                <View style={styles.heroDurationChip}>
                  <Ionicons name="time-outline" size={14} color="#1B4332" />
                  <Text style={styles.heroDurationText}>{article.duration}</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{article.title}</Text>
              <Text style={styles.heroSummary}>{article.summary}</Text>
            </View>

            <ContentSection
              icon={sectionIcons.overview}
              title="Ringkasan Situasi"
              description={article.detail.overview}
            />

            <BulletSection
              icon={sectionIcons.warning}
              title="Gejala & Peringatan Dini"
              items={article.detail.warningSigns}
            />

            <ActionSection steps={article.detail.actionSteps} />

            <BulletSection
              icon={sectionIcons.monitoring}
              title="Monitoring & Evaluasi"
              items={article.detail.monitoring}
            />

            <BulletSection
              icon={sectionIcons.recommendation}
              title="Rekomendasi Lanjutan"
              items={article.detail.recommendations}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Konten tidak ditemukan</Text>
            <Text style={styles.emptySubtitle}>
              Pastikan Anda membuka tautan edukasi dari daftar utama.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleGoBack} activeOpacity={0.8}>
              <Text style={styles.emptyButtonText}>Kembali ke edukasi</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

interface ContentSectionProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ContentSection = ({ title, description, icon }: ContentSectionProps) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrapper}>
        <Ionicons name={icon} size={18} color="#1B4332" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Text style={styles.sectionDescription}>{description}</Text>
  </View>
);

interface BulletSectionProps {
  title: string;
  items: string[];
  icon: keyof typeof Ionicons.glyphMap;
}

const BulletSection = ({ title, items, icon }: BulletSectionProps) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrapper}>
        <Ionicons name={icon} size={18} color="#1B4332" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View>
      {items.map((item, index) => (
        <View
          key={item}
          style={[styles.bulletItem, index === items.length - 1 && styles.bulletItemLast]}
        >
          <Ionicons name="ellipse" size={8} color="#047857" style={styles.bulletIcon} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

interface ActionSectionProps {
  steps: EducationArticle['detail']['actionSteps'];
}

const ActionSection = ({ steps }: ActionSectionProps) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrapper}>
        <Ionicons name={sectionIcons.actions} size={18} color="#1B4332" />
      </View>
      <Text style={styles.sectionTitle}>Langkah Tindakan</Text>
    </View>
    <View>
      {steps.map((step, index) => (
        <View
          key={step.title}
          style={[styles.stepCard, index === steps.length - 1 && styles.stepCardLast]}
        >
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#E8F0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroEmoji: {
    fontSize: 30,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  heroCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 10,
    marginBottom: 8,
  },
  heroCategoryText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    textTransform: 'uppercase',
  },
  heroPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 10,
    marginBottom: 8,
  },
  heroPriorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroDurationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 10,
    marginBottom: 8,
  },
  heroDurationText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#1B4332',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 10,
  },
  heroSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#E7F5EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B4332',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletItemLast: {
    marginBottom: 0,
  },
  bulletIcon: {
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  stepCardLast: {
    marginBottom: 0,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F766E',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#047857',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
