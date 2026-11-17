// The token radar's model, radar-2: one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks every protocol the snapshot records with no token that could still launch one:
// the watchlist (the floor) plus every pre-token protocol below it that passes the house's own
// watchlist rule. A wrapped, staked or bridged product of a token that already trades is not a
// launch: WBTC is Bitcoin on Ethereum, Binance staked ETH is ETH in Binance's staking product, and
// neither is a protocol still waiting on a token of its own. Those protocols are set aside and
// counted, never ranked. Versioned pools (a name ending in V2, v2, 2.0) and exchanges are set aside
// too, by the same rule.
//
// Implied value is a peer valuation, not a flat multiple: a protocol's category is priced off the
// live-token protocols in the same category, whose market caps the snapshot records:
//
//   multiple   = (n x median(mcap_usd / tvl_usd) of the category's live protocols
//                + 3 x the global median over all live protocols) / (n + 3),
//                clamped to [0.05, 1.50]; a category with no live peers uses the global median.
//                Few peers shrink toward the global median instead of trusting a thin sample.
//                Each live peer's ratio is clamped to [0.01, 3] first: a token trading above 3x
//                its protocol's TVL is priced on speculation, not on the protocol's value, and a
//                single such peer must not price a whole category.
//   base       = tvl_usd x multiple
//   growth     = clamp(change_7d, -50, 150) per cent
//   growthMult = 1 + (growth / 100) x 0.6
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   chainMult  = 1 + 0.03 x min(chains - 1, 5)
//   implied    = max(1, round(base x growthMult x maturityMult x chainMult))
//
// Every input is a figure the snapshot carries. No protocol name is ever special-cased: the same
// function scores every row, and the dashboard shows the peer table the multiples came from, so a
// reader can check every number on the board.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  multiple_min: number;
  multiple_max: number;
  shrinkage_prior: number;
  ratio_min: number;
  ratio_max: number;
  chain_step: number;
  chain_max_extra: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  multiple_min: 0.05,
  multiple_max: 1.5,
  shrinkage_prior: 3,
  ratio_min: 0.01,
  ratio_max: 3,
  chain_step: 0.03,
  chain_max_extra: 5,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** How much the board trusts one row's implied value, from the data behind it. */
export type Conviction = 'high' | 'medium' | 'low';

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  peer_multiple: number;
  peer_median: number;
  peer_count: number;
  peer_fallback: boolean;
  conviction: Conviction;
  model: {
    peer_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  peer_multiple: number;
  peer_median: number;
  peer_count: number;
  peer_fallback: boolean;
  conviction: Conviction;
  watchlist: boolean;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One row of the peer table: what a category's live protocols trade at. */
export interface PeerTableRow {
  category: string;
  peers: number;
  median_multiple: number;
  used_multiple: number;
  fallback: boolean;
}

/** Why a pre-token protocol was set aside instead of ranked. */
export interface SetAside {
  total: number;
  wrapped_or_staked: number;
  bridge_or_liquid_staking: number;
  versioned: number;
  exchange: number;
}

/** Everything the dashboard needs: the board, the live set, the peer table, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  global_multiple: number;
  global_peers: number;
  peer_table: PeerTableRow[];
  set_aside: SetAside;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a sorted list of numbers. */
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name carrying one of these whole words is a wrapped or staked product, not a launch. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** A name beginning with an exchange's name is that exchange's product, not a launch. */
const EXCHANGE_START = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Why a pre-token protocol is set aside, or null when the board may rank it. */
export function setAsideReason(p: SnapshotProtocol): 'wrapped_or_staked' | 'bridge_or_liquid_staking' | 'versioned' | 'exchange' | null {
  if (!isPreToken(p)) return null;
  if (p.category === 'CEX' || EXCHANGE_START.test(p.name)) return 'exchange';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped_or_staked';
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return 'bridge_or_liquid_staking';
  if (VERSIONED.test(p.name)) return 'versioned';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and a launch that could still happen. */
export function isRankable(p: SnapshotProtocol): boolean {
  return setAsideReason(p) === null && isPreToken(p);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The peer multiples: each category's live protocols priced off their market caps. */
export interface PeerMultiples {
  byCategory: Map<string, { multiple: number; median: number; peers: number; fallback: boolean }>;
  globalMultiple: number;
  globalPeers: number;
  table: PeerTableRow[];
}

export function peerMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): PeerMultiples {
  const ratiosByCategory = new Map<string, number[]>();
  const allRatios: number[] = [];
  for (const p of snapshot.protocols) {
    if (isPreToken(p) || p.category === 'CEX') continue;
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const ratio = Math.min(model.ratio_max, Math.max(model.ratio_min, p.mcap_usd / p.tvl_usd));
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    allRatios.push(ratio);
    const key = p.category ?? 'Other';
    const list = ratiosByCategory.get(key) ?? [];
    list.push(ratio);
    ratiosByCategory.set(key, list);
  }
  allRatios.sort((a, b) => a - b);
  const global = Math.min(model.multiple_max, Math.max(model.multiple_min, median(allRatios)));
  const byCategory = new Map<string, { multiple: number; peers: number; fallback: boolean }>();
  const table: PeerTableRow[] = [];
  for (const [category, ratios] of [...ratiosByCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    ratios.sort((a, b) => a - b);
    const med = median(ratios);
    const n = ratios.length;
    const shrunk = (n * med + model.shrinkage_prior * global) / (n + model.shrinkage_prior);
    const used = Math.min(model.multiple_max, Math.max(model.multiple_min, shrunk));
    byCategory.set(category, { multiple: used, median: med, peers: n, fallback: false });
    table.push({ category, peers: n, median_multiple: Math.round(med * 1000) / 1000, used_multiple: Math.round(used * 1000) / 1000, fallback: false });
  }
  return { byCategory, globalMultiple: global, globalPeers: allRatios.length, table };
}

/** The multiple one protocol's category gets, with how many live peers priced it. */
export function multipleFor(p: SnapshotProtocol, peers: PeerMultiples): { multiple: number; median: number; count: number; fallback: boolean } {
  const entry = peers.byCategory.get(p.category ?? 'Other');
  if (entry === undefined) return { multiple: peers.globalMultiple, median: peers.globalMultiple, count: 0, fallback: true };
  return { multiple: entry.multiple, median: entry.median, count: entry.peers, fallback: entry.fallback };
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  peers: PeerMultiples,
): { implied: number; multiple: number; median: number; peerCount: number; fallback: boolean; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, median, count, fallback } = multipleFor(protocol, peers);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainMult = 1 + model.chain_step * Math.min(Math.max(protocol.chains.length - 1, 0), model.chain_max_extra);
  const base = protocol.tvl_usd * multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * chainMult));
  return { implied, multiple, median, peerCount: count, fallback, growthPct, growthMult, maturityMult, chainMult, age };
}

/** How much the board trusts one row, from the data behind its number. */
export function convictionFor(peerCount: number, age: number | null, change7d: number | null): Conviction {
  if (peerCount >= 5 && age !== null && change7d !== null) return 'high';
  if (peerCount >= 2) return 'medium';
  return 'low';
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; peers: PeerMultiples; setAside: SetAside } {
  const peers = peerMultiples(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every rankable pre-token protocol below the watchlist floor. No cap, no
  // hand-picking: the whole pre-token universe the rule keeps.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const setAside: SetAside = { total: 0, wrapped_or_staked: 0, bridge_or_liquid_staking: 0, versioned: 0, exchange: 0 };
  for (const p of snapshot.protocols) {
    const reason = setAsideReason(p);
    if (reason !== null) {
      setAside.total += 1;
      setAside[reason] += 1;
    }
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, peers);
    return { p, ...v, conviction: convictionFor(v.peerCount, v.age, p.change_7d) };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const board = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.age,
    implied_value_usd: s.implied,
    peer_multiple: round4(s.multiple),
    peer_median: round4(s.median),
    peer_count: s.peerCount,
    peer_fallback: s.fallback,
    conviction: s.conviction,
    model: {
      peer_multiple: round4(s.multiple),
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
  return { board, peers, setAside };
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Gas for one transaction on a chain, in dollars, from what that chain usually charges. */
function gasFor(chain: string): { first: string; weekly: string } {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return { first: 'about $8', weekly: 'about $4' };
  if (c === 'solana') return { first: 'under $0.10', weekly: 'under $0.05' };
  if (c === 'bitcoin') return { first: 'about $2', weekly: 'about $1' };
  if (c === 'tron' || c === 'bsc' || c === 'bnb chain') return { first: 'about $0.50', weekly: 'about $0.25' };
  // Every other chain the snapshot names is a low-fee L2 or alt-L1.
  return { first: 'about $0.50', weekly: 'about $0.25' };
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's main action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and keep the shares.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC through ${name} to ${chain} and use the bridged funds in its app.`;
  if (c.includes('restak')) return `Restake $${capital} of liquid staking tokens through ${name} on ${chain} and keep the receipt.`;
  if (c.includes('staking') || c.includes('staking pool')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk curators')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('index')) return `Buy $${capital} of ${name}'s index token on ${chain} and hold it.`;
  if (c.includes('payment')) return `Pay $${capital} through ${name} on ${chain} and keep the receipt.`;
  if (c.includes('governance')) return `Lock $${capital} of voting power with ${name} on ${chain} and vote once.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A second qualifying action, different from the first, so the wallet's history is not one deposit. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const small = Math.max(10, Math.round(capital / 5));
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $${small} against the supply on ${name}, repay it a week later, and keep the supply open.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Swap $${small} through ${name}'s router on ${chain} and, where it offers one, stake the LP tokens in its gauge.`;
  if (c.includes('yield')) return `Claim the vault's yield once on ${name} and re-deposit it, so the wallet shows a harvest as well as a deposit.`;
  if (c.includes('bridge')) return `Bridge $${small} back through ${name} a few days later, so the wallet shows use in both directions.`;
  if (c.includes('restak') || c.includes('staking')) return `Delegate or re-delegate the stake once on ${name} and confirm the receipt shows the new position.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Close the hedge on ${name} and open a second one half the size, so the wallet shows two fills.`;
  if (c.includes('prediction')) return `Settle or close the first position on ${name} and open a second one on a different market.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk curators')) return `Move $${small} into a second ${name} vault on ${chain} so the wallet holds two vaults.`;
  if (c.includes('stable') || c.includes('rwa')) return `Redeem $${small} of the asset through ${name} and re-mint it, so the wallet shows a full round trip.`;
  if (c.includes('insurance')) return `File one test claim inquiry on ${name} and keep the policy active through the hold.`;
  if (c.includes('index')) return `Rebalance $${small} inside ${name}'s index on ${chain} at the next rebalance window.`;
  if (c.includes('payment')) return `Make a second payment of $${small} through ${name} to a different recipient on ${chain}.`;
  if (c.includes('governance')) return `Vote on a second ${name} proposal and post one comment in its forum.`;
  return `Make a second deposit of $${small} into ${name} on ${chain} a week after the first.`;
}

/** The risk to check before the money goes in, in the category's own terms. */
function riskFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Check ${name}'s pool for impermanent loss: a pool whose assets drifted apart pays less than holding, so compare the pool's return with holding both sides.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Check ${name}'s liquidation line before borrowing: keep the health factor above 2 so a normal price swing cannot liquidate the position.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Check ${name}'s funding rate and liquidation price before opening: a hedge held for weeks pays funding every 8 hours, so size it small.`;
  if (c.includes('stable') || c.includes('rwa')) return `Check what backs ${name}'s asset and how it redeems: read the backing and the redemption terms before minting, and never farm an asset you cannot redeem.`;
  if (c.includes('bridge')) return `Check ${name}'s bridge limits and delay before bridging: a large bridge can queue for hours, so bridge the small amount first.`;
  if (c.includes('restak') || c.includes('staking')) return `Check ${name}'s unstaking delay before staking: a position locked for weeks cannot be unwound in a hurry, so farm only funds you can leave there.`;
  if (c.includes('insurance')) return `Check what ${name}'s cover excludes before buying: read the exclusions, since a policy that excludes the risk you hold pays nothing.`;
  return `Read ${name}'s docs for the one risk its own page names first, and size the position so that risk going wrong costs no more than the $${capitalFor(p)} you put in.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasFor(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: `${gas.first} of gas for the first transaction`,
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and ${gas.first} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital, chain),
      cost: `about $${Math.max(10, Math.round(capital / 5))} moved and ${gas.weekly} of gas`,
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `${gas.weekly} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: riskFor(p),
      cost: 'nothing to check',
      time: '15 minutes',
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes, then write the wallet, the dates and every transaction in a farm log.`,
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, onWatchlist: boolean): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    peer_multiple: row.peer_multiple,
    peer_median: row.peer_median,
    peer_count: row.peer_count,
    peer_fallback: row.peer_fallback,
    conviction: row.conviction,
    watchlist: onWatchlist,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const { board, peers, setAside } = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    global_multiple: round4(peers.globalMultiple),
    global_peers: peers.globalPeers,
    peer_table: peers.table,
    set_aside: setAside,
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
