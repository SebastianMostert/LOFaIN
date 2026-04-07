export type LeagueTimeControlRecord = {
  id: string;
  originalRealStartAt: Date;
  originalSimulatedAt: Date;
  currentRealAnchorAt: Date;
  currentRealReferenceAt: Date;
  currentSimulatedAt: Date;
  isPaused: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LeagueTimeSnapshot = {
  id: string;
  originalRealStartAt: Date;
  originalSimulatedAt: Date;
  currentRealAnchorAt: Date;
  currentRealReferenceAt: Date;
  currentSimulatedAt: Date;
  isPaused: boolean;
  currentSimulatedNow: Date;
};

export type SerializedLeagueTimeSnapshot = {
  id: string;
  originalRealStartAt: string;
  originalSimulatedAt: string;
  currentRealAnchorAt: string;
  currentRealReferenceAt: string;
  currentSimulatedAt: string;
  isPaused: boolean;
  currentSimulatedNow: string;
};

export type PersistedLeagueTimeControlRecord = {
  id: string;
  originalRealStartAt: string;
  originalSimulatedAt: string;
  currentRealAnchorAt: string;
  currentRealReferenceAt?: string;
  currentSimulatedAt: string;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
};
