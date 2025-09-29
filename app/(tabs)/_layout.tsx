import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8BC34A',
        tabBarInactiveTintColor: '#9E9E9E',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 75,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Ladang',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "leaf" : "leaf-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Edukasi',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "school" : "school-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Cuaca',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "partly-sunny" : "partly-sunny-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
