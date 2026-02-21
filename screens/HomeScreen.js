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
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, getSettlements } from '../utils/firestore';
import { calculateNetBalances, getUserSummary } from '../utils/balanceCalculator';
import { useAuth } from '../context/AuthContext';
import { COLORS, CURRENCY, USER_COLORS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ owedToMe: [], iOwe: [] });
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [totalIOwe, setTotalIOwe] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expenses, settlements] = await Promise.all([
        getExpenses(),
        getSettlements(),
      ]);
      const balances = calculateNetBalances(expenses, settlements);
      const s = getUserSummary(user, balances);
      setSummary(s);
      setTotalOwedToMe(s.owedToMe.reduce((acc, b) => acc + b.amount, 0));
      setTotalIOwe(s.iOwe.reduce((acc, b) => acc + b.amount, 0));
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Hey, {user} 👋</Text>
            <Text style={styles.subGreeting}>Here's your balance</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Net balance card */}
        <View
          style={[
            styles.netCard,
            {
              borderColor:
                netBalance > 0
                  ? COLORS.success + '55'
                  : netBalance < 0
                  ? COLORS.danger + '55'
                  : COLORS.border,
            },
          ]}
        >
          <Text style={styles.netLabel}>
            {netBalance > 0 ? 'You are owed' : netBalance < 0 ? 'You owe overall' : 'All settled up!'}
          </Text>
          {netBalance !== 0 && (
            <Text
              style={[
                styles.netAmount,
                { color: netBalance > 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              {CURRENCY}{Math.abs(netBalance).toFixed(2)}
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Owed to me */}
            {summary.owedToMe.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Owed to you</Text>
                {summary.owedToMe.map(({ from, amount }) => (
                  <View key={from} style={styles.balanceRow}>
                    <View style={styles.avatarSmall}>
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

            {/* I owe */}
            {summary.iOwe.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>You owe</Text>
                {summary.iOwe.map(({ to, amount }) => (
                  <View key={to} style={styles.balanceRow}>
                    <View style={styles.avatarSmall}>
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

            {summary.owedToMe.length === 0 && summary.iOwe.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyText}>All settled up!</Text>
                <Text style={styles.emptySubtext}>No pending balances</Text>
              </View>
            )}
          </>
        )}

        {/* Add Expense Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <Text style={styles.addButtonText}>+ Add Expense</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: COLORS.card,
    borderRadius: 10,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  netCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
  },
  netLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netAmount: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
