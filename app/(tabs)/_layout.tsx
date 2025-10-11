import { Feather } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { supabase } from "@/hooks/supabase";

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (isMounted && !data?.session) {
          router.replace("/auth/login");
        }
      } catch (error) {
        console.warn("Gagal memverifikasi sesi:", error);
        if (isMounted) {
          router.replace("/auth/login");
        }
      }
    };

    verifySession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/auth/login");
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [router]);

  const renderIcon = (
    focused: boolean,
    name: React.ComponentProps<typeof Feather>["name"]
  ) => (
    <View style={styles.iconBase}>
      <Feather name={name} size={24} color={focused ? "#2E7D32" : "#1F1F1F"} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2E7D32",
        tabBarInactiveTintColor: "#1F1F1F",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.icon,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ focused }) => renderIcon(focused, "home"),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Ladang",
          tabBarIcon: ({ focused }) => renderIcon(focused, "feather"),
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: "Edukasi",
          tabBarIcon: ({ focused }) => renderIcon(focused, "book-open"),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: "Cuaca",
          tabBarIcon: ({ focused }) => renderIcon(focused, "sun"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ focused }) => renderIcon(focused, "user"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6E6E6",
    paddingTop: 14,
    paddingBottom: 28,
    height: 100,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  icon: {
    marginBottom: 2,
    marginTop: -5,
  },
  item: {
    paddingVertical: 4,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBase: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 2,
  },
});
