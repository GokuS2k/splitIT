import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { getUser, createUser } from '@/utils/firestore';
import { hashPin } from '@/utils/pinHash';
import { useAuth } from '@/context/AuthContext';
import { COLORS, USERS, USER_COLORS } from '@/constants/theme';

import TypewriterLogo from '@/components/TypewriterLogo';

// ─── Animations ───────────────────────────────────────────────────────────────

function ScanningLine() {
  const scanAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const startScan = () => {
      scanAnim.setValue(-100);
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(scanAnim, {
          toValue: 120,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => startScan());
    };
    startScan();
  }, [scanAnim]);

  return (
    <Animated.View
      style={[
        styles.scanLine,
        {
          transform: [{ translateY: scanAnim }],
        },
      ]}
    />
  );
}

// ─── PIN Pad ──────────────────────────────────────────────────────────────────

function PinDots({ length }: { length: number }) {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.dot, i < length && styles.dotFilled]} />
      ))}
    </View>
  );
}

function PinPad({
  onPress,
  onDelete,
}: {
  onPress: (key: string) => void;
  onDelete: () => void;
}) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];
  return (
    <View style={styles.padContainer}>
      {keys.map((row, ri) => (
        <View key={ri} style={styles.padRow}>
          {row.map((key, ki) => (
            <TouchableOpacity
              key={ki}
              style={[styles.padKey, key === '' && styles.padKeyEmpty]}
              onPress={() => {
                if (key === '⌫') onDelete();
                else if (key !== '') onPress(key);
              }}
              disabled={key === ''}
            >
              <Text style={styles.padKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { login } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [confirmMode, setConfirmMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleUserSelect = async (name: string) => {
    setChecking(true);
    try {
      const user = await getUser(name);
      setSelectedUser(name);
      setIsFirstTime(!user);
      setPin('');
      setConfirmPin('');
      setConfirmMode(false);
      setModalVisible(true);
    } catch {
      Alert.alert('CONNECTION ERROR', 'Could not reach server. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const currentPin = confirmMode ? confirmPin : pin;
  const setCurrentPin = confirmMode ? setConfirmPin : setPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length < 4) {
      const next = currentPin + digit;
      setCurrentPin(next);
      if (next.length === 4) {
        setTimeout(() => handleSubmit(next), 120);
      }
    }
  };

  const handleDelete = () => {
    setCurrentPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (submittedPin: string) => {
    if (isFirstTime) {
      if (!confirmMode) {
        setConfirmMode(true);
        setConfirmPin('');
        return;
      }
      if (pin !== submittedPin) {
        Alert.alert('PIN MISMATCH', 'Your codes don\'t match. Try again.');
        setPin('');
        setConfirmPin('');
        setConfirmMode(false);
        return;
      }
      setLoading(true);
      try {
        const hashed = await hashPin(pin);
        await createUser(selectedUser!, hashed);
        setModalVisible(false);
        login(selectedUser!);
      } catch {
        Alert.alert('SYSTEM ERROR', 'Could not save PIN. Try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const userFound = await getUser(selectedUser!);
        const hashed = await hashPin(submittedPin);
        if (userFound && hashed === userFound.pin) {
          setModalVisible(false);
          login(selectedUser!);
        } else {
          Alert.alert('ACCESS DENIED', 'Incorrect PIN. Try again.');
          setPin('');
        }
      } catch {
        Alert.alert('SYSTEM ERROR', 'Could not verify PIN. Try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setPin('');
    setConfirmPin('');
    setConfirmMode(false);
  };

  const getModalTitle = () => {
    if (isFirstTime) return confirmMode ? 'CONFIRM CODE' : 'CREATE CODE';
    return `WELCOME BACK`;
  };

  const getModalSubtitle = () => {
    if (isFirstTime) {
      return confirmMode
        ? 'Re-enter your 4-digit security code'
        : 'Set a 4-digit access code';
    }
    return `Identity: ${selectedUser}  ·  Enter your code`;
  };

  const getStepLabel = () => {
    if (isFirstTime) return confirmMode ? 'STEP 02 / 02' : 'STEP 01 / 02';
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoFrame}>
          <View style={styles.logoGlow} />
          {/* Scanning Line Effect */}
          <ScanningLine />
          <TypewriterLogo />
          <Text style={styles.tagline}>EXPENSE TRACKER #267</Text>
        </View>

        <View style={styles.gridFloor}>
          {[...Array(5)].map((_, idx) => (
            <View key={`h-${idx}`} style={[styles.gridLineHorizontal, { opacity: 0.26 - idx * 0.04 }]} />
          ))}
          <View style={styles.gridVerticalWrap}>
            {[...Array(7)].map((_, idx) => (
              <View key={`v-${idx}`} style={[styles.gridLineVertical, { opacity: idx === 3 ? 0.28 : 0.16 }]} />
            ))}
          </View>
        </View>
      </View>

      {/* Prompt */}
      <Text style={styles.prompt}>▸ SELECT OPERATOR</Text>

      {/* User Cards */}
      <View style={styles.cardsContainer}>
        {USERS.map((name) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.card,
              { borderColor: USER_COLORS[name] },
            ]}
            onPress={() => handleUserSelect(name)}
            disabled={checking}
          >
            <View style={[styles.avatar, { backgroundColor: USER_COLORS[name] + '18' }]}>
              <Text style={[styles.avatarText, { color: USER_COLORS[name] }]}>
                {name[0]}
              </Text>
            </View>
            <Text style={[styles.cardName, { color: USER_COLORS[name] }]}>{name}</Text>
            <View style={[styles.cardDot, { backgroundColor: USER_COLORS[name] }]} />
          </TouchableOpacity>
        ))}
      </View>

      {checking && (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      )}

      {/* PIN Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />

            {getStepLabel() && (
              <Text style={styles.stepLabel}>{getStepLabel()}</Text>
            )}
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <Text style={styles.modalSubtitle}>{getModalSubtitle()}</Text>

            <PinDots length={currentPin.length} />

            {loading ? (
              <ActivityIndicator
                color={COLORS.primary}
                size="large"
                style={{ marginVertical: 40 }}
              />
            ) : (
              <PinPad onPress={handleDigit} onDelete={handleDelete} />
            )}

            <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>[ ABORT ]</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 36,
    marginBottom: 42,
    alignItems: 'center',
  },
  logoFrame: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingVertical: 18,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logoGlow: {
    position: 'absolute',
    top: -28,
    width: 180,
    height: 70,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    opacity: 0.16,
  },
  scanLine: {
    position: 'absolute',
    width: '120%',
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  tagline: {
    marginTop: 8,
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 2.2,
    fontWeight: '700',
  },
  gridFloor: {
    width: '100%',
    marginTop: 8,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'space-evenly',
    overflow: 'hidden',
  },
  gridLineHorizontal: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  gridVerticalWrap: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  gridLineVertical: {
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.secondary,
  },
  prompt: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 24,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    opacity: 0.8,
  },
  // ── Modal ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 3,
    borderRadius: 0,
    backgroundColor: COLORS.primary,
    marginTop: 14,
    marginBottom: 20,
    opacity: 0.6,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 32,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  padContainer: {
    width: '100%',
    gap: 10,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  padKey: {
    width: 80,
    height: 60,
    borderRadius: 4,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  padKeyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '700',
  },
});
