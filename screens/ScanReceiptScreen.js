import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { COLORS, USERS, USER_COLORS } from '../constants/theme';
const { extractReceiptTextFromImage } = require('../utils/receiptOcr');
const { parseReceiptText } = require('../utils/receiptParser');
import { saveReceiptScan, saveSplitExpense } from '../utils/firestore';
import { useAuth } from '../context/AuthContext';

function pickImageModule() {
  try {
    // eslint-disable-next-line global-require
    return require('expo-image-picker');
  } catch (_err) {
    return null;
  }
}

function toggleMember(list, member) {
  return list.includes(member) ? list.filter((m) => m !== member) : [...list, member];
}

export default function ScanReceiptScreen({ navigation }) {
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [warning, setWarning] = useState(null);
  const [taxEqualSplit, setTaxEqualSplit] = useState(false);

  const [allocations, setAllocations] = useState([]);

  const onPickImage = async (source) => {
    const ImagePicker = pickImageModule();
    if (!ImagePicker) {
      setWarning('expo-image-picker not installed. Add dependency and rebuild dev client.');
      return;
    }

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Need media permissions to scan receipts.');
      return;
    }

    const pickerResult =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            quality: 1,
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 1,
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

    if (pickerResult.canceled) return;

    const uri = pickerResult.assets?.[0]?.uri;
    if (!uri) return;

    setImageUri(uri);
    const ocr = await extractReceiptTextFromImage(uri);
    setWarning(ocr.warning);
    const parsedJson = parseReceiptText(ocr.rawText);
    setParsed(parsedJson);
    setAllocations(
      parsedJson.items.map((item) => ({
        itemRaw: item.raw,
        members: [...USERS],
      }))
    );
  };

  const updateItem = (idx, key, value) => {
    setParsed((prev) => {
      const next = { ...prev, items: [...prev.items] };
      next.items[idx] = { ...next.items[idx], [key]: key === 'line_total' ? Number.parseFloat(value) || 0 : value };
      return next;
    });
  };

  const totals = useMemo(() => {
    const base = Object.fromEntries(USERS.map((name) => [name, 0]));
    if (!parsed) return base;

    parsed.items.forEach((item, index) => {
      const memberList = allocations[index]?.members || [];
      if (!memberList.length) return;
      const share = (item.line_total || 0) / memberList.length;
      memberList.forEach((member) => {
        base[member] += share;
      });
    });

    const taxAmount = parsed.tax || 0;
    if (taxAmount > 0) {
      if (taxEqualSplit) {
        USERS.forEach((member) => {
          base[member] += taxAmount / USERS.length;
        });
      } else {
        const subtotal = USERS.reduce((sum, member) => sum + base[member], 0);
        USERS.forEach((member) => {
          const ratio = subtotal > 0 ? base[member] / subtotal : 1 / USERS.length;
          base[member] += taxAmount * ratio;
        });
      }
    }

    Object.keys(base).forEach((k) => {
      base[k] = Number(base[k].toFixed(2));
    });

    return base;
  }, [parsed, allocations, taxEqualSplit]);

  const onSave = async () => {
    if (!parsed || !imageUri) return;
    const receiptId = await saveReceiptScan({
      createdBy: user,
      imageUrl: imageUri,
      rawOcrText: parsed.items.map((i) => i.raw).join('\n'),
      parsed,
    });

    await saveSplitExpense({
      groupId: 'default-group',
      createdBy: user,
      members: USERS,
      items: parsed.items,
      allocations,
      tax: parsed.tax,
      total: parsed.total,
      subtotal: parsed.subtotal,
      computedTotals: totals,
      taxMode: taxEqualSplit ? 'equal' : 'proportional',
      receiptScanId: receiptId,
    });

    Alert.alert('Saved', 'Receipt scan and expense split saved to Firestore.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scan Receipt</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => onPickImage('camera')}>
            <Text style={styles.buttonText}>Use Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => onPickImage('gallery')}>
            <Text style={styles.buttonText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}

        {parsed ? (
          <>
            <Text style={styles.section}>Detected Items (editable)</Text>
            {parsed.items.map((item, index) => (
              <View style={styles.card} key={`${item.raw}-${index}`}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(val) => updateItem(index, 'name', val)}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={String(item.line_total)}
                  onChangeText={(val) => updateItem(index, 'line_total', val)}
                />
                <Text style={styles.memberTitle}>Assign members:</Text>
                <View style={styles.memberRow}>
                  {USERS.map((member) => {
                    const checked = allocations[index]?.members?.includes(member);
                    return (
                      <TouchableOpacity
                        key={member}
                        style={[styles.checkbox, checked && { borderColor: USER_COLORS[member] }]}
                        onPress={() =>
                          setAllocations((prev) => {
                            const next = [...prev];
                            next[index] = {
                              ...next[index],
                              members: toggleMember(next[index]?.members || [], member),
                            };
                            return next;
                          })
                        }
                      >
                        <Text style={{ color: checked ? USER_COLORS[member] : COLORS.textSecondary }}>
                          {checked ? '☑' : '☐'} {member}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Split tax equally</Text>
              <Switch value={taxEqualSplit} onValueChange={setTaxEqualSplit} />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.section}>Per-member totals</Text>
              {USERS.map((member) => (
                <Text key={member} style={styles.totalText}>
                  {member}: ${totals[member].toFixed(2)}
                </Text>
              ))}
            </View>

            <TouchableOpacity style={[styles.button, styles.save]} onPress={onSave}>
              <Text style={styles.buttonText}>Save to Firestore</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 80 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 28, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.text, fontWeight: '700' },
  preview: { width: '100%', height: 220, borderRadius: 12, marginVertical: 12 },
  section: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginVertical: 10 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.cardAlt,
    color: COLORS.text,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  memberTitle: { color: COLORS.textSecondary, marginBottom: 6 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  checkbox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  switchLabel: { color: COLORS.text, fontWeight: '600' },
  summaryCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12 },
  totalText: { color: COLORS.text, fontSize: 15, marginBottom: 4 },
  save: { marginTop: 16 },
  warning: { color: COLORS.warning, marginTop: 8 },
});
