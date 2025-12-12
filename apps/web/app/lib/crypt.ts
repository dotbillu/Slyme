import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

// keygen {{{
export function KeyGen() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(keyPair.publicKey),
    privateKey: naclUtil.encodeBase64(keyPair.secretKey),
  };
}
// }}}

// deriveSharedKey {{{
export function deriveSharedKey(
  mySecretKeyB64: string,
  theirPublicKeyB64: string,
): Uint8Array {
  const mySecret = naclUtil.decodeBase64(mySecretKeyB64);
  const theirPublic = naclUtil.decodeBase64(theirPublicKeyB64);
  return nacl.box.before(theirPublic, mySecret);
}
// }}}

// encryptMessag {{{
export function encryptMessage(
  mySecretKeyB64: string,
  theirPublicKeyB64: string,
  message: string,
): { ciphertext: string; nonce: string } {
  const sharedKey = deriveSharedKey(mySecretKeyB64, theirPublicKeyB64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const msgBytes = naclUtil.decodeUTF8(message);

  const cipher = nacl.secretbox(msgBytes, nonce, sharedKey);

  return {
    ciphertext: naclUtil.encodeBase64(cipher),
    nonce: naclUtil.encodeBase64(nonce),
  };
}
// }}}

// decryptMessage{{{
export function decryptMessage(
  mySecretKeyB64: string,
  theirPublicKeyB64: string,
  ciphertextB64: string,
  nonceB64: string,
): string | null {
  const sharedKey = deriveSharedKey(mySecretKeyB64, theirPublicKeyB64);
  const cipher = naclUtil.decodeBase64(ciphertextB64);
  const nonce = naclUtil.decodeBase64(nonceB64);

  const decrypted = nacl.secretbox.open(cipher, nonce, sharedKey);

  if (!decrypted) return null;

  return naclUtil.encodeUTF8(decrypted);
}

// }}}
