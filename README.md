# OTP Reader

A TypeScript-based utility for automatically retrieving OTP (One-Time Password) codes from Gmail.

This project is designed to help developers automate authentication flows and end-to-end testing environments where email-based OTP verification is required.

## Features

* Retrieve OTP emails from Gmail automatically
* Authenticate with Gmail API using OAuth 2.0
* Persist OAuth token to avoid repeated authorization
* Filter emails using configurable Gmail search queries
* Support recipient-based filtering for multiple accounts/aliases
* Extract OTP codes using configurable regular expressions
* Separate OTP logic from provider-specific configuration
* Designed for automated testing environments

## Use Cases

This tool can be used for:

* End-to-end (E2E) testing
* Automated login testing
* QA automation requiring email verification
* Developer testing environments
* Internal tools requiring Gmail OTP retrieval

## Tech Stack

* Node.js
* TypeScript
* Gmail API
* Google OAuth 2.0
* Cheerio (HTML email parsing)

## Prerequisites

Before running this project, make sure you have:

* Node.js installed
* pnpm installed
* A Google account with Gmail API access enabled

## Installation

Clone the repository:

```bash
git clone git@github.com:KeannenHalim/gmail-api-otp-reader.git or git clone https://github.com/KeannenHalim/gmail-api-otp-reader.git
cd otp-reader
```

Install dependencies:

```bash
pnpm install
```

## Google OAuth Setup

This project uses Gmail API with OAuth 2.0 authentication.

### 1. Enable Gmail API

Go to Google Cloud Console:

https://console.cloud.google.com/

Enable:

```text
Gmail API
```

### 2. Create OAuth Credentials

Create an OAuth Client:

* Application type: Desktop App
* Download the client secret JSON file

Place the file here:

```text
src/
└── credentials/
    └── client_secret.json
```

> Do not commit `client_secret.json`. It contains sensitive OAuth credentials.

The application will generate an OAuth token after the first successful authentication.

## Configuration

OTP retrieval rules are separated from the watcher implementation.

Configuration example:

```text
src/
└── config/
    └── example.otp.config.ts
```

Example:

```ts
export const otpConfig = {
    query: [
        "from:no-reply@example.com",
        'subject:"Sign-In Verification Code"',
        "newer_than:1d"
    ].join(" "),

    otpRegex: /OTP.*?(\d{6})/is,

    otpExpiryMs: 5 * 60 * 1000
};
```

### Configuration Options

| Option        | Description                                |
| ------------- | ------------------------------------------ |
| `query`       | Gmail search query used to find OTP emails |
| `otpRegex`    | Regex pattern used to extract the OTP code |
| `otpExpiryMs` | Maximum allowed age of an OTP email        |

This allows changing OTP providers without modifying the core watcher logic.

Example:

```ts
export const anotherOtpConfig = {
    query: [
        "from:noreply@company.com",
        'subject:"Your verification code"',
        "newer_than:1d"
    ].join(" "),

    otpRegex: /code[:\s]+(\d{6})/i
};
```

## Project Structure

```text
otp-reader/
├── src
│   ├── auth
│   │   └── GmailAuth.ts
│   │
│   ├── config
│   │   └── example.otp.config.ts
│   │
│   ├── credentials
│   │   └── client_secret.json
│   │
│   ├── data
│   │   └── last-message-id.txt
│   │
│   ├── services
│   │   └── OtpWatcher.ts
│   │
│   ├── types
│   │   ├── OAuthClient.ts
│   │   └── OtpWatcherOptions.ts
│   │
│   └── index.ts
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

## Running the Project

Development mode:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Run compiled output:

```bash
pnpm start
```

## Authentication Flow

The authentication process works as follows:

1. Application starts OAuth flow
2. Browser opens Google authorization page
3. User grants Gmail access permission
4. OAuth access token and refresh token are generated
5. Token is reused for future executions

## Example Usage

```ts
const watcher = new OtpWatcher(
    gmail,
    otpConfig
);

const otp = await watcher.waitForOtp(
    "user+app1@example.com"
);

console.log(otp);
```

## Gmail Query Examples

The query option supports Gmail search syntax.

Examples:

```text
from:no-reply@example.com
```

```text
subject:"Sign-In Verification Code"
```

```text
newer_than:1d
```

Useful Gmail operators:

| Operator      | Example                     |
| ------------- | --------------------------- |
| `from:`       | `from:no-reply@example.com` |
| `subject:`    | `subject:"OTP Code"`        |
| `to:`         | `to:user@example.com`       |
| `newer_than:` | `newer_than:1d`             |
| `after:`      | `after:2026/01/01`          |

## Security Notes

Never commit sensitive files:

```text
src/credentials/client_secret.json
token.json
.env
```

Make sure they are included in `.gitignore`.

Example:

```gitignore
src/credentials/client_secret.json
token.json
.env
```
