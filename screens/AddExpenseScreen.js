import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { addExpense } from '../utils/firestore';
import { useAuth } from '../context/AuthContext';
import { COLORS, CURRENCY, USERS, USER_COLORS } from '../constants/theme';

const SPLIT_TYPES = ['equal', 'percentage', 'exclude'];

function computeSplits(splitType, amount, paidBy, percentages, excluded) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return null;

  if (splitType === 'equal') {
    const share = Math.round((num / USERS.length) * 100) / 100;
    const splits = {};
    USERS.forEach((u) => (splits[u] = share));
    // fix rounding for payer
    const diff = Math.round((num - share * USERS.length) * 100) / 100;
    splits[paidBy] = Math.round((splits[paidBy] + diff) * 100) / 100;
    return splits;
  }

  if (splitType === 'percentage') {
    const total = USERS.reduce((s, u) => s + (parseFloat(percentages[u]) || 0), 0);
    if (Math.abs(total - 100) > 0.5) return null; // validation done in caller
    const splits = {};
    USERS.forEach((u) => {
      splits[u] = Math.round(num * ((parseFloat(percentages[u]) || 0) / 100) * 100) / 100;
    });
    return splits;
  }

  if (splitType === 'exclude') {
    const included = USERS.filter((u) => !excluded.includes(u));
    if (included.length === 0) return null;
    const share = Math.round((num / included.length) * 100) / 100;
    const splits = {};
    included.forEach((u) => (splits[u] = share));
    // fix rounding
    const diff = Math.round((num - share * included.length) * 100) / 100;
    splits[included[0]] = Math.round((splits[included[0]] + diff) * 100) / 100;
    return splits;
  }

  return null;
}

export default function AddExpenseScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(user);
  const [splitType, setSplitType] = useState('equal');
  const [percentages, setPercentages] = useState(
    Object.fromEntries(USERS.map((u) => [u, '33.33']))
  );
  const [excluded, setExcluded] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleExclude = (name) => {
    setExcluded((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title.');
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }

    if (splitType === 'percentage') {
      const total = USERS.reduce((s, u) => s + (parseFloat(percentages[u]) || 0), 0);
      if (Math.abs(total - 100) > 0.5) {
        Alert.alert('Validation', `Percentages must add up to 100%. Currently: ${total.toFixed(1)}%`);
        return;
      }
    }

    if (splitType === 'exclude') {
      const included = USERS.filter((u) => !excluded.includes(u));
      if (included.length === 0) {
        Alert.alert('Validation', 'At least one person must be included in the split.');
        return;
      }
    }

    const splits = computeSplits(splitType, amount, paidBy, percentages, excluded);
    if (!splits) {
      Alert.alert('Error', 'Could not compute splits. Please check your inputs.');
      return;
    }

    setSaving(true);
    try {
      await addExpense({ title: title.trim(), amount: num, paidBy, splitType, splits });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save expense. Try again.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Add Expense</Text>
            <View style={{ width: 70 }} />
          </View>

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Groceries, Pizza"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Amount */}
          <Text style={styles.label}>Amount ({CURRENCY})</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          {/* Paid By */}
          <Text style={styles.label}>Paid by</Text>
          <View style={styles.segmentRow}>
            {USERS.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.segmentBtn,
                  paidBy === name && { backgroundColor: USER_COLORS[name] + '33', borderColor: USER_COLORS[name] },
                ]}
                onPress={() => setPaidBy(name)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    paidBy === name && { color: USER_COLORS[name], fontWeight: '700' },
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Split Type */}
          <Text style={styles.label}>Split type</Text>
          <View style={styles.segmentRow}>
            {SPLIT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segmentBtn,
                  splitType === type && styles.segmentBtnActive,
                ]}
                onPress={() => setSplitType(type)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    splitType === type && styles.segmentTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dynamic split section */}
          <View style={styles.splitSection}>
            {splitType === 'equal' && (
              <View style={styles.equalInfo}>
                <Text style={styles.equalInfoText}>{equalShare()}</Text>
                {USERS.map((u) => (
                  <View key={u} style={styles.splitRow}>
                    <Text style={[styles.splitName, { color: USER_COLORS[u] }]}>{u}</Text>
                    <Text style={styles.splitValue}>
                      {CURRENCY}
                      {parseFloat(amount) > 0
                        ? (parseFloat(amount) / USERS.length).toFixed(2)
                        : '0.00'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {splitType === 'percentage' && (
              <View>
                <Text style={styles.splitHint}>
                  Total:{' '}
                  {USERS.reduce((s, u) => s + (parseFloat(percentages[u]) || 0), 0).toFixed(1)}%
                  (must be 100%)
                </Text>
                {USERS.map((u) => (
                  <View key={u} style={styles.splitRow}>
                    <Text style={[styles.splitName, { color: USER_COLORS[u] }]}>{u}</Text>
                    <View style={styles.pctRow}>
                      <TextInput
                        style={styles.pctInput}
                        value={percentages[u]}
                        onChangeText={(val) =>
                          setPercentages((prev) => ({ ...prev, [u]: val }))
                        }
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
                  {excludeShare()} — {includedCount} of {USERS.length} included
                </Text>
                {USERS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={styles.excludeRow}
                    onPress={() => toggleExclude(u)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        !excluded.includes(u) && { backgroundColor: USER_COLORS[u], borderColor: USER_COLORS[u] },
                      ]}
                    >
                      {!excluded.includes(u) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.splitName,
                        { color: excluded.includes(u) ? COLORS.textMuted : USER_COLORS[u] },
                      ]}
                    >
                      {u}
                    </Text>
                    {!excluded.includes(u) && (
                      <Text style={styles.splitValue}>
                        {CURRENCY}
                        {parseFloat(amount) > 0 && includedCount > 0
                          ? (parseFloat(amount) / includedCount).toFixed(2)
                          : '0.00'}
                      </Text>
                    )}
                    {excluded.includes(u) && (
                      <Text style={[styles.splitValue, { color: COLORS.textMuted }]}>excluded</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.saveBtnText}>Save Expense</Text>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: { width: 70 },
  backText: { color: COLORS.primary, fontSize: 16 },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary + '22',
    borderColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  splitSection: {
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equalInfo: { gap: 4 },
  equalInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  splitHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  splitName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  splitValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 70,
    textAlign: 'right',
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  pctInput: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 8,
    padding: 6,
    color: COLORS.text,
    fontSize: 15,
    width: 56,
    textAlign: 'center',
  },
  pctSymbol: {
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontSize: 14,
  },
  excludeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
