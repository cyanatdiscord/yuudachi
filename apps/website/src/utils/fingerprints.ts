/**
 * Fingerprint status indicating normal/unflagged state.
 */
export const FINGERPRINT_STATUS_NORMAL = 0;

/**
 * Fingerprint status indicating the fingerprint has been flagged as malicious/spam.
 */
export const FINGERPRINT_STATUS_FLAGGED = 1;

/**
 * Fingerprint status indicating the fingerprint has been marked as trusted/safe.
 */
export const FINGERPRINT_STATUS_TRUSTED = 2;

/**
 * Determines if a fingerprint should be considered suspicious based on its metrics.
 * A fingerprint is suspicious when it has normal status but exceeds guild or occurrence thresholds.
 *
 * @param status - The fingerprint status code
 * @param guildCount - Number of distinct guilds where the fingerprint appeared
 * @param occurrenceCount - Total number of times the fingerprint was seen
 * @param thresholdGuilds - Number of guilds that triggers suspicious classification
 * @param thresholdOccurrences - Number of occurrences that triggers suspicious classification
 * @returns True if the fingerprint should be marked as suspicious
 */
export function isSuspiciousFingerprint(
	status: number,
	guildCount: number,
	occurrenceCount: number,
	thresholdGuilds: number,
	thresholdOccurrences: number,
): boolean {
	return (
		status === FINGERPRINT_STATUS_NORMAL && (guildCount >= thresholdGuilds || occurrenceCount >= thresholdOccurrences)
	);
}
