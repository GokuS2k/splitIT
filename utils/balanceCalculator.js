import { USERS } from '../constants/theme';

/**
 * Calculates net balances between all user pairs.
 * Returns array of { from, to, amount } where `from` owes `to`.
 */
export function calculateNetBalances(expenses, settlements) {
  const balances = [];

  for (let i = 0; i < USERS.length; i++) {
    for (let j = i + 1; j < USERS.length; j++) {
      const A = USERS[i];
      const B = USERS[j];

      let totalAOwesB = 0;
      let totalBOwesA = 0;

      expenses.forEach(({ paidBy, splits }) => {
        if (!splits) return;
        if (paidBy === B && splits[A] != null) totalAOwesB += splits[A];
        if (paidBy === A && splits[B] != null) totalBOwesA += splits[B];
      });

      let settledAToB = 0;
      let settledBToA = 0;

      settlements.forEach(({ from, to, amount }) => {
        if (from === A && to === B) settledAToB += amount;
        if (from === B && to === A) settledBToA += amount;
      });

      const net =
        totalAOwesB - totalBOwesA - (settledAToB - settledBToA);

      if (Math.abs(net) > 0.01) {
        if (net > 0) {
          balances.push({ from: A, to: B, amount: Math.round(net * 100) / 100 });
        } else {
          balances.push({ from: B, to: A, amount: Math.round(-net * 100) / 100 });
        }
      }
    }
  }

  return balances;
}

/**
 * Returns summary for a specific user:
 * { owedToMe: [{from, amount}], iOwe: [{to, amount}] }
 */
export function getUserSummary(user, balances) {
  const owedToMe = balances
    .filter((b) => b.to === user)
    .map(({ from, amount }) => ({ from, amount }));

  const iOwe = balances
    .filter((b) => b.from === user)
    .map(({ to, amount }) => ({ to, amount }));

  return { owedToMe, iOwe };
}
