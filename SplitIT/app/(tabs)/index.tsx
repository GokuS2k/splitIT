import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getExpenses, getSettlements } from '@/utils/firestore';
import { calculateNetBalances, getUserSummary } from '@/utils/balanceCalculator';
import { useAuth } from '@/context/AuthContext';
import { COLORS, CURRENCY, USER_COLORS } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    owedToMe: { from: string; amount: number }[];
    iOwe: { to: string; amount: number }[];
  }>({ owedToMe: [], iOwe: [] });
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [totalIOwe, setTotalIOwe] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expenses, settlements] = await Promise.all([
        getExpenses(),
        getSettlements(),
      ]);
      const balances = calculateNetBalances(expenses as any, settlements as any);
      if (user) {
        const s = getUserSummary(user, balances);
        setSummary(s);
        setTotalOwedToMe(s.owedToMe.reduce((acc, b) => acc + b.amount, 0));
        setTotalIOwe(s.iOwe.reduce((acc, b) => acc + b.amount, 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const netBalance = totalOwedToMe - totalIOwe;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>
              ▸ {user?.toUpperCase()}
            </Text>
            <Text style={styles.subGreeting}>// BALANCE OVERVIEW</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>[ EXIT ]</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Net Balance Card */}
        <View
          style={[
            styles.netCard,
            {
              borderColor:
                netBalance > 0
                  ? COLORS.success + '88'
                  : netBalance < 0
                    ? COLORS.danger + '88'
                    : COLORS.borderBright,
            },
          ]}
        >
          <Text style={styles.netLabel}>
            {netBalance > 0
              ? '◈ NET CREDIT'
              : netBalance < 0
                ? '◈ NET DEBIT'
                : '◉ BALANCED'}
          </Text>
          <Text
            style={[
              styles.netAmount,
              {
                color:
                  netBalance > 0
                    ? COLORS.success
                    : netBalance < 0
                      ? COLORS.danger
                      : COLORS.textSecondary,
              },
            ]}
          >
            {netBalance === 0
              ? 'ALL CLEAR'
              : `${netBalance > 0 ? '+' : ''}${CURRENCY}${Math.abs(netBalance).toFixed(2)}`}
          </Text>
          {netBalance === 0 && (
            <Text style={styles.netSub}>No outstanding balances</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {summary.owedToMe.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>▸ OWED TO YOU</Text>
                {summary.owedToMe.map(({ from, amount }) => (
                  <View key={from} style={styles.balanceRow}>
                    <View style={[styles.avatarSmall, { borderColor: USER_COLORS[from] }]}>
                      <Text style={[styles.avatarLetter, { color: USER_COLORS[from] }]}>
                        {from[0]}
                      </Text>
                    </View>
                    <Text style={styles.balanceName}>{from}</Text>
                    <Text style={[styles.balanceAmount, { color: COLORS.success }]}>
                      +{CURRENCY}{amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {summary.iOwe.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>▸ YOU OWE</Text>
                {summary.iOwe.map(({ to, amount }) => (
                  <View key={to} style={styles.balanceRow}>
                    <View style={[styles.avatarSmall, { borderColor: USER_COLORS[to] }]}>
                      <Text style={[styles.avatarLetter, { color: USER_COLORS[to] }]}>
                        {to[0]}
                      </Text>
                    </View>
                    <Text style={styles.balanceName}>{to}</Text>
                    <Text style={[styles.balanceAmount, { color: COLORS.danger }]}>
                      -{CURRENCY}{amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {summary.owedToMe.length === 0 &&
              summary.iOwe.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>◉</Text>
                  <Text style={styles.emptyText}>SYSTEM BALANCED</Text>
                  <Text style={styles.emptySubtext}>No pending transactions</Text>
                </View>
              )}
          </>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-expense')}
        >
          <Text style={styles.addButtonText}>⊕  LOG EXPENSE</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 3,
  },
  subGreeting: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    borderRadius: 2,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  netCard: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  netLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 3,
    fontWeight: '700',
  },
  netAmount: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 2,
  },
  netSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 2,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: { fontSize: 14, fontWeight: '800' },
  balanceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  balanceAmount: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
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
  addButton: {
    backgroundColor: 'transparent',
    borderRadius: 4,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 4,
  },
});
