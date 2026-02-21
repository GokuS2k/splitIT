import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getExpenses } from '@/utils/firestore';
import { COLORS, CURRENCY, USER_COLORS } from '@/constants/theme';

function formatDate(timestamp: any) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function splitLabel(splitType: string) {
  switch (splitType) {
    case 'equal':
      return 'Equal';
    case 'percentage':
      return '% Split';
    case 'exclude':
      return 'Custom';
    default:
      return splitType;
  }
}

function ExpenseCard({ item }: { item: any }) {
  const splitEntries = item.splits ? Object.entries(item.splits) : [];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.cardAmount}>
          {CURRENCY}{parseFloat(item.amount).toFixed(2)}
        </Text>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.badge, { backgroundColor: USER_COLORS[item.paidBy] + '22' }]}>
          <Text style={[styles.badgeText, { color: USER_COLORS[item.paidBy] }]}>
            Paid by {item.paidBy}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{splitLabel(item.splitType)}</Text>
        </View>
      </View>

      <View style={styles.splitsRow}>
        {splitEntries.map(([name, amount]) => (
          <View key={name} style={styles.splitChip}>
            <Text style={[styles.splitChipName, { color: USER_COLORS[name] }]}>
              {name[0]}
            </Text>
            <Text style={styles.splitChipAmount}>
              {CURRENCY}{parseFloat(amount as string).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExpenses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadExpenses(); }, [loadExpenses]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <Text style={styles.headerCount}>{expenses.length} total</Text>
      </View>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadExpenses(true)}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Add one from the Home tab</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  headerCount: { fontSize: 14, color: COLORS.textSecondary },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  cardDate: { fontSize: 12, color: COLORS.textSecondary },
  cardAmount: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  cardMeta: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  splitsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  splitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  splitChipName: { fontSize: 13, fontWeight: '700' },
  splitChipAmount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary },
});
