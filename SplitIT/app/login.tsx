import React, { useState } from 'react';
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
} from 'react-native';
import { getUser, createUser } from '@/utils/firestore';
import { hashPin } from '@/utils/pinHash';
import { useAuth } from '@/context/AuthContext';
import { COLORS, USERS, USER_COLORS } from '@/constants/theme';

// ─── PIN Pad Component ────────────────────────────────────────────────────────

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
      Alert.alert('Error', 'Could not connect to server. Try again.');
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
        Alert.alert('Mismatch', 'PINs do not match. Try again.');
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
        Alert.alert('Error', 'Could not save PIN. Try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const user = await getUser(selectedUser!);
        const hashed = await hashPin(submittedPin);
        if (hashed === user.pin) {
          setModalVisible(false);
          login(selectedUser!);
        } else {
          Alert.alert('Wrong PIN', 'Incorrect PIN. Please try again.');
          setPin('');
        }
      } catch {
        Alert.alert('Error', 'Could not verify PIN. Try again.');
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
    if (isFirstTime) {
      return confirmMode ? 'Confirm your PIN' : 'Create a 4-digit PIN';
    }
    return `Welcome back, ${selectedUser}`;
  };

  const getModalSubtitle = () => {
    if (isFirstTime) {
      return confirmMode ? 'Re-enter your PIN to confirm' : 'Choose a PIN to secure your account';
    }
    return 'Enter your PIN to continue';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.appName}>SplitIT</Text>
        <Text style={styles.tagline}>Split expenses. Stay friends.</Text>
      </View>

      <Text style={styles.prompt}>Who are you?</Text>

      <View style={styles.cardsContainer}>
        {USERS.map((name) => (
          <TouchableOpacity
            key={name}
            style={[styles.card, { borderColor: USER_COLORS[name] }]}
            onPress={() => handleUserSelect(name)}
            disabled={checking}
          >
            <View style={[styles.avatar, { backgroundColor: USER_COLORS[name] + '22' }]}>
              <Text style={[styles.avatarText, { color: USER_COLORS[name] }]}>
                {name[0]}
              </Text>
            </View>
            <Text style={styles.cardName}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {checking && (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />
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
              <Text style={styles.cancelText}>Cancel</Text>
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
    marginTop: 48,
    marginBottom: 48,
    alignItems: 'center',
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginTop: 12,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 36,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  padContainer: {
    width: '100%',
    gap: 8,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  padKey: {
    width: 80,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
  },
  padKeyText: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.text,
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
