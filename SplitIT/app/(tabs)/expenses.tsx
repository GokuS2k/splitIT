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
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

function splitLabel(splitType: string) {
  switch (splitType) {
    case 'equal': return 'EQL';
    case 'percentage': return 'PCT';
    case 'exclude': return 'CST';
    default: return splitType.toUpperCase();
  }
}

function ExpenseCard({ item }: { item: any }) {
  const splitEntries = item.splits ? Object.entries(item.splits) : [];
  const paidColor = USER_COLORS[item.paidBy] ?? COLORS.primary;

  return (
    <View style={[styles.card, { borderLeftColor: paidColor }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.title.toUpperCase()}</Text>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.cardAmount}>
          {CURRENCY}{parseFloat(item.amount).toFixed(2)}
        </Text>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.badge, { borderColor: paidColor }]}>
          <Text style={[styles.badgeText, { color: paidColor }]}>
            {item.paidBy.toUpperCase()}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{splitLabel(item.splitType)}</Text>
        </View>
      </View>

      <View style={styles.splitsRow}>
        {splitEntries.map(([name, amount]) => (
          <View key={name} style={[styles.splitChip, { borderColor: USER_COLORS[name] + '55' }]}>
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
        <View>
          <Text style={styles.headerTitle}>EXPENSES</Text>
          <Text style={styles.headerSub}>// TRANSACTION LOG</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{expenses.length}</Text>
        </View>
      </View>
      <View style={styles.headerDivider} />

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
            <Text style={styles.emptyIcon}>◈</Text>
            <Text style={styles.emptyText}>NO RECORDS FOUND</Text>
            <Text style={styles.emptySubtext}>Log an expense from the Home tab</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: '600',
  },
  countBadge: {
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  countText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  cardDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    fontWeight: '600',
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  cardMeta: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  splitsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  splitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  splitChipName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  splitChipAmount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    fontSize: 40,
    color: COLORS.primary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 4,
    marginBottom: 6,
  },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary },
});
