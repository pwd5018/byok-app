import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    throw new Error("Missing ENCRYPTION_KEY");
}

const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

export function encryptApiKey(value: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
        encryptedKey: encrypted.toString("base64"),
        keyIv: iv.toString("base64"),
        keyTag: tag.toString("base64"),
    };
}

export function decryptApiKey(input: {
    encryptedKey: string;
    keyIv: string;
    keyTag: string;
}) {
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(input.keyIv, "base64")
    );

    decipher.setAuthTag(Buffer.from(input.keyTag, "base64"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(input.encryptedKey, "base64")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

export function maskApiKey(value: string) {
    if (value.length <= 8) return "••••••••";
    return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}