import { ThemedView } from '@/components/themed-view';
import { EDUCATION_ARTICLES, EducationArticle } from '@/constants/education';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type PriorityStyle = {
  badge: { [key: string]: string | number };
  text: { [key: string]: string | number };
};

const priorityStyles: Record<EducationArticle['priority'], PriorityStyle> = {
  Kritis: {
    badge: { backgroundColor: '#FDECEA' },
    text: { color: '#B71C1C' },
  },
  Tinggi: {
    badge: { backgroundColor: '#FFF4E5' },
    text: { color: '#E65100' },
  },
  Sedang: {
    badge: { backgroundColor: '#E3F2FD' },
    text: { color: '#1E88E5' },
  },
};

const categoryCardColors: Record<string, string> = {
  Cuaca: '#E3F2FD',
  Hama: '#FCE7F3',
  Penyakit: '#F3E5F5',
  Irigasi: '#E0F2F1',
};

export default function EducationScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(EDUCATION_ARTICLES.map((item) => item.category))).sort(
      (a, b) => a.localeCompare(b)
    );
    return ['Semua', ...unique];
  }, []);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const scoreArticle = (article: EducationArticle) => {
      if (!normalizedQuery) return 0;
      const title = article.title.toLowerCase();
      const summary = article.summary.toLowerCase();
      const keywordMatches = article.keywords.filter((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery)
      ).length;

      if (title.startsWith(normalizedQuery)) return -2 - keywordMatches;
      if (title.includes(normalizedQuery)) return -1 - keywordMatches;
      if (summary.includes(normalizedQuery)) return 0 - keywordMatches;
      return 1 - keywordMatches;
    };

    return EDUCATION_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === 'Semua' || article.category === selectedCategory;

      if (!normalizedQuery) {
        return matchesCategory;
      }

      const haystack = [
        article.title,
        article.summary,
        article.category,
        ...article.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return matchesCategory && haystack.includes(normalizedQuery);
    }).sort((a, b) => scoreArticle(a) - scoreArticle(b));
  }, [selectedCategory, searchQuery]);

  const handleSelectCategory = (category: string) => {
    setSelectedCategory((current) => (current === category ? 'Semua' : category));
  };

  const handleOpenDetail = (articleId: string) => {
    router.push({ pathname: '/detail-education-page', params: { educationId: articleId } });
  };

  const renderPriorityStyles = (priority: EducationArticle['priority']): PriorityStyle => {
    return priorityStyles[priority] ?? { badge: {}, text: {} };
  };

  const resolveIconBackground = (category: string) => {
    return categoryCardColors[category] ?? '#E8EAF6';
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { marginRight: 8 }]}>Pusat Edukasi Pertanian</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerSubtitle}>
            Temukan panduan singkat untuk menghadapi risiko lapang dan meningkatkan praktik budidaya.
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari topik, hama, atau tindakan..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, isActive && styles.activeCategoryButton]}
                onPress={() => handleSelectCategory(category)}
                activeOpacity={0.85}
              >
                <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Education Items */}
      <ScrollView
        style={styles.educationList}
        contentContainerStyle={styles.educationListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredArticles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={32} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>Tidak ada hasil</Text>
            <Text style={styles.emptyStateDescription}>
              Coba ubah kata kunci pencarian atau pilih kategori lain.
            </Text>
          </View>
        ) : (
          filteredArticles.map((item) => {
            const priorityStyle = renderPriorityStyles(item.priority);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.educationCard}
                activeOpacity={0.88}
                onPress={() => handleOpenDetail(item.id)}
              >
                <View style={styles.cardRow}>
                  <View
                    style={[styles.iconContainer, { backgroundColor: resolveIconBackground(item.category) }]}
                  >
                    <Text style={styles.emojiIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{item.category}</Text>
                      </View>
                      <View style={styles.durationChip}>
                        <Ionicons name="time-outline" size={14} color="#256029" />
                        <Text style={styles.durationChipText}>{item.duration}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDescription}>{item.summary}</Text>
                    <View style={[styles.priorityBadge, priorityStyle.badge]}>
                      <Text style={[styles.priorityText, priorityStyle.text]}>{item.priority}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => handleOpenDetail(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-forward" size={20} color="#2E7D32" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000ff',
    lineHeight: 32,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  categoriesWrapper: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  categoryButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeCategoryButton: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeCategoryText: {
    color: '#047857',
    fontWeight: '600',
  },
  educationList: {
    flex: 1,
  },
  educationListContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  educationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiIcon: {
    fontSize: 26,
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    textTransform: 'uppercase',
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationChipText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#256029',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 14,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  arrowButton: {
    width: 34,
    height: 34,
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateDescription: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});