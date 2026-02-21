import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView,
  StatusBar, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getExpenses, getSettlements, addSettlement } from '@/utils/firestore';
import { calculateNetBalances, Balance } from '@/utils/balanceCalculator';
import { useAuth } from '@/context/AuthContext';
import { COLORS, CURRENCY, USER_COLORS } from '@/constants/theme';

export default function SettleScreen() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Balance | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [expenses, settlements] = await Promise.all([getExpenses(), getSettlements()]);
      setBalances(calculateNetBalances(expenses as any, settlements as any));
      setHistory([...settlements].sort((a: any, b: any) => {
        const aTime = a.date?.toDate ? a.date.toDate() : new Date(0);
        const bTime = b.date?.toDate ? b.date.toDate() : new Date(0);
        return bTime.getTime() - aTime.getTime();
      }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myDebts = balances.filter((b) => b.from === user);
  const owedToMe = balances.filter((b) => b.to === user);

  const openSettle = (debt: Balance) => {
    setSelectedDebt(debt);
    setSettleAmount(debt.amount.toFixed(2));
  };

  const handleSettle = async () => {
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('INVALID', 'Enter a valid amount.'); return; }
    if (amt > selectedDebt!.amount + 0.01) {
      Alert.alert('OVERFLOW', `Max: ${CURRENCY}${selectedDebt!.amount.toFixed(2)}`);
      return;
    }
    setSettling(true);
    try {
      await addSettlement({ from: selectedDebt!.from, to: selectedDebt!.to, amount: amt });
      setSelectedDebt(null);
      await load();
    } catch { Alert.alert('ERROR', 'Settlement failed. Try again.'); }
    finally { setSettling(false); }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
      >
        <Text style={styles.title}>SETTLE UP</Text>
        <Text style={styles.titleSub}>// DEBT RESOLUTION SYSTEM</Text>
        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>▸ YOU OWE</Text>
            {myDebts.length === 0 ? (
              <View style={styles.nilCard}>
                <Text style={styles.nilText}>◉  NO ACTIVE DEBTS</Text>
              </View>
            ) : (
              myDebts.map((debt, i) => (
                <View key={i} style={[styles.debtCard, { borderLeftColor: COLORS.danger }]}>
                  <View style={[styles.debtAvatar, { borderColor: USER_COLORS[debt.to] }]}>
                    <Text style={[styles.debtAvatarText, { color: USER_COLORS[debt.to] }]}>{debt.to[0]}</Text>
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtLabel}>
                      YOU OWE{' '}
                      <Text style={{ color: USER_COLORS[debt.to] }}>{debt.to.toUpperCase()}</Text>
                    </Text>
                    <Text style={styles.debtAmount}>{CURRENCY}{debt.amount.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity style={styles.settleBtn} onPress={() => openSettle(debt)}>
                    <Text style={styles.settleBtnText}>PAY</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>▸ OWED TO YOU</Text>
            {owedToMe.length === 0 ? (
              <View style={styles.nilCard}>
                <Text style={styles.nilText}>◈  NOTHING INCOMING</Text>
              </View>
            ) : (
              owedToMe.map((debt, i) => (
                <View key={i} style={[styles.debtCard, { borderLeftColor: COLORS.success }]}>
                  <View style={[styles.debtAvatar, { borderColor: USER_COLORS[debt.from] }]}>
                    <Text style={[styles.debtAvatarText, { color: USER_COLORS[debt.from] }]}>{debt.from[0]}</Text>
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtLabel}>
                      <Text style={{ color: USER_COLORS[debt.from] }}>{debt.from.toUpperCase()}</Text>
                      {' '}OWES YOU
                    </Text>
                    <Text style={[styles.debtAmount, { color: COLORS.success }]}>{CURRENCY}{debt.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>WAIT</Text>
                  </View>
                </View>
              ))
            )}

            {history.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>▸ HISTORY LOG</Text>
                {history.slice(0, 10).map((s, i) => (
                  <View key={i} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyText}>
                        <Text style={{ color: USER_COLORS[s.from] }}>{s.from.toUpperCase()}</Text>
                        {' → '}
                        <Text style={{ color: USER_COLORS[s.to] }}>{s.to.toUpperCase()}</Text>
                      </Text>
                      <Text style={styles.historyDate}>{formatDate(s.date)}</Text>
                    </View>
                    <Text style={styles.historyAmount}>{CURRENCY}{parseFloat(s.amount).toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedDebt} transparent animationType="slide" onRequestClose={() => setSelectedDebt(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />
            <Text style={styles.modalTitle}>SETTLE DEBT</Text>
            <Text style={styles.modalSubtitle}>
              Paying {selectedDebt?.to?.toUpperCase()}  ·  Max {CURRENCY}{selectedDebt?.amount.toFixed(2)}
            </Text>

            <Text style={styles.inputLabel}>AMOUNT ({CURRENCY})</Text>
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
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setSelectedDebt(null)}>
                  <Text style={styles.cancelModalText}>[ ABORT ]</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSettle}>
                  <Text style={styles.confirmBtnText}>CONFIRM</Text>
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
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: 4 },
  titleSub: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1.5, marginTop: 4, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 3, marginBottom: 10,
  },
  nilCard: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 4,
    padding: 16, alignItems: 'center',
  },
  nilText: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  debtCard: {
    backgroundColor: COLORS.card, borderRadius: 4, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3,
  },
  debtAvatar: {
    width: 42, height: 42, borderRadius: 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  debtAvatarText: { fontSize: 17, fontWeight: '800' },
  debtInfo: { flex: 1 },
  debtLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 3, letterSpacing: 1.5, fontWeight: '700' },
  debtAmount: { fontSize: 20, fontWeight: '900', color: COLORS.danger, letterSpacing: 1 },
  settleBtn: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 2, paddingHorizontal: 14, paddingVertical: 9,
  },
  settleBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  pendingBadge: {
    borderWidth: 1, borderColor: COLORS.success + '66', borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  pendingText: { color: COLORS.success, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  historyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 4, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  historyLeft: { flex: 1 },
  historyText: { fontSize: 13, color: COLORS.text, marginBottom: 2, fontWeight: '600' },
  historyDate: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  historyAmount: { fontSize: 15, fontWeight: '800', color: COLORS.success, letterSpacing: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopWidth: 2, borderTopColor: COLORS.primary,
    padding: 24, paddingBottom: 40,
  },
  handleBar: {
    width: 40, height: 3, backgroundColor: COLORS.primary,
    alignSelf: 'center', marginBottom: 20, opacity: 0.6,
  },
  modalTitle: {
    fontSize: 20, fontWeight: '900', color: COLORS.text,
    letterSpacing: 4, marginBottom: 6,
  },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24, letterSpacing: 0.5 },
  inputLabel: {
    fontSize: 11, color: COLORS.textSecondary, fontWeight: '700',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2,
  },
  amountInput: {
    backgroundColor: COLORS.card, borderRadius: 4, padding: 16,
    color: COLORS.primary, fontSize: 28, fontWeight: '900',
    borderWidth: 1, borderColor: COLORS.borderBright, textAlign: 'center', letterSpacing: 2,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelModalBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 4,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelModalText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  confirmBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 4,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  confirmBtnText: { color: COLORS.background, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
});
