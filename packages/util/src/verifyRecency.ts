/**
 * Verify the time since the blockNumber is equal to or less than the maxVerifiedTime.
 * @param challenge
 * @param maxVerifiedTime
 */
export const verifyRecency = (challenge: string, maxVerifiedTime: number) => {
  // Get the timestamp from the challenge
  const timestamp = challenge.split("___")[0];

  if (!timestamp) {
    return false;
  }

  const currentTimestamp = Date.now();
  const challengeTimestamp = Number.parseInt(timestamp, 10);
  return currentTimestamp - challengeTimestamp <= maxVerifiedTime;
};
