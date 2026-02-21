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
import { useFocusEffect } from 'expo-router';
import { getExpenses, getSettlements } from '@/utils/firestore';
import { calculateNetBalances, Balance } from '@/utils/balanceCalculator';
import { COLORS, CURRENCY, USER_COLORS, USERS } from '@/constants/theme';

// ─── Debt Transfer Card ────────────────────────────────────────────────────────

function DebtCard({ from, to, amount }: Balance) {
  return (
    <View style={styles.debtCard}>
      {/* Corner accent */}
      <View style={[styles.cornerAccent, { borderColor: COLORS.danger + 'AA' }]} />

      {/* FROM side */}
      <View style={styles.debtSide}>
        <View style={[styles.avatar, { backgroundColor: USER_COLORS[from] + '20', borderColor: USER_COLORS[from] }]}>
          <Text style={[styles.avatarText, { color: USER_COLORS[from] }]}>{from[0]}</Text>
        </View>
        <Text style={[styles.debtName, { color: USER_COLORS[from] }]}>{from.toUpperCase()}</Text>
        <Text style={styles.debtRole}>SENDER</Text>
      </View>

      {/* Center */}
      <View style={styles.debtCenter}>
        <Text style={styles.owesLabel}>◈ OWES</Text>
        <Text style={styles.debtAmount}>{CURRENCY}{amount.toFixed(2)}</Text>
        <View style={styles.arrowRow}>
          <View style={styles.arrowLine} />
          <Text style={styles.arrowHead}>▶</Text>
        </View>
      </View>

      {/* TO side */}
      <View style={[styles.debtSide, styles.debtSideRight]}>
        <View style={[styles.avatar, { backgroundColor: USER_COLORS[to] + '20', borderColor: USER_COLORS[to] }]}>
          <Text style={[styles.avatarText, { color: USER_COLORS[to] }]}>{to[0]}</Text>
        </View>
        <Text style={[styles.debtName, { color: USER_COLORS[to] }]}>{to.toUpperCase()}</Text>
        <Text style={styles.debtRole}>RECEIVER</Text>
      </View>
    </View>
  );
}

// ─── User Net Position Row ─────────────────────────────────────────────────────

function UserNetRow({ user, balances }: { user: string; balances: Balance[] }) {
  const totalOwedToUser = balances
    .filter((b) => b.to === user)
    .reduce((s, b) => s + b.amount, 0);
  const totalUserOwes = balances
    .filter((b) => b.from === user)
    .reduce((s, b) => s + b.amount, 0);
  const net = totalOwedToUser - totalUserOwes;
  const isPositive = net >= 0;
  const netColor = isPositive ? COLORS.success : COLORS.danger;
  const statusLabel = net === 0 ? 'BALANCED' : isPositive ? 'IN CREDIT' : 'IN DEBIT';

  return (
    <View style={[styles.userNetRow, { borderLeftColor: USER_COLORS[user] }]}>
      <View style={[styles.avatar, { backgroundColor: USER_COLORS[user] + '20', borderColor: USER_COLORS[user] }]}>
        <Text style={[styles.avatarText, { color: USER_COLORS[user] }]}>{user[0]}</Text>
      </View>
      <View style={styles.userNetMeta}>
        <Text style={styles.userNetName}>{user.toUpperCase()}</Text>
        <Text style={[styles.userNetStatus, { color: netColor }]}>{statusLabel}</Text>
      </View>
      <Text style={[styles.userNetAmount, { color: netColor }]}>
        {net >= 0 ? '+' : ''}{CURRENCY}{Math.abs(net).toFixed(2)}
      </Text>
    </View>
  );
}

// ─── Balances Screen ───────────────────────────────────────────────────────────

export default function BalancesScreen() {
  const [balances, setBalances] = useState<Balance[]>([]);
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
      setBalances(calculateNetBalances(expenses as any, settlements as any));
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
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>◎ BALANCE<Text style={styles.pageTitleAccent}> MATRIX</Text></Text>
          <Text style={styles.pageSubtitle}>// NET POSITION OVERVIEW</Text>
          <View style={styles.headerDivider} />
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Net Positions Section */}
            <Text style={styles.sectionLabel}>▸ NET POSITION</Text>
            <View style={styles.section}>
              {USERS.map((u, idx) => (
                <UserNetRow key={u} user={u} balances={balances} />
              ))}
            </View>

            {/* Transfer Ledger Section */}
            <Text style={styles.sectionLabel}>▸ TRANSFER LEDGER</Text>
            {balances.length === 0 ? (
              <View style={styles.settledContainer}>
                <Text style={styles.settledIcon}>◉</Text>
                <Text style={styles.settledText}>SYSTEM BALANCED</Text>
                <Text style={styles.settledSub}>No outstanding transfers</Text>
                <View style={styles.settledPulse} />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },

  // ── Page Header ─────────────────────────────────────────────────────────────
  pageHeader: {
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 3,
  },
  pageTitleAccent: {
    color: COLORS.primary,
  },
  pageSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    fontWeight: '600',
    marginTop: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 14,
  },

  // ── Section Label ────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: 12,
    marginTop: 4,
  },

  // ── Net Position Section ─────────────────────────────────────────────────────
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary + '66',
  },
  userNetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderLeftWidth: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 4,          // square, not round
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  userNetMeta: {
    flex: 1,
  },
  userNetName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  userNetStatus: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
  userNetAmount: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ── Debt Transfer Card ───────────────────────────────────────────────────────
  debtCard: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
    borderTopColor: COLORS.danger + 'AA',
    borderTopWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  debtSide: {
    alignItems: 'center',
    flex: 1,
  },
  debtSideRight: {
    alignItems: 'center',
  },
  debtName: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 1.5,
  },
  debtRole: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 2,
  },
  debtCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  owesLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.danger,
    marginBottom: 6,
    letterSpacing: 1,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowLine: {
    width: 26,
    height: 1,
    backgroundColor: COLORS.textMuted,
  },
  arrowHead: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // ── Settled State ─────────────────────────────────────────────────────────────
  settledContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.success + '44',
    borderTopWidth: 2,
    borderTopColor: COLORS.success,
    position: 'relative',
    overflow: 'hidden',
  },
  settledIcon: {
    fontSize: 44,
    color: COLORS.success,
    marginBottom: 12,
  },
  settledText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: 4,
    marginBottom: 6,
  },
  settledSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  settledPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.success,
    opacity: 0.04,
    top: -60,
  },
});
