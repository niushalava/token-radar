# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/niushalava/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/niushalava/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for make.fun's token-radar-01 bounty. It ranks 198 pre-token protocols by an implied value priced off their own category's live-token peers (median market-cap-to-TVL, shrunk toward the global median), and gives each one a concrete seven-step farm plan with costs and times. The board covers the full 40-protocol watchlist plus every rankable pre-token protocol below it; wrapped, staked and bridged products of tokens that already trade are set aside, never ranked. Static dashboard, no network, Node 22 standard library only.

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input snapshot.json
```

Reads a DefiLlama protocol snapshot and writes `board.json`, `data.js`, the static `dashboard/`, `screenshots/` and `dossier.json` to the output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3gb94rxd&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
