import { ThemedView } from '@/components/themed-view';
import { authService } from '@/hooks/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();

  const [notificationSettings, setNotificationSettings] = useState({
    whatsapp: true,
    sms: false,
    riskAlert: true,
    weatherAlert: true,
    ndviAlert: true,
    dailyReport: false,
    weeklyReport: true,
  });

  const [selectedTab, setSelectedTab] = useState('Notifikasi');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const tabs = ['Profil', 'Notifikasi', 'Statistik', 'Pencapaian'];

  const handleLogout = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await authService.signOut();
      router.replace('/auth/login');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      Alert.alert('Gagal Keluar', error?.message || 'Terjadi kesalahan saat keluar dari akun.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} />
          <View style={styles.editButton}>
            <Text style={styles.editIcon}>✏️</Text>
          </View>
        </View>
        <Text style={styles.profileName}>Agus Santoso</Text>
        <Text style={styles.profileLocation}>Sleman, Yogyakarta</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Nama Lengkap</Text>
          <Text style={styles.infoValue}>Agus Santoso</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>santogus@gmail.com</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Nomor Telepon</Text>
          <Text style={styles.infoValue}>+62 812-3456-7890</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Lokasi</Text>
          <Text style={styles.infoValue}>Sleman, Yogyakarta</Text>
        </View>
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Bantuan & Dukungan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Kebijakan Privasi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton, isSigningOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isSigningOut}
        >
          <Text style={[styles.actionButtonText, styles.logoutText]}>
            {isSigningOut ? 'Keluar…' : 'Keluar dari Akun'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotificationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Metode Notifikasi</Text>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>💬</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>WhatsApp</Text>
            <Text style={styles.notificationDescription}>Terima notifikasi via WhatsApp</Text>
          </View>
          <Switch
            value={notificationSettings.whatsapp}
            onValueChange={() => toggleNotification('whatsapp')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.whatsapp ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>SMS</Text>
            <Text style={styles.notificationDescription}>Terima notifikasi via SMS</Text>
          </View>
          <Switch
            value={notificationSettings.sms}
            onValueChange={() => toggleNotification('sms')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.sms ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Metode Notifikasi</Text>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>⚠️</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Peringatan Risiko</Text>
            <Text style={styles.notificationDescription}>Alert saat risiko tinggi terdeteksi</Text>
          </View>
          <Switch
            value={notificationSettings.riskAlert}
            onValueChange={() => toggleNotification('riskAlert')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.riskAlert ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>🌤️</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Peringatan Cuaca</Text>
            <Text style={styles.notificationDescription}>Alert cuaca ekstrem dan rekomendasi</Text>
          </View>
          <Switch
            value={notificationSettings.weatherAlert}
            onValueChange={() => toggleNotification('weatherAlert')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.weatherAlert ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>🌱</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Peringatan NDVI</Text>
            <Text style={styles.notificationDescription}>Alert perubahan kesehatan tanaman</Text>
          </View>
          <Switch
            value={notificationSettings.ndviAlert}
            onValueChange={() => toggleNotification('ndviAlert')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.ndviAlert ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Laporan Berkala</Text>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>📊</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Laporan Harian</Text>
            <Text style={styles.notificationDescription}>Ringkasan kondisi lahan setiap hari</Text>
          </View>
          <Switch
            value={notificationSettings.dailyReport}
            onValueChange={() => toggleNotification('dailyReport')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.dailyReport ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>📈</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Laporan Mingguan</Text>
            <Text style={styles.notificationDescription}>Analisis tren dan rekomendasi mingguan</Text>
          </View>
          <Switch
            value={notificationSettings.weeklyReport}
            onValueChange={() => toggleNotification('weeklyReport')}
            trackColor={{ false: '#767577', true: '#C8E6C9' }}
            thumbColor={notificationSettings.weeklyReport ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  const renderStatistikTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>614 hari</Text>
            <Text style={styles.statLabel}>Hari Bergabung</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>6 lahan</Text>
            <Text style={styles.statLabel}>Total Lahan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>60 hektar</Text>
            <Text style={styles.statLabel}>Luas Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0.755</Text>
            <Text style={styles.statLabel}>Rata-rata NDVI</Text>
          </View>
        </View>

        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Analisis Penggunaan</Text>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Pemantauan NDVI</Text>
            <Text style={styles.analysisValue}>47 kali</Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Cek Prakiraan Cuaca</Text>
            <Text style={styles.analysisValue}>23 kali</Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Alert Diterima</Text>
            <Text style={styles.analysisValue}>12 kali</Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Edukasi Dibaca</Text>
            <Text style={styles.analysisValue}>8 artikel</Text>
          </View>
        </View>

        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Metrik Produktivitas</Text>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Kesehatan Lahan</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '70%' }]} />
            </View>
            <Text style={styles.metricValue}>70%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Efisiensi Monitoring</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '85%' }]} />
            </View>
            <Text style={styles.metricValue}>85%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Response Time Alert</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '90%' }]} />
            </View>
            <Text style={styles.metricValue}>90%</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPencapaianTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.achievementSection}>
        <Text style={styles.sectionTitle}>Pencapaian Saya</Text>
        
        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>🏅</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Petani Digital</Text>
            <Text style={styles.achievementDescription}>Mendaftar di Matani</Text>
          </View>
          <View style={styles.achievementBadge}>
            <Text style={styles.badgeText}>❤️</Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>📍</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Pemetaan Ahli</Text>
            <Text style={styles.achievementDescription}>Membuat 5+ peta lahan</Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>🌤️</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Cuaca Master</Text>
            <Text style={styles.achievementDescription}>Gunakan prakiraan cuaca 50+ kali</Text>
          </View>
        </View>

        <View style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetTitle}>Target Berikutnya</Text>
            <Text style={styles.targetDescription}>Buat 5 lahan untuk mendapatkan badge &quot;Pemetaan Ahli&quot;</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '20%' }]} />
            </View>
            <Text style={styles.progressText}>1/5 lahan dibuat</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Profil':
        return renderProfileTab();
      case 'Notifikasi':
        return renderNotificationTab();
      case 'Statistik':
        return renderStatistikTab();
      case 'Pencapaian':
        return renderPencapaianTab();
      default:
        return renderNotificationTab();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Pengguna</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              selectedTab === tab && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 25,
    margin: 20,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#C8E6C9',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: '#ddd',
    borderRadius: 40,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#C8E6C9',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: '#C62828',
  },
  notificationSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  analysisSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  analysisLabel: {
    fontSize: 16,
    color: '#333',
  },
  analysisValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  metricsSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  metricItem: {
    marginBottom: 20,
  },
  metricLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  achievementSection: {
    marginBottom: 20,
  },
  achievementCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#C8E6C9',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
  },
  achievementBadge: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 20,
  },
  targetCard: {
    backgroundColor: '#C8E6C9',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  targetHeader: {
    marginBottom: 15,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  targetDescription: {
    fontSize: 14,
    color: '#2E7D32',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 5,
  },
});