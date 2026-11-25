import { LAMPORTS_PER_SOL, runBot, type BuyInput } from './vendor/makefun-bot.ts';
const stake = LAMPORTS_PER_SOL / 20n;
const minimum = LAMPORTS_PER_SOL / 200n;
const seen = new Set<string>();
await runBot({
  onBatch(state, batch) {
    const orders: BuyInput[] = [];
    let free = state.freeCashLamports();
    let slots = state.hello.caps.max_open_positions - state.committedPositionCount();
    for (const event of batch.events) {
      if (event.event === 'CreateEvent') seen.add(event.mint);
      if (!seen.has(event.mint)) continue;
      const curve = state.curves.get(event.mint);
      if (!curve || curve.complete) { seen.delete(event.mint); continue; }
      const cap = state.maxBuyLamports(event.mint);
      if (cap < minimum) continue;
      seen.delete(event.mint);
      const amount = cap < stake ? cap : stake;
      const tx = state.txFeeLamports();
      if (orders.length >= state.hello.caps.max_orders_per_batch || slots <= 0 || free < amount + tx) continue;
      orders.push({ side: 'buy', mint: event.mint, quote_lamports: amount, max_slippage_bps: 10_000 });
      free -= amount + tx;
      slots--;
    }
    return orders;
  },
});
