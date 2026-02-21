import * as Crypto from 'expo-crypto';

export async function hashPin(pin) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
}
