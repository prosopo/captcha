import type { Timestamp } from "../datasets/index.js";

export enum Tier {
  Free = "free",
  Professional = "professional",
  Enterprise = "enterprise",
}

export const TierMonthlyLimits = {
  [Tier.Free]: {
    verificationRequests: 100000,
  },
  [Tier.Professional]: {
    verificationRequests: 1000000,
  },
  [Tier.Enterprise]: {
    verificationRequests: "Unlimited",
  },
};

export interface IUserData {
  email: string;
  name: string;
  account: string;
  url: string;
  mnemonic: string;
  createdAt: Timestamp;
  activated: boolean;
  tier?: Tier;
  settings?: IUserSettings;
  updatedAtTimestamp?: Timestamp;
}

export interface IUserSettings {
  threshold: number;
  domains: string[];
}
