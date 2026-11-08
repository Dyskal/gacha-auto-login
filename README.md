<h1 align="center">Gacha Auto Login</h1>

<p align="center">
  A lightweight, concurrent, multi-account automation tool for daily gacha game check-ins (HoYoLAB & Skport). Supports one-shot execution and persistent daemon scheduling with Bun.
</p>

---

## Supported Games

The script automatically detects the provider and resolves aliases, casing, spaces, and hyphens:

| Provider    | Game                    | Accepted Aliases                               | Required Credentials            |
| :---------- | :---------------------- | :--------------------------------------------- | :------------------------------ |
| **HoYoLAB** | **Genshin Impact**      | `genshin`, `gi`, `genshin-impact`              | `cookie`                        |
| **HoYoLAB** | **Honkai: Star Rail**   | `hsr`, `starrail`, `honkai-star-rail`, `hkrpg` | `cookie`                        |
| **HoYoLAB** | **Zenless Zone Zero**   | `zzz`, `zenless`, `zenless-zone-zero`          | `cookie`                        |
| **HoYoLAB** | **Honkai Impact 3rd**   | `hi3`, `honkai`, `honkai3rd`, `bh3`            | `cookie`                        |
| **HoYoLAB** | **Tears of Themis**     | `tot`, `themis`, `tears-of-themis`, `nxx`      | `cookie`                        |
| **Skport**  | **Arknights: Endfield** | `endfield`, `arknights`                        | `account_token`, `sk_game_role` |

---

## Key Features

- **Concurrent Execution**: Executes all accounts and independent API requests in parallel via `Promise.allSettled()`. Total runtime is bounded by the slowest single network roundtrip (~1–2 seconds).
- **Persistent Cron Scheduling**: Native background daemon mode via `Bun.cron` with custom per-account schedules (evaluated in UTC).
- **Auto-Resolution & Aliases**: Write `hsr`, `starrail`, or `Honkai Star Rail`; the script maps them to the canonical game and network provider automatically.
- **Dynamic Localization**: Automatically detects your account language (such as `fr-fr` or `en-us`) from your cookie and environment, adapting status labels and API responses.
- **Resilient HTTP**: Built-in exponential backoff and request timeouts (30s) against transient 5xx errors or network drops.
- **Standalone Binaries**: Precompiled, zero-dependency standalone executables available for Linux, Windows, and macOS.

---

## Local Setup

### Prerequisites

- [Bun](https://bun.sh/) (v1.4+) or a precompiled standalone binary from [Releases](https://github.com/Dyskal/gacha-auto-login/releases).

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Dyskal/gacha-auto-login.git
cd gacha-auto-login

# Install dependencies
bun install

# Initialize configuration
cp example.config.json config.json

# Run check-in once
bun run start

# Or run persistently in daemon mode based on per-account cron schedules
bun run cron
```

---

## Configuration

Place your accounts in `config.json`:

```json
{
  "accounts": [
    {
      "name": "My Account",
      "game": "hsr",
      "cron": "0 16 * * *",
      "credentials": {
        "cookie": "ltoken_v2=v2_...; ltuid_v2=...; mi18nLang=fr-fr;"
      }
    },
    {
      "name": "My Other Account",
      "game": "endfield",
      "cron": "30 4 * * *",
      "credentials": {
        "account_token": "YOUR_GRYPHLINE_ACCOUNT_TOKEN",
        "sk_game_role": "3_YOUR_UID_3"
      }
    }
  ]
}
```

> **Note**: `name`, `game`, `cron`, and `credentials` are mandatory for each account. The `cron` field accepts standard 5-part cron syntax (`minute hour day month day-of-week`) evaluated in UTC and is validated on startup.

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

## Persistent Cron Mode

Run the binary or script as a persistent background daemon. Each account defines its own schedule via the `cron` field (evaluated in UTC):

```bash
# Run persistent daemon mode with Bun
bun run cron

# Or with a compiled standalone binary (e.g. Linux x64)
./dist/gacha-auto-linux-x64 --cron

# On Windows
.\dist\gacha-auto-windows-x64.exe --cron
```

Running without `-c` / `--cron` executes all accounts once and exits immediately (`0` on success, `1` if any check-in fails).

### CLI Options

| Option / Flag | Description                                                      |
| :------------ | :--------------------------------------------------------------- |
| `-c, --cron`  | Run in persistent daemon mode using per-account schedules (UTC). |
| `-h, --help`  | Display CLI usage and options.                                   |

---

## Docker Deployment

Multi-architecture images (`linux/amd64` and `linux/arm64`) are built on hardened distroless Chainguard images and published to GitHub Container Registry.

### Quick Start with Docker CLI

```bash
# Extract the configuration template from the image
docker run --rm ghcr.io/dyskal/gacha-auto-login:latest cat example.config.json > config.json

# Run persistently in daemon mode
docker run -d \
  --name gacha-auto \
  --restart unless-stopped \
  -v $(pwd)/config.json:/home/container/config.json:ro \
  ghcr.io/dyskal/gacha-auto-login:latest
```

### One-Shot Check-in via Docker

```bash
docker run --rm \
  -v $(pwd)/config.json:/home/container/config.json:ro \
  ghcr.io/dyskal/gacha-auto-login:latest gacha-auto
```

> **Tip**: You can mount your configuration anywhere and point to it with `-e CONFIG_PATH=/path/to/config.json`.

---

## Pterodactyl / Pelican Egg

The repository includes a ready-to-import egg for Pterodactyl and Pelican panels: `egg-gacha-auto-login.json`.

### Features

- Multi-arch support (`amd64` and `arm64`).
- Pre-seeds a starter `config.json` on installation.
- Configurable execution mode (`--cron` daemon or one-shot) via the `START_ARGS` variable.
- Supports automatic egg updates via `update_url`.

### Installation

1. Download [`egg-gacha-auto-login.json`](./egg-gacha-auto-login.json).
2. In Pterodactyl Panel, navigate to **Admin Panel** > **Nests** > select or create a nest, and click **Import Egg**.
3. Select `egg-gacha-auto-login.json`.
4. Create a new server using the **Gacha Auto Login** egg with image `ghcr.io/dyskal/gacha-auto-login:latest`.
5. Open the server's **File Manager**, edit the pre-provisioned `config.json` with your credentials, and start the server.

---

## Available Commands

| Command             | Action                                                                |
| :------------------ | :-------------------------------------------------------------------- |
| `bun run start`     | Run all daily check-ins once and exit.                                |
| `bun run cron`      | Run check-ins in persistent cron daemon mode (`bun index.ts --cron`). |
| `bun run typecheck` | Run TypeScript type verification via Bun's built-in type checker.     |
| `bun run build`     | Compile a standalone binary for the current host platform.            |

---

## Disclaimer

This is an unofficial, community-maintained tool. It is not affiliated with, endorsed by, or associated with HoYoverse, Cognosphere, Hypergryph, or Gryphline. Use at your own discretion.
