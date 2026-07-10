import type { OtpWatcherOptions } from "../types/OtpWatcherOptions.js";

export const exampleOtpConfig: OtpWatcherOptions = {
    query: [
        "from:no-reply@example.com",
        'subject:"Sign-In Verification Code"',
        "newer_than:1d",
    ].join(" "),

    otpRegex:
        /OTP.*?(\d{6})/is,

    otpExpiryMs:
        5 * 60 * 1000,
};