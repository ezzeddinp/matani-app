import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EducationItem {
  id: string;
  title: string;
  description: string;
  priority: 'Kritis' | 'Tinggi' | 'Tinggi';
  duration: string;
  iconColor: string;
}

export default function EducationScreen() {
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const categories = ['Semua', 'Cuaca', 'Hama', 'Penyakit'];

  const educationItems: EducationItem[] = [
    {
      id: '1',
      title: 'Mengatasi Risiko Banjir di Lahan Pertanian',
      description: 'Panduan lengkap untuk melindungi tanaman dari banjir dan genangan air',
      priority: 'Kritis',
      duration: '5m',
      iconColor: '😰'
    },
    {
      id: '2',
      title: 'Pengendalian Hama Wereng Coklat',
      description: 'Cara efektif mengendalikan hama wereng coklat yang merusak tanaman',
      priority: 'Tinggi',
      duration: '7m',
      iconColor: '🐛'
    },
    {
      id: '3',
      title: 'Menangani Stress Panas pada Tanaman',
      description: 'Strategi melindungi tanaman dari suhu tinggi dan sinar matahari lebih',
      priority: 'Tinggi',
      duration: '4m',
      iconColor: '🌡️'
    },
    {
      id: '4',
      title: 'Pengelolaan Air untuk Efisiensi Irigasi',
      description: 'Teknik irigasi hemat air yang efektif untuk berbagai jenis tanaman',
      priority: 'Tinggi',
      duration: '6m',
      iconColor: '💧'
    }
  ];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Kritis':
        return styles.criticalPriority;
      case 'Tinggi':
        return styles.highPriority;
      default:
        return styles.highPriority;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Pusat Edukasi</Text>
          <Text style={styles.headerTitle}>Pertanian</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.activeCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.activeCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Education Items */}
      <ScrollView style={styles.educationList} showsVerticalScrollIndicator={false}>
        {educationItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.educationCard}>
            <View style={styles.cardRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.emojiIcon}>{item.iconColor}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <View style={styles.priorityBadge}>
                  <Text style={[styles.priorityText, getPriorityStyle(item.priority)]}>
                    {item.priority}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <TouchableOpacity style={styles.arrowButton}>
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
                <View style={styles.durationContainer}>
                  <Text style={styles.clockIcon}>⏱️</Text>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 28,
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: '#C8E6C9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 18,
    color: '#4CAF50',
  },
  categoriesWrapper: {
    height: 60,
    paddingVertical: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeCategoryButton: {
    backgroundColor: '#C8E6C9',
    borderColor: '#4CAF50',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  educationList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  educationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 45,
    height: 45,
    backgroundColor: '#333',
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  emojiIcon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    lineHeight: 22,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  criticalPriority: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  highPriority: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 80,
  },
  arrowButton: {
    width: 30,
    height: 30,
    backgroundColor: '#C8E6C9',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  clockIcon: {
    fontSize: 14,
    marginRight: 3,
  },
  durationText: {
    fontSize: 12,
    color: '#999',
  },
});