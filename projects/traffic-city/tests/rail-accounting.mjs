// Accounting assertions independent of the native monetary implementation.
import assert from 'node:assert/strict';

export function assertMoney(city) {
  const e = city.economy;
  assert.equal(city.cash + e.households + e.businesses,
    e.opening + e.grants + e.exports + e.salvage - e.construction - e.operating - e.withdrawn,
    'Total money must balance across the city, households, firms and external flows');
  assert.equal(e.households, e.wallets.reduce((sum, [, value]) => sum + value, 0));
  assert.equal(e.businesses, e.firms.reduce((sum, [, value]) => sum + value, 0));
  assert(e.wallets.every(([, value]) => value >= 0));
  assert(e.firms.every(([, value]) => value >= 0));
}

export function assertRailAccountingStep(old, next) {
  const before = old.economy, after = next.economy;
  const delta = name => after[name] - before[name];
  const residents = new Map(old.sim.agents), wallets = new Map(before.wallets);
  const boarded = next.sim.agents.filter(([id, resident]) => resident.state === 6 && residents.get(id).state !== 6);
  const fares = boarded.reduce((sum, [id]) => sum + Math.min(1, wallets.get(id)), 0);
  assert.equal(delta('fares'), fares, 'Each new rider pays at most $1 from their own wallet');
  assert.equal(delta('concessions'), boarded.length - fares, 'Empty wallets receive explicit concessions');
  assert.equal(next.cash - old.cash, delta('taxes') + delta('fares') - delta('operating'),
    'Municipal change must come only from accounted taxes, fares and operating costs');
  if (next.sim.arrived === old.sim.arrived) {
    for (const field of ['exports', 'wages', 'sales']) {
      assert.equal(delta(field), 0, 'Boarding and train events must not earn destination ' + field);
    }
    assert.equal(after.households - before.households, 0 - fares, 'Boarding transfers household money; it does not mint money');
    const charged = new Set(boarded.map(([id]) => id));
    for (const [id, balance] of after.wallets) {
      assert.equal(balance, wallets.get(id) - (charged.has(id) ? Math.min(1, wallets.get(id)) : 0),
        'Only newly boarded riders may pay a fare');
    }
  }
  assertMoney(next);
}

export function withoutTreasury(city) {
  // This is a synthetic funding-starvation fixture, not a game operation.
  // Record the removed capital rather than making the test start unbalanced.
  const copy = structuredClone(city);
  copy.economy.withdrawn += copy.cash;
  copy.cash = 0;
  assertMoney(copy);
  return copy;
}
