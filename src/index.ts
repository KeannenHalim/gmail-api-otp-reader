import { GmailAuth } from "./auth/GmailAuth.js";
import { exampleOtpConfig } from "./config/example.otp.config.js";
import { OtpWatcher } from "./services/OtpWatcher.js";

async function main() {
    const gmailAuth = new GmailAuth();

    const gmail = await gmailAuth.getClient();

    const watcher =
        new OtpWatcher(gmail, exampleOtpConfig);

    const otp =
        await watcher.waitForOtp(
            "example@mail.com"
        );

    console.log("OTP:", otp);
}

main().catch(console.error);