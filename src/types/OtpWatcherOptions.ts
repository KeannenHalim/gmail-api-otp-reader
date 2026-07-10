export interface OtpWatcherOptions {
    query: string;
    otpRegex?: RegExp;
    otpExpiryMs?: number;
}