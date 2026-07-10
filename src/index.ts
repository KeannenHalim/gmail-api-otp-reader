import { GmailAuth } from "./auth/GmailAuth.js";
import { OtpWatcher } from "./gmail/OtpWatcher.js";

async function main() {
    const gmailAuth = new GmailAuth();

    const gmail = await gmailAuth.getClient();

    const watcher =
        new OtpWatcher(gmail);

    const otp =
        await watcher.waitForOtp(
            "example@mail.com"
        );

    console.log("OTP:", otp);
}

main().catch(console.error);