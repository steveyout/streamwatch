import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import forge from "node-forge";

type Keys = {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  seed: Uint8Array;
};

function uint8ArrayToBuffer(array: Uint8Array): forge.util.ByteStringBuffer {
  return forge.util.createBuffer(
    Array.from(array)
      .map((byte) => String.fromCharCode(byte))
      .join(""),
  );
}

async function seedFromMnemonic(mnemonic: string) {
  return pbkdf2Async(sha256, mnemonic, "mnemonic", {
    c: 2048,
    dkLen: 32,
  });
}

export function verifyValidMnemonic(mnemonic: string) {
  // First try to validate as BIP39 mnemonic
  if (validateMnemonic(mnemonic, wordlist)) {
    return true;
  }

  // If not a valid BIP39 mnemonic, check if it's a valid custom passphrase
  const validPassphraseRegex =
    /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=:;"'<>[\]{}|\\/`~]+$/;
  return mnemonic.length >= 8 && validPassphraseRegex.test(mnemonic);
}

export async function keysFromSeed(seed: Uint8Array): Promise<Keys> {
  const { privateKey, publicKey } = forge.pki.ed25519.generateKeyPair({
    seed,
  });

  return {
    privateKey: new Uint8Array(privateKey),
    publicKey: new Uint8Array(publicKey),
    seed,
  };
}

export async function keysFromMnemonic(mnemonic: string): Promise<Keys> {
  const seed = await seedFromMnemonic(mnemonic);

  return keysFromSeed(seed);
}

export function genMnemonic(): string {
  return generateMnemonic(wordlist);
}

export async function signCode(
  code: string,
  privateKey: Uint8Array,
): Promise<Uint8Array> {
  const signature = forge.pki.ed25519.sign({
    encoding: "utf8",
    message: code,
    privateKey: uint8ArrayToBuffer(privateKey),
  });
  return new Uint8Array(signature);
}

export function bytesToBase64(bytes: Uint8Array) {
  return forge.util.encode64(String.fromCodePoint(...bytes));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=+$/, "");
}

export async function signChallenge(keys: Keys, challengeCode: string) {
  const signature = await signCode(challengeCode, keys.privateKey);
  return bytesToBase64Url(signature);
}

export function base64ToBuffer(data: string) {
  return forge.util.binary.base64.decode(data);
}

export function base64ToStringBuffer(data: string) {
  const decoded = base64ToBuffer(data);

  return uint8ArrayToBuffer(decoded);
}

export function stringBufferToBase64(buffer: forge.util.ByteStringBuffer) {
  return forge.util.encode64(buffer.getBytes());
}

export async function encryptData(data: string, secret: Uint8Array) {
  if (secret.byteLength !== 32)
    throw new Error("Secret must be at least 256-bit");

  const iv = await new Promise<string>((resolve, reject) => {
    forge.random.getBytes(16, (err, bytes) => {
      if (err) reject(err);
      resolve(bytes);
    });
  });

  const cipher = forge.cipher.createCipher(
    "AES-GCM",
    uint8ArrayToBuffer(secret),
  );
  cipher.start({
    iv,
    tagLength: 128,
  });
  cipher.update(forge.util.createBuffer(data, "utf8"));
  cipher.finish();

  const encryptedData = cipher.output;
  const tag = cipher.mode.tag;

  return `${forge.util.encode64(iv)}.${stringBufferToBase64(
    encryptedData,
  )}.${stringBufferToBase64(tag)}` as const;
}

export function decryptData(data: string, secret: Uint8Array) {
  if (secret.byteLength !== 32) throw new Error("Secret must be 256-bit");

  const [iv, encryptedData, tag] = data.split(".");

  const decipher = forge.cipher.createDecipher(
    "AES-GCM",
    uint8ArrayToBuffer(secret),
  );
  decipher.start({
    iv: base64ToStringBuffer(iv),
    tag: base64ToStringBuffer(tag),
    tagLength: 128,
  });
  decipher.update(base64ToStringBuffer(encryptedData));
  const pass = decipher.finish();

  if (!pass) throw new Error("Error decrypting data");

  return decipher.output.toString();
}

// Passkey/WebAuthn utilities

export function isPasskeySupported(): boolean {
  // Passkeys require HTTPS
  const isSecureContext =
    typeof window !== "undefined" && window.location.protocol === "https:";

  return (
    isSecureContext &&
    typeof navigator !== "undefined" &&
    "credentials" in navigator &&
    "create" in navigator.credentials &&
    "get" in navigator.credentials &&
    typeof PublicKeyCredential !== "undefined"
  );
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  if (typeof base64Url !== "string") {
    throw new Error(
      `Invalid credential ID: expected string, got ${typeof base64Url}`,
    );
  }
  // Convert base64url to base64
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface PasskeyCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse;
}

export interface PasskeyAssertion {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAssertionResponse;
}

export async function createPasskey(
  userId: string,
  userName: string,
): Promise<PasskeyCredential> {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys are not supported in this browser");
  }

  // Generate a random user ID (8 bytes)
  const userIdBuffer = new Uint8Array(8);
  crypto.getRandomValues(userIdBuffer);

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
    {
      challenge,
      rp: {
        name: "P-Stream",
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Failed to create passkey");
    }

    return {
      id: credential.id,
      rawId: credential.rawId,
      response: credential.response as AuthenticatorAttestationResponse,
    };
  } catch (error) {
    throw new Error(
      `Failed to create passkey: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function authenticatePasskey(
  credentialId?: string,
): Promise<PasskeyAssertion> {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys are not supported in this browser");
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const allowCredentials: PublicKeyCredentialDescriptor[] | undefined =
    credentialId && typeof credentialId === "string" && credentialId.length > 0
      ? [
          {
            id: base64UrlToArrayBuffer(credentialId),
            type: "public-key",
          },
        ]
      : undefined;

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: "preferred",
    allowCredentials,
    rpId: window.location.hostname,
  };

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error("Failed to authenticate with passkey");
    }

    return {
      id: assertion.id,
      rawId: assertion.rawId,
      response: assertion.response as AuthenticatorAssertionResponse,
    };
  } catch (error) {
    throw new Error(
      `Failed to authenticate with passkey: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function seedFromCredentialId(credentialId: string): Promise<Uint8Array> {
  // Hash credential ID the same way we hash mnemonics
  return pbkdf2Async(sha256, credentialId, "mnemonic", {
    c: 2048,
    dkLen: 32,
  });
}

export async function keysFromCredentialId(
  credentialId: string,
): Promise<Keys> {
  const seed = await seedFromCredentialId(credentialId);
  return keysFromSeed(seed);
}

// Storage helpers for credential mappings
const STORAGE_PREFIX = "__MW::passkey::";

function getStorageKey(backendUrl: string, publicKey: string): string {
  return `${STORAGE_PREFIX}${backendUrl}::${publicKey}`;
}

export function storeCredentialMapping(
  backendUrl: string,
  publicKey: string,
  credentialId: string,
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("localStorage is not available");
  }
  const key = getStorageKey(backendUrl, publicKey);
  localStorage.setItem(key, credentialId);
}

export function getCredentialId(
  backendUrl: string,
  publicKey: string,
): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const key = getStorageKey(backendUrl, publicKey);
  return localStorage.getItem(key);
}

export function removeCredentialMapping(
  backendUrl: string,
  publicKey: string,
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  const key = getStorageKey(backendUrl, publicKey);
  localStorage.removeItem(key);
}
