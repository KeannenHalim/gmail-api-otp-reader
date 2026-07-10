import { promises as fs } from "fs";
import path from "path";
import { load } from "cheerio";
import type { gmail_v1 } from "googleapis";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export class OtpWatcher {
    private readonly lastIdFile = path.join(
        process.cwd(),
        "src",
        "data",
        "last-message-id.txt"
    );

    constructor(
        private readonly gmail: gmail_v1.Gmail
    ) { }

    private async saveLastMessageId(
        messageId: string
    ): Promise<void> {
        await fs.writeFile(
            this.lastIdFile,
            messageId,
            "utf-8"
        );
    }

    private async loadLastMessageId(): Promise<string | null> {
        try {
            return (
                await fs.readFile(
                    this.lastIdFile,
                    "utf-8"
                )
            ).trim();
        } catch {
            return null;
        }
    }

    private decodeBase64(
        data?: string | null
    ): string {
        if (!data) {
            return "";
        }

        return Buffer.from(
            data,
            "base64url"
        ).toString("utf8");
    }

    private extractBody(
        payload?: gmail_v1.Schema$MessagePart
    ): string {
        if (!payload) {
            return "";
        }

        if (payload.parts?.length) {
            for (const part of payload.parts) {
                if (
                    part.mimeType === "text/plain"
                ) {
                    return this.decodeBase64(
                        part.body?.data
                    );
                }

                if (
                    part.mimeType === "text/html"
                ) {
                    return this.decodeBase64(
                        part.body?.data
                    );
                }

                const nested =
                    this.extractBody(part);

                if (nested) {
                    return nested;
                }
            }
        }

        return this.decodeBase64(
            payload.body?.data
        );
    }

    async getLatestOtp(
        wantedTo?: string
    ): Promise<string | null> {
        const query = [
            "from:no-reply@mekari.com",
            'subject:"Sign-In Verification Code"',
            "newer_than:1d",
        ].join(" ");

        const result =
            await this.gmail.users.messages.list({
                userId: "me",
                q: query,
            });

        const messages =
            result.data.messages ?? [];

        if (messages.length === 0) {
            return null;
        }

        const candidates:
            gmail_v1.Schema$Message[] = [];

        for (const message of messages) {
            if (!message.id) {
                continue;
            }

            const response =
                await this.gmail.users.messages.get({
                    userId: "me",
                    id: message.id,
                    format: "metadata",
                    metadataHeaders: [
                        "To",
                        "Delivered-To",
                    ],
                });

            const msg = response.data;

            const headers =
                Object.fromEntries(
                    (msg.payload?.headers ?? []).map(
                        (h) => [
                            h.name ?? "",
                            h.value ?? "",
                        ]
                    )
                );

            const to =
                headers["Delivered-To"] ??
                headers["To"];

            if (
                !wantedTo ||
                to === wantedTo
            ) {
                candidates.push(msg);
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort(
            (a, b) =>
                Number(
                    b.internalDate ?? 0
                ) -
                Number(
                    a.internalDate ?? 0
                )
        );

        const newest =
            candidates[0];

        if (
            !newest ||
            !newest.id ||
            !newest.internalDate
        ) {
            return null;
        }

        const receivedAt = Number(
            newest.internalDate
        );

        if (
            Date.now() - receivedAt >
            FIVE_MINUTES_MS
        ) {
            return null;
        }

        const lastId =
            await this.loadLastMessageId();

        if (lastId === newest.id) {
            return null;
        }

        const fullMessage =
            await this.gmail.users.messages.get({
                userId: "me",
                id: newest.id,
                format: "full",
            });

        const body =
            this.extractBody(
                fullMessage.data.payload
            );

        const $ = load(body);
        const text = $.text();

        const otp =
            text.match(
                /OTP.*?(\d{6})/is
            );

        if (!otp?.[1]) {
            return null;
        }

        await this.saveLastMessageId(
            newest.id
        );

        return otp[1];
    }

    async waitForOtp(
        wantedTo?: string,
        intervalMs = 3000
    ): Promise<string> {
        while (true) {
            const otp =
                await this.getLatestOtp(
                    wantedTo
                );

            if (otp) {
                return otp;
            }

            console.log(
                "Waiting for OTP..."
            );

            await new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        intervalMs
                    )
            );
        }
    }
}