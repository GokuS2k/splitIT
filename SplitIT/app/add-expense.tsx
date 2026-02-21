import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addExpense } from '@/utils/firestore';
import { useAuth } from '@/context/AuthContext';
import { COLORS, CURRENCY, USERS, USER_COLORS } from '@/constants/theme';

const SPLIT_TYPES = ['equal', 'percentage', 'exclude'];

function computeSplits(
  splitType: string, amount: string, paidBy: string,
  percentages: Record<string, string>, excluded: string[]
): Record<string, number> | null {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return null;

  if (splitType === 'equal') {
    const share = Math.round((num / USERS.length) * 100) / 100;
    const splits: Record<string, number> = {};
    USERS.forEach((u) => (splits[u] = share));
    const diff = Math.round((num - share * USERS.length) * 100) / 100;
    splits[paidBy] = Math.round((splits[paidBy] + diff) * 100) / 100;
    return splits;
  }

  if (splitType === 'percentage') {
    const total = USERS.reduce((s, u) => s + (parseFloat(percentages[u]) || 0), 0);
    if (Math.abs(total - 100) > 0.5) return null;
    const splits: Record<string, number> = {};
    USERS.forEach((u) => {
      splits[u] = Math.round(num * ((parseFloat(percentages[u]) || 0) / 100) * 100) / 100;
    });
    return splits;
  }

  if (splitType === 'exclude') {
    const included = USERS.filter((u) => !excluded.includes(u));
    if (included.length === 0) return null;
    const share = Math.round((num / included.length) * 100) / 100;
    const splits: Record<string, number> = {};
    included.forEach((u) => (splits[u] = share));
    const diff = Math.round((num - share * included.length) * 100) / 100;
    splits[included[0]] = Math.round((splits[included[0]] + diff) * 100) / 100;
    return splits;
  }

  return null;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(user ?? USERS[0]);
  const [splitType, setSplitType] = useState('equal');
  const [percentages, setPercentages] = useState<Record<string, string>>(
    Object.fromEntries(USERS.map((u) => [u, '33.33']))
  );
  const [excluded, setExcluded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleExclude = (name: string) => {
    setExcluded((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('VALIDATION', 'Title required.'); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { Alert.alert('VALIDATION', 'Enter a valid amount.'); return; }

    if (splitType === 'percentage') {
      const total = USERS.reduce((s, u) => s + (parseFloat(percentages[u]) || 0), 0);
      if (Math.abs(total - 100) > 0.5) {
        Alert.alert('VALIDATION', `Percentages must total 100%. Current: ${total.toFixed(1)}%`);
        return;
      }
    }

    if (splitType === 'exclude') {
      const included = USERS.filter((u) => !excluded.includes(u));
      if (included.length === 0) {
        Alert.alert('VALIDATION', 'At least one person must be included.');
        return;
      }
    }

    const splits = computeSplits(splitType, amount, paidBy, percentages, excluded);
    if (!splits) { Alert.alert('ERROR', 'Could not compute splits.'); return; }

    setSaving(true);
    try {
      await addExpense({ title: title.trim(), amount: num, paidBy, splitType, splits });
      router.back();
    } catch {
      Alert.alert('ERROR', 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const equalShare = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return '—';
    return `${CURRENCY}${(num / USERS.length).toFixed(2)} each`;
  };

  const includedCount = USERS.filter((u) => !excluded.includes(u)).length;
  const excludeShare = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || includedCount === 0) return '—';
    return `${CURRENCY}${(num / includedCount).toFixed(2)} each`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>◀ BACK</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>LOG EXPENSE</Text>
            <View style={{ width: 70 }} />
          </View>
          <View style={styles.divider} />

          {/* Title Input */}
          <Text style={styles.label}>▸ DESCRIPTION</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. GROCERIES, PIZZA"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Amount Input */}
          <Text style={styles.label}>▸ AMOUNT ({CURRENCY})</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          {/* Paid By */}
          <Text style={styles.label}>▸ PAID BY</Text>
          <View style={styles.segmentRow}>
            {USERS.map((name) => {
              const c = USER_COLORS[name];
              const active = paidBy === name;
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.segmentBtn,
                    active && { backgroundColor: c + '18', borderColor: c },
                  ]}
                  onPress={() => setPaidBy(name)}
                >
                  <Text style={[styles.segmentText, active && { color: c, fontWeight: '800' }]}>
                    {name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Split Type */}
          <Text style={styles.label}>▸ SPLIT MODE</Text>
          <View style={styles.segmentRow}>
            {SPLIT_TYPES.map((type) => {
              const active = splitType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setSplitType(type)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {type === 'equal' ? 'EQUAL' : type === 'percentage' ? 'PCT %' : 'CUSTOM'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Split Details */}
          <View style={styles.splitSection}>
            {splitType === 'equal' && (
              <View style={styles.equalInfo}>
                <Text style={styles.splitHint}>{equalShare()}</Text>
                {USERS.map((u) => (
                  <View key={u} style={styles.splitRow}>
                    <Text style={[styles.splitName, { color: USER_COLORS[u] }]}>{u.toUpperCase()}</Text>
                    <Text style={styles.splitValue}>
                      {CURRENCY}{parseFloat(amount) > 0 ? (parseFloat(amount) / USERS.length).toFixed(2) : '0.00'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {splitType === 'percentage' && (
              <View>
                <Text style={styles.splitHint}>
                  TOTAL: {USERS.reduce((s, u) => s + (parseFloat(percentages[u]) || 0), 0).toFixed(1)}% / 100%
                </Text>
                {USERS.map((u) => (
                  <View key={u} style={styles.splitRow}>
                    <Text style={[styles.splitName, { color: USER_COLORS[u] }]}>{u.toUpperCase()}</Text>
                    <View style={styles.pctRow}>
                      <TextInput
                        style={styles.pctInput}
                        value={percentages[u]}
                        onChangeText={(val) => setPercentages((prev) => ({ ...prev, [u]: val }))}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <Text style={styles.pctSymbol}>%</Text>
                    </View>
                    <Text style={styles.splitValue}>
                      {CURRENCY}
                      {parseFloat(amount) > 0 && parseFloat(percentages[u]) > 0
                        ? (parseFloat(amount) * (parseFloat(percentages[u]) / 100)).toFixed(2)
                        : '0.00'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {splitType === 'exclude' && (
              <View>
                <Text style={styles.splitHint}>
                  {excludeShare()}  ·  {includedCount}/{USERS.length} INCLUDED
                </Text>
                {USERS.map((u) => {
                  const isExcluded = excluded.includes(u);
                  return (
                    <TouchableOpacity key={u} style={styles.excludeRow} onPress={() => toggleExclude(u)}>
                      <View style={[styles.checkbox, !isExcluded && { backgroundColor: USER_COLORS[u], borderColor: USER_COLORS[u] }]}>
                        {!isExcluded && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[styles.splitName, { color: isExcluded ? COLORS.textMuted : USER_COLORS[u] }]}>
                        {u.toUpperCase()}
                      </Text>
                      <Text style={[styles.splitValue, isExcluded && { color: COLORS.textMuted }]}>
                        {isExcluded
                          ? 'SKIP'
                          : `${CURRENCY}${parseFloat(amount) > 0 && includedCount > 0 ? (parseFloat(amount) / includedCount).toFixed(2) : '0.00'}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.background} />
              : <Text style={styles.saveBtnText}>⊕  COMMIT EXPENSE</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 60 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  backBtn: { width: 70 },
  backText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  screenTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 3 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 20 },
  label: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 3, marginBottom: 8, marginTop: 20,
  },
  input: {
    backgroundColor: COLORS.card, borderRadius: 4, padding: 16,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
    letterSpacing: 1,
  },
  amountInput: {
    fontSize: 24, fontWeight: '800', color: COLORS.primary,
    letterSpacing: 2, borderColor: COLORS.borderBright,
  },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 4,
    backgroundColor: COLORS.card, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  segmentBtnActive: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  segmentText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  segmentTextActive: { color: COLORS.primary, fontWeight: '800' },
  splitSection: {
    marginTop: 20, backgroundColor: COLORS.card,
    borderRadius: 4, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  equalInfo: { gap: 4 },
  splitHint: {
    fontSize: 11, color: COLORS.textSecondary, marginBottom: 12,
    textAlign: 'center', letterSpacing: 2, fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  splitName: { flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  splitValue: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    minWidth: 70, textAlign: 'right',
  },
  pctRow: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  pctInput: {
    backgroundColor: COLORS.cardAlt, borderRadius: 2, padding: 6,
    color: COLORS.primary, fontSize: 14, width: 56, textAlign: 'center',
    borderWidth: 1, borderColor: COLORS.borderBright,
  },
  pctSymbol: { color: COLORS.primary, marginLeft: 4, fontSize: 13, fontWeight: '700' },
  excludeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 2, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: COLORS.background, fontSize: 12, fontWeight: '800' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 4,
    paddingVertical: 18, alignItems: 'center', marginTop: 32,
  },
  saveBtnText: {
    color: COLORS.background, fontSize: 14, fontWeight: '900', letterSpacing: 4,
  },
});
