import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, getSettlements, addSettlement } from '../utils/firestore';
import { calculateNetBalances } from '../utils/balanceCalculator';
import { useAuth } from '../context/AuthContext';
import { COLORS, CURRENCY, USER_COLORS } from '../constants/theme';

export default function SettleUpScreen() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);
  const [history, setHistory] = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [expenses, settlements] = await Promise.all([
        getExpenses(),
        getSettlements(),
      ]);
      setBalances(calculateNetBalances(expenses, settlements));
      setHistory(settlements.sort((a, b) => {
        const aTime = a.date?.toDate ? a.date.toDate() : new Date(0);
        const bTime = b.date?.toDate ? b.date.toDate() : new Date(0);
        return bTime - aTime;
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myDebts = balances.filter((b) => b.from === user);
  const owedToMe = balances.filter((b) => b.to === user);

  const openSettle = (debt) => {
    setSelectedDebt(debt);
    setSettleAmount(debt.amount.toFixed(2));
  };

  const handleSettle = async () => {
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    if (amt > selectedDebt.amount + 0.01) {
      Alert.alert('Too much', `You only owe ${CURRENCY}${selectedDebt.amount.toFixed(2)}`);
      return;
    }
    setSettling(true);
    try {
      await addSettlement({ from: selectedDebt.from, to: selectedDebt.to, amount: amt });
      setSelectedDebt(null);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Failed to record settlement. Try again.');
    } finally {
      setSettling(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

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
        <Text style={styles.title}>Settle Up</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* My debts */}
            <Text style={styles.sectionLabel}>You owe</Text>
            {myDebts.length === 0 ? (
              <View style={styles.nilCard}>
                <Text style={styles.nilText}>You don't owe anyone 🎉</Text>
              </View>
            ) : (
              myDebts.map((debt, i) => (
                <View key={i} style={styles.debtCard}>
                  <View style={[styles.debtAvatar, { backgroundColor: USER_COLORS[debt.to] + '22' }]}>
                    <Text style={[styles.debtAvatarText, { color: USER_COLORS[debt.to] }]}>
                      {debt.to[0]}
                    </Text>
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtLabel}>
                      You owe <Text style={{ color: USER_COLORS[debt.to] }}>{debt.to}</Text>
                    </Text>
                    <Text style={styles.debtAmount}>
                      {CURRENCY}{debt.amount.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.settleBtn}
                    onPress={() => openSettle(debt)}
                  >
                    <Text style={styles.settleBtnText}>Settle</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Owed to me */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Owed to you</Text>
            {owedToMe.length === 0 ? (
              <View style={styles.nilCard}>
                <Text style={styles.nilText}>Nobody owes you right now</Text>
              </View>
            ) : (
              owedToMe.map((debt, i) => (
                <View key={i} style={[styles.debtCard, styles.debtCardReceive]}>
                  <View style={[styles.debtAvatar, { backgroundColor: USER_COLORS[debt.from] + '22' }]}>
                    <Text style={[styles.debtAvatarText, { color: USER_COLORS[debt.from] }]}>
                      {debt.from[0]}
                    </Text>
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtLabel}>
                      <Text style={{ color: USER_COLORS[debt.from] }}>{debt.from}</Text> owes you
                    </Text>
                    <Text style={[styles.debtAmount, { color: COLORS.success }]}>
                      {CURRENCY}{debt.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.waitBadge}>
                    <Text style={styles.waitText}>Pending</Text>
                  </View>
                </View>
              ))
            )}

            {/* Settlement History */}
            {history.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>History</Text>
                {history.slice(0, 10).map((s, i) => (
                  <View key={i} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyText}>
                        <Text style={{ color: USER_COLORS[s.from] }}>{s.from}</Text>
                        {' paid '}
                        <Text style={{ color: USER_COLORS[s.to] }}>{s.to}</Text>
                      </Text>
                      <Text style={styles.historyDate}>{formatDate(s.date)}</Text>
                    </View>
                    <Text style={styles.historyAmount}>
                      {CURRENCY}{parseFloat(s.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Settle Modal */}
      <Modal
        visible={!!selectedDebt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDebt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />
            <Text style={styles.modalTitle}>Settle with {selectedDebt?.to}</Text>
            <Text style={styles.modalSubtitle}>
              You owe {CURRENCY}{selectedDebt?.amount.toFixed(2)} in total
            </Text>

            <Text style={styles.inputLabel}>Amount to settle ({CURRENCY})</Text>
            <TextInput
              style={styles.amountInput}
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              selectTextOnFocus
            />

            {settling ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setSelectedDebt(null)}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSettle}>
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  },
  nilCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nilText: { color: COLORS.textSecondary, fontSize: 15 },
  debtCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  debtCardReceive: {
    borderColor: COLORS.success + '44',
  },
  debtAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtAvatarText: { fontSize: 18, fontWeight: '700' },
  debtInfo: { flex: 1 },
  debtLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 2 },
  debtAmount: { fontSize: 20, fontWeight: '800', color: COLORS.danger },
  settleBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settleBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  waitBadge: {
    backgroundColor: COLORS.success + '22',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  waitText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyLeft: { flex: 1 },
  historyText: { fontSize: 14, color: COLORS.text, marginBottom: 2 },
  historyDate: { fontSize: 12, color: COLORS.textMuted },
  historyAmount: { fontSize: 16, fontWeight: '700', color: COLORS.success },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  cancelModalText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmBtnText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
