import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, getSettlements } from '../utils/firestore';
import { calculateNetBalances } from '../utils/balanceCalculator';
import { COLORS, CURRENCY, USER_COLORS, USERS } from '../constants/theme';

function DebtCard({ from, to, amount }) {
  return (
    <View style={styles.debtCard}>
      <View style={styles.debtSide}>
        <View style={[styles.avatar, { backgroundColor: USER_COLORS[from] + '22' }]}>
          <Text style={[styles.avatarText, { color: USER_COLORS[from] }]}>{from[0]}</Text>
        </View>
        <Text style={styles.debtName}>{from}</Text>
      </View>

      <View style={styles.debtCenter}>
        <Text style={styles.owesLabel}>owes</Text>
        <Text style={styles.debtAmount}>
          {CURRENCY}{amount.toFixed(2)}
        </Text>
        <Text style={styles.arrow}>→</Text>
      </View>

      <View style={[styles.debtSide, styles.debtSideRight]}>
        <View style={[styles.avatar, { backgroundColor: USER_COLORS[to] + '22' }]}>
          <Text style={[styles.avatarText, { color: USER_COLORS[to] }]}>{to[0]}</Text>
        </View>
        <Text style={styles.debtName}>{to}</Text>
      </View>
    </View>
  );
}

function UserNetRow({ user, balances }) {
  const totalOwedToUser = balances
    .filter((b) => b.to === user)
    .reduce((s, b) => s + b.amount, 0);
  const totalUserOwes = balances
    .filter((b) => b.from === user)
    .reduce((s, b) => s + b.amount, 0);
  const net = totalOwedToUser - totalUserOwes;

  return (
    <View style={styles.userNetRow}>
      <View style={[styles.avatar, { backgroundColor: USER_COLORS[user] + '22' }]}>
        <Text style={[styles.avatarText, { color: USER_COLORS[user] }]}>{user[0]}</Text>
      </View>
      <Text style={styles.userNetName}>{user}</Text>
      <Text
        style={[
          styles.userNetAmount,
          { color: net >= 0 ? COLORS.success : COLORS.danger },
        ]}
      >
        {net >= 0 ? '+' : ''}{CURRENCY}{Math.abs(net).toFixed(2)}
      </Text>
    </View>
  );
}

export default function BalancesScreen() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [expenses, settlements] = await Promise.all([
        getExpenses(),
        getSettlements(),
      ]);
      setBalances(calculateNetBalances(expenses, settlements));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <Text style={styles.title}>Balances</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Per-user net summary */}
            <Text style={styles.sectionLabel}>Net position</Text>
            <View style={styles.section}>
              {USERS.map((u) => (
                <UserNetRow key={u} user={u} balances={balances} />
              ))}
            </View>

            {/* Who owes whom */}
            <Text style={styles.sectionLabel}>Who owes whom</Text>
            {balances.length === 0 ? (
              <View style={styles.settled}>
                <Text style={styles.settledIcon}>✅</Text>
                <Text style={styles.settledText}>All settled up!</Text>
                <Text style={styles.settledSub}>No outstanding balances</Text>
              </View>
            ) : (
              balances.map((b, i) => (
                <DebtCard key={i} from={b.from} to={b.to} amount={b.amount} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userNetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  userNetName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  userNetAmount: { fontSize: 17, fontWeight: '700' },
  debtCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  debtSide: {
    alignItems: 'center',
    flex: 1,
  },
  debtSideRight: {
    alignItems: 'center',
  },
  debtName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
  },
  debtCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  owesLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.danger,
    marginVertical: 2,
  },
  arrow: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  settled: { alignItems: 'center', paddingVertical: 48 },
  settledIcon: { fontSize: 48, marginBottom: 12 },
  settledText: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  settledSub: { fontSize: 14, color: COLORS.textSecondary },
});
