import { Feather, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  const renderIcon = (
    focused: boolean,
    activeName: keyof typeof Ionicons.glyphMap,
    inactiveName: keyof typeof Ionicons.glyphMap,
  ) => (
    <View style={[styles.iconBase, focused && styles.iconActive]}> 
      <Ionicons
        name={focused ? activeName : inactiveName}
        size={22}
        color={focused ? '#2E7D32' : '#1F1F1F'}
      />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#1F1F1F',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.iconStyle,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBase, focused && styles.iconActive]}>
              <Feather
                name="home"
                size={24}
                color={focused ? '#2E7D32' : '#1F1F1F'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Ladang',
          tabBarIcon: ({ focused }) => renderIcon(focused, 'leaf', 'leaf-outline'),
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Edukasi',
          tabBarIcon: ({ focused }) => renderIcon(focused, 'school', 'school-outline'),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Cuaca',
          tabBarIcon: ({ focused }) => renderIcon(focused, 'partly-sunny', 'partly-sunny-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => renderIcon(focused, 'person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
    paddingTop: 14,
    paddingBottom: 24,
    height: 100,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  iconStyle: {
    marginBottom: 2,
  },
  iconBase: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconActive: {
    backgroundColor: '#E4F5E4',
  },
});
