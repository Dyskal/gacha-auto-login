<h1 align="center">Gacha Auto Login</h1>

<p align="center">
  A lightweight, provider-agnostic, multi-account, one-shot automation script for daily gacha game check-ins (e.g. Arknights, Endfield). Perfect for GitHub Actions or external cron jobs.
</p>

---

## Key Features

- **Provider Agnostic Architecture**: Easily extensible. Comes built-in with support for Gryphline / Skport.
- **One-Shot Execution**: Highly optimized script that executes daily sign-ins across all configured accounts in sequence and gracefully exits. No background processes or memory-hogging intervals.
- **Multi-Account & Multi-Game**: Check in to multiple different games across multiple different network providers from a single config.
- **GitHub Actions Ready**: Run it daily for free using GitHub workflows.

---

## Deployment (GitHub Actions)

The best way to run this script is via GitHub Actions so it runs automatically every day.

1. **Fork this repository.**
2. Go to your fork's **Settings > Secrets and variables > Actions**.
3. Create a new Repository Secret named `CONFIG_JSON` and paste your complete `config.json` contents into it.
4. Go to the **Actions** tab in your repository and enable workflows.
5. The script will now run automatically every day at 16:00 UTC. You can also trigger it manually from the Actions tab.

---

## Local Deployment / Testing

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)

### Setup

1. **Clone the Repository**:
   ```bash
   git clone <your-repo-url>
   cd gacha-auto-login
   bun install
   ```

2. **Initialize Configuration**:
   ```bash
   cp example.config.json config.json
   ```
   *Fill in your credentials in `config.json` before proceeding.*

3. **Run the Script**:
   ```bash
   bun run start
   ```

---

## Configuration

The `config.json` is the central brain of the assistant. You must specify the `game` and supply a `credentials` object. The `provider` will be inferred automatically for known games (like `arknights` or `endfield`).

```json
{
  "accounts": [
    {
      "name": "My Main Account",
      "game": "arknights",
      "credentials": {
        "account_token": "YOUR_ACCOUNT_TOKEN",
        "sk_game_role": "3_YOUR_UID_SERVER"
      }
    }
  ]
}
```

---

## Obtaining Skport Credentials (Gryphline)

To connect the assistant to your Skport account (Arknights / Endfield):

1. Log in to the [SKPort Endfield Portal](https://game.skport.com/endfield/sign-in).
2. Open **Developer Tools** (F12) -> **Application** -> **Cookies**.
3. Find `ACCOUNT_TOKEN` and copy its value.
4. URL decode if needed (replace `%2F` with `/`).
5. Add to config under `credentials` as `account_token`.

> **Note**: The account token is used to authenticate with Gryphline and obtain session credentials dynamically.

---

## Disclaimer

This is an unofficial tool and is not affiliated with any game developers or publishers (Hypergryph, Gryphline, Hoyoverse, Kuro Games, etc). Use of this tool may violate the terms of service. The authors are not responsible for any consequences of using this tool.