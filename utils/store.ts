import type {
  AppStore,
  BabyProfile,
  BabyRecord,
  Caregiver,
  DailyTrend,
  Milestone,
  Reminder,
  TodaySummary
} from "../types/index";
import {
  formatDate,
  formatDateTime,
  humanDateLabel,
  lastNDates,
  mergeDateAndTime,
  minutesToDuration,
  sameDay,
  today
} from "./date";

const STORAGE_KEY = "baby-tracker-store-v1";

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const seedStore = (): AppStore => {
  const baby: BabyProfile = {
    id: "baby_1",
    nickname: "糯米",
    birthDate: "2025-12-02",
    gender: "girl",
    avatarText: "糯"
  };

  const caregivers: Caregiver[] = [
    {
      id: "cg_mama",
      name: "妈妈",
      role: "主记录人",
      joinedAt: formatDateTime(new Date())
    },
    {
      id: "cg_baba",
      name: "爸爸",
      role: "共同照护者",
      joinedAt: formatDateTime(new Date())
    }
  ];

  const now = new Date();
  const todayDate = formatDate(now);
  const earlier = new Date(now.getTime() - 90 * 60 * 1000);
  const morning = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const records: BabyRecord[] = [
    {
      id: createId("record"),
      babyId: baby.id,
      type: "feed",
      occurredAt: formatDateTime(morning),
      createdBy: caregivers[0].id,
      note: "喝得很快，状态不错",
      payload: {
        mode: "瓶喂",
        amountMl: 120
      }
    },
    {
      id: createId("record"),
      babyId: baby.id,
      type: "sleep",
      occurredAt: formatDateTime(earlier),
      createdBy: caregivers[1].id,
      payload: {
        durationMin: 95
      }
    },
    {
      id: createId("record"),
      babyId: baby.id,
      type: "diaper",
      occurredAt: formatDateTime(now),
      createdBy: caregivers[0].id,
      payload: {
        diaperKind: "小便",
        diaperStatus: "正常"
      }
    },
    {
      id: createId("record"),
      babyId: baby.id,
      type: "medication",
      occurredAt: `${todayDate} 09:00`,
      createdBy: caregivers[0].id,
      payload: {
        medicationName: "维生素D",
        dosage: "1 滴"
      }
    },
    {
      id: createId("record"),
      babyId: baby.id,
      type: "feed",
      occurredAt: formatDateTime(yesterday),
      createdBy: caregivers[1].id,
      payload: {
        mode: "母乳",
        durationMin: 18,
        side: "双侧"
      }
    }
  ];

  const milestones: Milestone[] = [
    {
      id: createId("milestone"),
      babyId: baby.id,
      title: "第一次抬头稳稳撑住",
      occurredOn: todayDate,
      note: "趴着的时候明显更有力了。",
      createdBy: caregivers[0].id,
      mediaList: []
    }
  ];

  const reminders: Reminder[] = [
    {
      id: createId("reminder"),
      babyId: baby.id,
      title: "维生素AD",
      dosage: "1 粒",
      enabled: true,
      scheduleTime: "08:30",
      frequencyLabel: "每日",
      lastCompletedAt: `${todayDate} 08:31`
    },
    {
      id: createId("reminder"),
      babyId: baby.id,
      title: "维生素D",
      dosage: "1 滴",
      enabled: true,
      scheduleTime: "19:30",
      frequencyLabel: "每日"
    }
  ];

  return {
    baby,
    caregivers,
    records,
    milestones,
    reminders
  };
};

const readStore = (): AppStore => {
  const store = wx.getStorageSync(STORAGE_KEY);
  return store || seedStore();
};

const writeStore = (store: AppStore) => {
  wx.setStorageSync(STORAGE_KEY, store);
};

export const initializeStore = () => {
  const store = wx.getStorageSync(STORAGE_KEY);
  if (!store) {
    writeStore(seedStore());
  }
};

export const getBaby = () => readStore().baby;

export const updateBaby = (patch: Partial<BabyProfile>) => {
  const store = readStore();
  store.baby = {
    ...store.baby,
    ...patch
  };
  writeStore(store);
  return store.baby;
};

export const getCaregivers = () => readStore().caregivers;

export const getInviteCode = () => `BABY-${getBaby().nickname.toUpperCase()}-24H`;

export const createRecord = (
  input: Omit<BabyRecord, "id" | "babyId" | "createdBy"> & { createdBy?: string }
) => {
  const store = readStore();
  const record: BabyRecord = {
    ...input,
    id: createId("record"),
    babyId: store.baby.id,
    createdBy: input.createdBy || store.caregivers[0].id
  };
  store.records.unshift(record);
  writeStore(store);
  return record;
};

export const deleteRecord = (recordId: string) => {
  const store = readStore();
  store.records = store.records.filter((record) => record.id !== recordId);
  writeStore(store);
};

export const duplicateRecord = (recordId: string) => {
  const store = readStore();
  const original = store.records.find((record) => record.id === recordId);
  if (!original) {
    return null;
  }

  const copy: BabyRecord = {
    ...original,
    id: createId("record"),
    occurredAt: formatDateTime(new Date())
  };
  store.records.unshift(copy);
  writeStore(store);
  return copy;
};

export const listRecordsByDate = (dateValue = today()) => {
  return readStore().records
    .filter((record) => sameDay(record.occurredAt, dateValue))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
};

export const listRecentRecords = () => {
  return readStore().records.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
};

export const listMilestones = () => {
  return readStore().milestones.sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));
};

export const createMilestone = (
  input: Omit<Milestone, "id" | "babyId" | "createdBy"> & { createdBy?: string }
) => {
  const store = readStore();
  const milestone: Milestone = {
    ...input,
    id: createId("milestone"),
    babyId: store.baby.id,
    createdBy: input.createdBy || store.caregivers[0].id
  };
  store.milestones.unshift(milestone);
  writeStore(store);
  return milestone;
};

export const getReminders = () => readStore().reminders;

export const upsertReminder = (input: Partial<Reminder> & Pick<Reminder, "title" | "dosage">) => {
  const store = readStore();
  if (input.id) {
    store.reminders = store.reminders.map((reminder) =>
      reminder.id === input.id ? { ...reminder, ...input } : reminder
    );
  } else {
    store.reminders.unshift({
      id: createId("reminder"),
      babyId: store.baby.id,
      enabled: true,
      scheduleTime: "08:00",
      frequencyLabel: "每日",
      ...input
    } as Reminder);
  }
  writeStore(store);
};

export const toggleReminder = (reminderId: string, enabled: boolean) => {
  const store = readStore();
  store.reminders = store.reminders.map((reminder) =>
    reminder.id === reminderId ? { ...reminder, enabled } : reminder
  );
  writeStore(store);
};

export const completeReminder = (reminderId: string) => {
  const store = readStore();
  const completedAt = formatDateTime(new Date());
  store.reminders = store.reminders.map((reminder) =>
    reminder.id === reminderId ? { ...reminder, lastCompletedAt: completedAt } : reminder
  );
  writeStore(store);
  return completedAt;
};

export const getTodaySummary = (dateValue = today()): TodaySummary => {
  const records = listRecordsByDate(dateValue);
  return records.reduce<TodaySummary>(
    (summary, record) => {
      if (record.type === "feed") {
        summary.feedCount += 1;
        summary.totalMilkMl += record.payload.amountMl || 0;
      }
      if (record.type === "sleep") {
        summary.sleepMinutes += record.payload.durationMin || 0;
      }
      if (record.type === "diaper") {
        summary.diaperCount += 1;
      }
      if (record.type === "medication") {
        summary.medicationDoneCount += 1;
      }
      return summary;
    },
    {
      feedCount: 0,
      totalMilkMl: 0,
      sleepMinutes: 0,
      diaperCount: 0,
      medicationDoneCount: 0
    }
  );
};

export const getWeeklyTrend = (): DailyTrend[] => {
  return lastNDates(7).map((dateValue) => {
    const summary = getTodaySummary(dateValue);
    return {
      date: dateValue,
      label: humanDateLabel(dateValue).slice(5),
      ...summary
    };
  });
};

export const describeRecord = (record: BabyRecord) => {
  switch (record.type) {
    case "feed":
      if (record.payload.amountMl) {
        return `${record.payload.mode || "瓶喂"} ${record.payload.amountMl} ml`;
      }
      return `${record.payload.mode || "母乳"} ${record.payload.durationMin || 0} 分钟`;
    case "diaper":
      return `${record.payload.diaperKind || "尿布"} · ${record.payload.diaperStatus || "已记录"}`;
    case "sleep":
      return `睡了 ${minutesToDuration(record.payload.durationMin || 0)}`;
    case "medication":
      return `${record.payload.medicationName || "药物"} ${record.payload.dosage || ""}`.trim();
    case "care":
      return record.payload.careType || "护理";
    case "outing":
      return `${record.payload.outingType || "外出"} ${record.payload.durationMin || 0} 分钟`;
    default:
      return "已记录";
  }
};

export const getTimelineItems = (dateValue = today()) => {
  return listRecordsByDate(dateValue).map((record) => ({
    ...record,
    time: record.occurredAt.slice(11, 16),
    title: getRecordTitle(record.type),
    description: describeRecord(record)
  }));
};

export const getRecordTitle = (type: BabyRecord["type"]) => {
  const titles = {
    feed: "喂奶",
    diaper: "尿布",
    sleep: "睡眠",
    medication: "喂药",
    care: "护理",
    outing: "外出"
  };
  return titles[type];
};

export const getDashboardCards = (dateValue = today()) => {
  const summary = getTodaySummary(dateValue);
  return [
    {
      label: "喂奶",
      value: `${summary.feedCount} 次`,
      tone: "peach"
    },
    {
      label: "总奶量",
      value: `${summary.totalMilkMl} ml`,
      tone: "sand"
    },
    {
      label: "睡眠",
      value: minutesToDuration(summary.sleepMinutes),
      tone: "leaf"
    },
    {
      label: "尿布",
      value: `${summary.diaperCount} 次`,
      tone: "clay"
    }
  ];
};

export const getQuickInsights = () => {
  const summary = getTodaySummary();
  const reminders = getReminders().filter((reminder) => reminder.enabled);

  const pendingReminder = reminders.find((reminder) => {
    if (!reminder.lastCompletedAt) {
      return true;
    }
    return !sameDay(reminder.lastCompletedAt, today());
  });

  return {
    heroTitle: `${getBaby().nickname} 今天过得很充实`,
    heroSubtitle: pendingReminder
      ? `${pendingReminder.title} 还没完成，建议在 ${pendingReminder.scheduleTime} 前后提醒自己`
      : "高频记录都集中在首页，两步内完成一次记录",
    summary
  };
};
