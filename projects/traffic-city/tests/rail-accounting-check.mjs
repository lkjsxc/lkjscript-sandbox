import assert from 'node:assert/strict';
import {assertMoney, assertRailAccountingStep, withoutTreasury} from './rail-accounting.mjs';

function fixture() {
  return {
    cash: 100,
    economy: {
      opening: 174, grants: 0, exports: 0, salvage: 0, construction: 0,
      operating: 0, withdrawn: 0, taxes: 0, fares: 0, concessions: 0, wages: 0, sales: 0,
      households: 34, businesses: 40, wallets: [[1, 24], [2, 0], [3, 10]], firms: [[100, 40]],
    },
    sim: {arrived: 0, agents: [[1, {state: 5}], [2, {state: 5}], [3, {state: 0}]]},
  };
}

const old = fixture();
assertMoney(old);
assertRailAccountingStep(old, structuredClone(old));
const boarded = structuredClone(old);
boarded.sim.agents[0][1].state = 6;
boarded.sim.agents[1][1].state = 6;
boarded.economy.wallets[0][1]--;
boarded.economy.households--;
boarded.economy.fares++;
boarded.economy.concessions++;
boarded.economy.operating += 6;
boarded.cash += 1 - 6;
assertRailAccountingStep(old, boarded);

const taxed = structuredClone(old);
taxed.economy.taxes += 3;
taxed.economy.firms[0][1] -= 3;
taxed.economy.businesses -= 3;
taxed.cash += 3;
assertRailAccountingStep(old, taxed);

const minted = structuredClone(boarded);
minted.cash++;
assert.throws(() => assertRailAccountingStep(old, minted), /Municipal change/);
const inventedArrival = structuredClone(boarded);
inventedArrival.economy.exports++;
assert.throws(() => assertRailAccountingStep(old, inventedArrival), /destination exports/);
const overcharged = structuredClone(boarded);
overcharged.economy.fares++;
assert.throws(() => assertRailAccountingStep(old, overcharged), /Each new rider/);
const wrongPayer = structuredClone(boarded);
wrongPayer.economy.wallets[0][1]++;
wrongPayer.economy.wallets[2][1]--;
assertMoney(wrongPayer); // Aggregate conservation alone cannot detect this error.
assert.throws(() => assertRailAccountingStep(old, wrongPayer), /Only newly boarded riders/);
const repeatedFare = structuredClone(boarded);
repeatedFare.economy.fares++;
assert.throws(() => assertRailAccountingStep(boarded, repeatedFare), /Each new rider/);
const missingConcession = structuredClone(boarded);
missingConcession.economy.concessions--;
assert.throws(() => assertRailAccountingStep(old, missingConcession), /explicit concessions/);
const starved = withoutTreasury(boarded);
assert.equal(starved.cash, 0);
assert.equal(starved.economy.withdrawn - boarded.economy.withdrawn, boarded.cash);
assertMoney(starved);
assert.equal(old.cash, 100);
assert.equal(boarded.cash, 95);
console.log('PASS rail accounting oracle: unchanged balance, fares, concessions, tax settlement, no phantom revenue, correct payer, no double charge, balanced funding-starvation fixture');
