import { NextResponse } from "next/server";
import { createECDH } from "crypto";

// Diagnostic: are the notification keys set, and do they belong together?
// Reports only yes/no answers, never the keys themselves.
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";

  let keysMatch: boolean | null = null;
  let privateKeyValid = false;
  if (privateKey) {
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
      privateKeyValid = true;
      keysMatch = ecdh.getPublicKey().toString("base64url") === publicKey.replace(/=+$/, "");
    } catch {
      privateKeyValid = false;
    }
  }

  return NextResponse.json({
    publicKeySet: publicKey.length > 0,
    privateKeySet: privateKey.length > 0,
    privateKeyValid,
    keysMatch,
  });
}
