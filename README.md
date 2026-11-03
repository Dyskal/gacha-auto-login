<h1 align="center">Gacha Auto Login</h1>

<p align="center">
  A lightweight, concurrent, multi-account, one-shot automation script for daily gacha game check-ins (HoYoLAB & Skport). Built for Bun, local cron, and GitHub Actions.
</p>

---

## Supported Games

The script automatically detects the provider and resolves aliases, casing, spaces, and hyphens:

| Provider    | Game                    | Accepted Aliases                               | Required Credentials            |
|:------------|:------------------------|:-----------------------------------------------|:--------------------------------|
| **HoYoLAB** | **Genshin Impact**      | `genshin`, `gi`, `genshin-impact`              | `cookie`                        |
| **HoYoLAB** | **Honkai: Star Rail**   | `hsr`, `starrail`, `honkai-star-rail`, `hkrpg` | `cookie`                        |
| **HoYoLAB** | **Zenless Zone Zero**   | `zzz`, `zenless`, `zenless-zone-zero`          | `cookie`                        |
| **HoYoLAB** | **Honkai Impact 3rd**   | `hi3`, `honkai`, `honkai3rd`, `bh3`            | `cookie`                        |
| **HoYoLAB** | **Tears of Themis**     | `tot`, `themis`, `tears-of-themis`, `nxx`      | `cookie`                        |
| **Skport**  | **Arknights: Endfield** | `endfield`, `arknights`                        | `account_token`, `sk_game_role` |

---

## Key Features

- **Concurrent Execution**: Executes all accounts and independent API requests in parallel via `Promise.allSettled()`. Total runtime is bounded by the slowest single network roundtrip (~1–2 seconds).
- **Auto-Resolution & Aliases**: Write `hsr`, `starrail`, or `Honkai Star Rail`; the script maps them to the canonical game and network provider automatically.
- **Dynamic Localization**: Automatically detects your account language (such as `fr-fr` or `en-us`) from your cookie and environment, adapting status labels and API responses.
- **Resilient HTTP**: Built-in exponential backoff and request timeouts (30s) against transient 5xx errors or network drops.
- **Zero Heavy Dependencies**: Runs directly on [Bun](https://bun.sh/) with native crypto, HTTP keep-alive, and standalone binary compilation.
- **CI & Stateless Ready**: Reads configuration directly from the `CONFIG_JSON` environment variable without requiring disk I/O in CI runners.

---

## Deployment (GitHub Actions)

Run daily for free without keeping your computer on:

1. **Fork this repository**.
2. Go to **Settings > Secrets and variables > Actions** in your fork.
3. Add a new Repository Secret named `CONFIG_JSON` with your complete `config.json` text as its value.
4. Go to the **Actions** tab and enable workflows.
5. The check-in runs daily at 16:00 UTC (configurable in `.github/workflows/cron.yaml`) and can be triggered manually via `workflow_dispatch`.

---

## Local Setup

### Prerequisites

- [Bun](https://bun.sh/) (v1.4+)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Dyskal/gacha-auto-login.git
cd gacha-auto-login

# Install dependencies
bun install

# Initialize configuration
cp example.config.json config.json

# Run check-in
bun run start
```

---

## Configuration

Place your accounts in `config.json` (or pass as `CONFIG_JSON` environment variable):

```json
{
  "accounts": [
    {
      "name": "My Account",
      "game": "hsr",
      "credentials": {
        "cookie": "ltoken_v2=v2_...; ltuid_v2=...; mi18nLang=fr-fr;"
      }
    },
    {
      "name": "My Other Account",
      "game": "endfield",
      "credentials": {
        "account_token": "YOUR_GRYPHLINE_ACCOUNT_TOKEN",
        "sk_game_role": "3_YOUR_UID_3"
      }
    }
  ]
}
```

---

## Obtaining Credentials

### HoYoLAB Games (Genshin, Star Rail, ZZZ, HI3, Tears of Themis)

1. Open a browser and log into [HoYoLAB](https://www.hoyolab.com/).
2. Open Developer Tools (<kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>) and go to the **Application** (or **Storage**) tab.
3. Select **Cookies** > `https://www.hoyolab.com`.
4. Copy the values of `ltoken_v2` and `ltuid_v2` (or copy the entire cookie header string).
5. Paste into `credentials.cookie`.

> **Note**: For check-ins, `ltoken_v2` and `ltuid_v2` are the only mandatory tokens.

### Skport / Gryphline (Endfield)

1. Log in to the [SKPort Endfield Portal](https://game.skport.com/endfield/sign-in).
2. Open Developer Tools (<kbd>F12</kbd>) > **Application** > **Cookies** > `https://game.skport.com`.
3. Locate `ACCOUNT_TOKEN` and copy its value. URL-decode if necessary (replace `%2F` with `/`).
4. To find `sk_game_role`: inspect any authenticated request payload in the **Network** tab, or copy your role ID from your portal URL/profile (formatted like `3_<UID>_<SERVER>`).
5. Add both under `credentials.account_token` and `credentials.sk_game_role`.

---

## Environment Variables

| Variable      | Description                                                             | Default |
|:--------------|:------------------------------------------------------------------------|:--------|
| `CONFIG_JSON` | Raw JSON string of the configuration (overrides `config.json` on disk). | *None*  |
| `LOG_LEVEL`   | Log verbosity filter (`error`, `warn`, `info`, `debug`).                | `info`  |

---

## Available Commands

| Command         | Action                                                            |
|:----------------|:------------------------------------------------------------------|
| `bun run start` | Run all daily check-ins once and exit.                            |
| `bun run dev`   | Watch mode for development.                                       |
| `bun run check` | Run TypeScript strict type verification (`tsc --noEmit`).         |
| `bun run build` | Compile a minified, standalone native binary (`dist/gacha-auto`). |

---

## Disclaimer

This is an unofficial, community-maintained tool. It is not affiliated with, endorsed by, or associated with HoYoverse, Cognosphere, Hypergryph, or Gryphline. Use at your own discretion.
