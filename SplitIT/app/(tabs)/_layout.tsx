import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { COLORS } from '@/constants/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⬡',
    Expenses: '◈',
    Balances: '◎',
    Settle: '◉',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: focused ? 22 : 18,
          color: focused ? COLORS.primary : COLORS.textMuted,
          // glow effect via text shadow not supported natively, but color is enough
        }}
      >
        {icons[label]}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.primary,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => <TabIcon label="Expenses" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="balances"
        options={{
          title: 'Balances',
          tabBarIcon: ({ focused }) => <TabIcon label="Balances" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settle"
        options={{
          title: 'Settle',
          tabBarIcon: ({ focused }) => <TabIcon label="Settle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}
