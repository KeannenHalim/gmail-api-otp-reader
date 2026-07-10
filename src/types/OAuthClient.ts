import type { google } from "googleapis";

export type OAuthClient = InstanceType<typeof google.auth.OAuth2>;