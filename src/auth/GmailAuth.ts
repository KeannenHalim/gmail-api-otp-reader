import { google } from "googleapis";
import { promises as fs } from "fs";
import * as path from "path";
import open from "open";
import http from "http";
import { URL } from "url";

import type { OAuthClient } from "../types/OAuthClient.js"

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

const CREDENTIALS_PATH = path.join(process.cwd(), "src", "credentials","client_secret.json");
const TOKEN_PATH = path.join(process.cwd(), "src","data", "token.json");

interface InstalledCredentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

export class GmailAuth {
  private auth!: OAuthClient;

  private async authorize(): Promise<OAuthClient> {
    // Try existing token first
    try {
      const token = await fs.readFile(TOKEN_PATH, "utf8");
      const credentials = JSON.parse(
        await fs.readFile(CREDENTIALS_PATH, "utf8")
      ) as InstalledCredentials;

      const { client_id, client_secret, redirect_uris } =
        credentials.installed;

      this.auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      this.auth.on("tokens", async () => {
        await fs.mkdir(path.dirname(TOKEN_PATH), {
          recursive: true,
        });

        await fs.writeFile(
          TOKEN_PATH,
          JSON.stringify(
            this.auth.credentials,
            null,
            2
          )
        );
      });

      this.auth.setCredentials(JSON.parse(token));

      return this.auth;
    } catch {
      // No token, continue with login
    }

    return this.login();
  }

  private async login(): Promise<OAuthClient> {
    const credentials = JSON.parse(
      await fs.readFile(CREDENTIALS_PATH, "utf8")
    ) as InstalledCredentials;

    const { client_id, client_secret } = credentials.installed;

    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (!req.url) {
            throw new Error("Missing request URL.");
          }

          const address = server.address();

          if (!address || typeof address === "string") {
            throw new Error("Unable to determine server address.");
          }

          const redirectUri = `http://localhost:${address.port}`;

          const url = new URL(req.url, redirectUri);

          // Desktop app callback is "/"
          if (url.pathname !== "/") {
            res.writeHead(404);
            res.end();
            return;
          }

          const code = url.searchParams.get("code");

          if (!code) {
            throw new Error("Authorization code not found.");
          }

          const { tokens } = await this.auth.getToken(code);

          this.auth.setCredentials(tokens);

          await fs.mkdir(path.dirname(TOKEN_PATH), {
            recursive: true,
          });

          await fs.writeFile(
            TOKEN_PATH,
            JSON.stringify(tokens, null, 2)
          );

          res.writeHead(200, {
            "Content-Type": "text/html",
          });

          res.end(`
          <h2>Authentication successful!</h2>
          <p>You can close this window.</p>
        `);

          server.close();
          resolve(this.auth);
        } catch (err) {
          server.close();
          reject(err);
        }
      });

      server.listen(0, async () => {
        try {
          const address = server.address();

          if (!address || typeof address === "string") {
            throw new Error("Unable to determine server port.");
          }

          const redirectUri = `http://localhost:${address.port}`;

          this.auth = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirectUri
          );

          const authUrl = this.auth.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: SCOPES,
          });

          console.log(`Listening on ${redirectUri}`);

          await open(authUrl);
        } catch (err) {
          server.close();
          reject(err);
        }
      });
    });
  }

  public async getClient() {
    const auth = await this.authorize();

    return google.gmail({
      version: "v1",
      auth,
    });
  }
}