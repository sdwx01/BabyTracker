export type RecordType =
  | "feed"
  | "diaper"
  | "sleep"
  | "medication"
  | "care"
  | "outing";

export interface BabyProfile {
  id: string;
  nickname: string;
  birthDate: string;
  gender: "girl" | "boy" | "unknown";
  avatarText: string;
}

export interface Caregiver {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
}

export interface BabyRecord {
  id: string;
  babyId: string;
  type: RecordType;
  occurredAt: string;
  createdBy: string;
  note?: string;
  payload: {
    mode?: string;
    amountMl?: number;
    durationMin?: number;
    side?: string;
    diaperKind?: string;
    diaperStatus?: string;
    medicationName?: string;
    dosage?: string;
    careType?: string;
    outingType?: string;
  };
}

export interface MilestoneMedia {
  id: string;
  kind: "image" | "video";
  filePath: string;
  thumbPath?: string;
}

export interface Milestone {
  id: string;
  babyId: string;
  title: string;
  occurredOn: string;
  note?: string;
  mediaList: MilestoneMedia[];
  createdBy: string;
}

export interface Reminder {
  id: string;
  babyId: string;
  title: string;
  dosage: string;
  enabled: boolean;
  scheduleTime: string;
  frequencyLabel: string;
  lastCompletedAt?: string;
}

export interface TodaySummary {
  feedCount: number;
  totalMilkMl: number;
  sleepMinutes: number;
  diaperCount: number;
  medicationDoneCount: number;
}

export interface DailyTrend {
  date: string;
  label: string;
  feedCount: number;
  totalMilkMl: number;
  sleepMinutes: number;
  diaperCount: number;
}

export interface AppStore {
  baby: BabyProfile;
  caregivers: Caregiver[];
  records: BabyRecord[];
  milestones: Milestone[];
  reminders: Reminder[];
}
