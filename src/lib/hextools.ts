
"use server";

import { toUtf8String, isHexString } from "ethers";

/**
 * Decodes a hex string to a UTF-8 string, specifically handling bytes32.
 * If the string is not a valid hex string, it returns the original string.
 * It also trims null characters from the result.
 * @param hex - The hex string to decode, which might be a bytes32 string.
 * @returns The decoded string, or the original string if decoding fails.
 */
export function decodeBytes32(hex: string): string {
  try {
    // Ensure it's a hex string
    if (!isHexString(hex)) {
        return hex.replace(/\u0000/g, "").trim();
    }
    // Use toUtf8String which is designed to handle this, then clean up
    const decoded = toUtf8String(hex);
    // Remove null characters (common in bytes32 padding) and trim whitespace
    return decoded.replace(/\u0000/g, "").trim();
  } catch (e) {
    // If any error occurs, return the original hex string as a fallback
    return hex;
  }
}
