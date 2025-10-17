
"use server";

import { toUtf8String, isHexString } from "ethers/lib/utils";

/**
 * Decodes a hex string to a UTF-8 string.
 * If the string is not a valid hex string, it returns the original string.
 * It also trims null characters from the result.
 * @param hex - The hex string to decode, which might be a bytes32 string.
 * @returns The decoded string, or the original string if decoding fails.
 */
export function decodeBytes32(hex: string): string {
  try {
    // Check if it's a valid hex string and long enough to be bytes32
    if (isHexString(hex)) {
      // Use toUtf8String which handles bytes32 and other hex formats
      const decoded = toUtf8String(hex);
      // Remove null characters (common in bytes32 padding)
      return decoded.replace(/\u0000/g, "").trim();
    }
    // If it's not a hex string, it might already be a regular string
    return hex.replace(/\u0000/g, "").trim();
  } catch (e) {
    // If any error occurs during decoding, return the original string trimmed
    return hex.replace(/\u0000/g, "").trim();
  }
}
