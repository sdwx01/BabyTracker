const {
  formatDate,
  formatDateTime,
  humanDateLabel,
  lastNDates,
  minutesToDuration,
  sameDay,
  today
} = require("./date");
const { CLOUD_ENV_ID } = require("./config");
const {
  cloudBootstrap,
  cloudGetStore,
  cloudJoinFamily,
  cloudSyncStore,
  cloudUpdateMemberProfile,
  deleteCloudFiles,
  getTempFileUrls,
  isCloudAvailable,
  uploadMilestoneMediaList,
  toSyncStamp
} = require("./cloud");

const STORAGE_KEY = "baby-tracker-store-v1";
const SETTINGS_KEY = "baby-tracker-settings-v1";

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const normalizeSeedCaregivers = (caregivers) => {
  const list = Array.isArray(caregivers) ? caregivers : [];
  if (
    list.length === 2 &&
    list[0] &&
    list[1] &&
    list[0].id === "cg_mama" &&
    list[1].id === "cg_baba" &&
    list[0].name === "妈妈" &&
    list[1].name === "爸爸"
  ) {
    return [
      {
        id: "cg_owner",
        name: "当前照护者",
        role: "创建者",
        joinedAt: list[0].joinedAt || formatDateTime(new Date())
      }
    ];
  }
  return list;
};

const seedStore = () => {
  const baby = {
    id: "baby_1",
    nickname: "糯米",
    birthDate: "2025-12-02",
    gender: "girl",
    avatarText: "糯"
  };

  const caregivers = [
    {
      id: "cg_owner",
      name: "当前照护者",
      role: "创建者",
      joinedAt: formatDateTime(new Date())
    }
  ];

  const now = new Date();
  const todayDate = formatDate(now);
  const earlier = new Date(now.getTime() - 90 * 60 * 1000);
  const morning = new Date(now.getTime() - 7 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const records = [
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
      createdBy: caregivers[0].id,
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
      createdBy: caregivers[0].id,
      payload: {
        mode: "母乳",
        durationMin: 18,
        side: "双侧"
      }
    }
  ];

  const milestones = [
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

  const reminders = [
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

const readStore = () => {
  const store = wx.getStorageSync(STORAGE_KEY);
  return store || seedStore();
};

const writeStore = (store) => {
  wx.setStorageSync(STORAGE_KEY, store);
};

const defaultSettings = () => ({
  preferCloudSync: true,
  lastSyncMode: "local",
  cloudReady: false,
  cloudEnvId: CLOUD_ENV_ID || "",
  familyId: "",
  inviteCode: "",
  memberSummaries: [],
  lastSyncAt: "",
  syncInFlight: false,
  lastError: ""
});

const readSettings = () => {
  const settings = wx.getStorageSync(SETTINGS_KEY);
  return settings || defaultSettings();
};

const writeSettings = (settings) => {
  wx.setStorageSync(SETTINGS_KEY, settings);
};

const markLocalSync = () => {
  const settings = readSettings();
  settings.lastSyncMode = "local";
  settings.lastSyncAt = toSyncStamp();
  settings.lastError = "";
  writeSettings(settings);
};

const markCloudSync = () => {
  const settings = readSettings();
  settings.lastSyncMode = "cloud";
  settings.lastSyncAt = toSyncStamp();
  settings.lastError = "";
  writeSettings(settings);
};

const markCloudError = (error) => {
  const settings = readSettings();
  settings.lastError = (error && error.message) || "cloud sync failed";
  settings.lastSyncMode = "local";
  writeSettings(settings);
};

const initializeStore = () => {
  const store = wx.getStorageSync(STORAGE_KEY);
  if (!store) {
    writeStore(seedStore());
  }
  const settings = readSettings();
  settings.cloudEnvId = CLOUD_ENV_ID || "";
  writeSettings(settings);
  markLocalSync();
};

const configureCloudStatus = (options) => {
  const settings = readSettings();
  settings.cloudReady = !!(options && options.cloudReady);
  settings.cloudEnvId = (options && options.cloudEnvId) || settings.cloudEnvId || "";
  settings.familyId = (options && options.familyId) || settings.familyId || "";
  settings.inviteCode = (options && options.inviteCode) || settings.inviteCode || "";
  settings.lastError = settings.cloudReady ? "" : settings.lastError;
  writeSettings(settings);
};

const applyCloudIdentity = (result) => {
  if (!result) {
    return;
  }
  const settings = readSettings();
  settings.familyId = result.familyId || settings.familyId || "";
  settings.inviteCode = result.inviteCode || settings.inviteCode || "";
  settings.memberSummaries = Array.isArray(result.memberSummaries) ? result.memberSummaries : settings.memberSummaries || [];
  writeSettings(settings);
};

const getDataSourceStatus = () => {
  const settings = readSettings();
  const usingCloud = !!(settings.cloudReady && settings.preferCloudSync && settings.cloudEnvId);

  return {
    preferCloudSync: settings.preferCloudSync,
    cloudReady: settings.cloudReady,
    cloudEnvId: settings.cloudEnvId,
    familyId: settings.familyId,
    inviteCode: settings.inviteCode,
    memberSummaries: Array.isArray(settings.memberSummaries) ? settings.memberSummaries : [],
    lastSyncMode: usingCloud ? "cloud-ready" : settings.lastSyncMode || "local",
    lastSyncAt: settings.lastSyncAt,
    modeLabel: usingCloud ? "云开发就绪" : "本地存储",
    syncMetaText: settings.lastSyncAt
      ? `${usingCloud ? "云开发就绪" : "本地存储"} · 最近同步 ${settings.lastSyncAt}`
      : (usingCloud ? "云开发就绪" : "本地存储"),
    statusText: usingCloud
      ? `已连接云环境 ${settings.cloudEnvId}，当前仍保留本地回退`
      : "当前使用本地存储，后续可接入云开发同步",
    hintText: settings.cloudEnvId
      ? "当前已填写云环境 ID，下一步可以继续接云数据库集合与云函数。"
      : "如需真正云端同步，请在 utils/config.js 中填写云环境 ID。",
    canUseCloud: !!(settings.cloudReady && settings.cloudEnvId),
    lastError: settings.lastError || ""
  };
};

const setCloudPreference = (preferCloudSync) => {
  const settings = readSettings();
  settings.preferCloudSync = !!preferCloudSync;
  writeSettings(settings);
  return getDataSourceStatus();
};

const canUseCloudSync = () => {
  const settings = readSettings();
  return !!(settings.preferCloudSync && settings.cloudReady && settings.cloudEnvId && isCloudAvailable());
};

const getFamilyId = () => readSettings().familyId || "";
const getMemberSummaries = () => {
  const settings = readSettings();
  return Array.isArray(settings.memberSummaries) ? settings.memberSummaries : [];
};

const writeCloudStoreToLocal = (store) => {
  writeStore(sanitizeStoreForLocal(store));
};

const sanitizeStoreForLocal = (store) => {
  return {
    baby: store.baby || seedStore().baby,
    caregivers: normalizeSeedCaregivers(store.caregivers),
    records: Array.isArray(store.records) ? store.records : [],
    milestones: Array.isArray(store.milestones) ? store.milestones : [],
    reminders: Array.isArray(store.reminders) ? store.reminders : []
  };
};

const bootstrapCloudStore = () => {
  return new Promise((resolve) => {
    if (!canUseCloudSync()) {
      resolve({
        ok: false,
        mode: "local"
      });
      return;
    }

    cloudBootstrap(readStore())
      .then((result) => {
        if (result && result.store) {
          writeCloudStoreToLocal(result.store);
          applyCloudIdentity(result);
          markCloudSync();
        }
        resolve(result || { ok: false });
      })
      .catch((error) => {
        markCloudError(error);
        resolve({
          ok: false,
          mode: "local",
          error: error && error.message
        });
      });
  });
};

const refreshStoreFromCloud = () => {
  return new Promise((resolve) => {
    if (!canUseCloudSync()) {
      resolve({
        ok: false,
        mode: "local"
      });
      return;
    }

    cloudGetStore(readStore())
      .then((result) => {
        if (result && result.store) {
          writeCloudStoreToLocal(result.store);
          applyCloudIdentity(result);
          markCloudSync();
        }
        resolve(result || { ok: false });
      })
      .catch((error) => {
        markCloudError(error);
        resolve({
          ok: false,
          mode: "local",
          error: error && error.message
        });
      });
  });
};

const syncStoreToCloud = () => {
  return new Promise((resolve) => {
    if (!canUseCloudSync()) {
      resolve({
        ok: false,
        mode: "local"
      });
      return;
    }

    const settings = readSettings();
    settings.syncInFlight = true;
    writeSettings(settings);

    cloudSyncStore(readStore())
      .then((result) => {
        const nextSettings = readSettings();
        nextSettings.syncInFlight = false;
        writeSettings(nextSettings);
        applyCloudIdentity(result);
        markCloudSync();
        resolve(result || { ok: true, mode: "cloud" });
      })
      .catch((error) => {
        const nextSettings = readSettings();
        nextSettings.syncInFlight = false;
        writeSettings(nextSettings);
        markCloudError(error);
        resolve({
          ok: false,
          mode: "local",
          error: error && error.message
        });
      });
  });
};

const getBaby = () => readStore().baby;

const updateBaby = (patch) => {
  const store = readStore();
  store.baby = Object.assign({}, store.baby, patch);
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return store.baby;
};

const getCaregivers = () => readStore().caregivers;

const getInviteCode = () => readSettings().inviteCode || "";

const createRecord = (input) => {
  const store = readStore();
  const record = Object.assign({}, input, {
    id: createId("record"),
    babyId: store.baby.id,
    createdBy: input.createdBy || store.caregivers[0].id
  });
  store.records.unshift(record);
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return record;
};

const updateRecord = (recordId, patch) => {
  const store = readStore();
  let updatedRecord = null;

  store.records = store.records.map((record) => {
    if (record.id !== recordId) {
      return record;
    }

    updatedRecord = Object.assign({}, record, patch, {
      payload: Object.assign({}, record.payload, (patch && patch.payload) || {})
    });
    return updatedRecord;
  });

  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return updatedRecord;
};

const getRecordById = (recordId) => {
  const records = readStore().records;
  for (let index = 0; index < records.length; index += 1) {
    if (records[index].id === recordId) {
      return records[index];
    }
  }
  return null;
};

const deleteRecord = (recordId) => {
  const store = readStore();
  store.records = store.records.filter((record) => record.id !== recordId);
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
};

const duplicateRecord = (recordId) => {
  const store = readStore();
  const original = store.records.find((record) => record.id === recordId);
  if (!original) {
    return null;
  }

  const copy = Object.assign({}, original, {
    id: createId("record"),
    occurredAt: formatDateTime(new Date())
  });
  store.records.unshift(copy);
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return copy;
};

const listRecordsByDate = (dateValue = today()) => {
  return readStore().records
    .filter((record) => sameDay(record.occurredAt, dateValue))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
};

const listMilestones = () => {
  return readStore().milestones.sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));
};

const createMilestone = (input) => {
  const store = readStore();
  const milestone = Object.assign({}, input, {
    id: createId("milestone"),
    babyId: store.baby.id,
    createdBy: input.createdBy || store.caregivers[0].id
  });
  store.milestones.unshift(milestone);
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return milestone;
};

const getMilestoneById = (milestoneId) => {
  const milestones = readStore().milestones;
  for (let index = 0; index < milestones.length; index += 1) {
    if (milestones[index].id === milestoneId) {
      return milestones[index];
    }
  }
  return null;
};

const deleteMilestoneById = (milestoneId) => {
  const store = readStore();
  let removedMilestone = null;
  store.milestones = store.milestones.filter((milestone) => {
    if (milestone.id === milestoneId) {
      removedMilestone = milestone;
      return false;
    }
    return true;
  });
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return removedMilestone;
};

const createMilestoneWithMedia = (input) => {
  return new Promise((resolve, reject) => {
    const mediaList = Array.isArray(input.mediaList) ? input.mediaList : [];

    if (canUseCloudSync() && mediaList.length) {
      uploadMilestoneMediaList(getFamilyId(), mediaList)
        .then((uploadedMediaList) => {
          resolve(
            createMilestone(
              Object.assign({}, input, {
                mediaList: uploadedMediaList
              })
            )
          );
        })
        .catch(reject);
      return;
    }

    resolve(createMilestone(input));
  });
};

const resolveMilestonePreviewSources = (mediaList) => {
  return new Promise((resolve) => {
    const previewCandidates = (mediaList || []).map((media) => ({
      original: media,
      cloudId: media.cloudFileId || media.thumbCloudFileId || "",
      localPath: media.filePath || media.thumbPath || ""
    }));
    const cloudIds = previewCandidates.map((item) => item.cloudId).filter(Boolean);

    if (!cloudIds.length || !isCloudAvailable()) {
      resolve(
        previewCandidates.map((item) => ({
          url: item.localPath,
          type: item.original.kind === "video" ? "video" : "image"
        }))
      );
      return;
    }

    getTempFileUrls(cloudIds)
      .then((urls) => {
        let cloudIndex = 0;
        resolve(
          previewCandidates.map((item) => {
            let url = item.localPath;
            if (item.cloudId) {
              url = urls[cloudIndex] || item.localPath;
              cloudIndex += 1;
            }
            return {
              url,
              type: item.original.kind === "video" ? "video" : "image"
            };
          })
        );
      })
      .catch(() => {
        resolve(
          previewCandidates.map((item) => ({
            url: item.localPath,
            type: item.original.kind === "video" ? "video" : "image"
          }))
        );
      });
  });
};

const recycleMilestoneMediaFiles = (milestone) => {
  return new Promise((resolve) => {
    const files = [];
    ((milestone && milestone.mediaList) || []).forEach((media) => {
      if (media.cloudFileId) {
        files.push(media.cloudFileId);
      }
      if (media.thumbCloudFileId && media.thumbCloudFileId !== media.cloudFileId) {
        files.push(media.thumbCloudFileId);
      }
    });

    if (!files.length || !isCloudAvailable()) {
      resolve({
        ok: true,
        fileList: []
      });
      return;
    }

    deleteCloudFiles(files)
      .then(resolve)
      .catch(() => {
        resolve({
          ok: false,
          fileList: files
        });
      });
  });
};

const getReminders = () => readStore().reminders;

const upsertReminder = (input) => {
  const store = readStore();
  if (input.id) {
    store.reminders = store.reminders.map((reminder) => {
      if (reminder.id === input.id) {
        return Object.assign({}, reminder, input);
      }
      return reminder;
    });
  } else {
    store.reminders.unshift(Object.assign({
      id: createId("reminder"),
      babyId: store.baby.id,
      enabled: true,
      scheduleTime: "08:00",
      frequencyLabel: "每日"
    }, input));
  }
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
};

const toggleReminder = (reminderId, enabled) => {
  const store = readStore();
  store.reminders = store.reminders.map((reminder) => {
    if (reminder.id === reminderId) {
      return Object.assign({}, reminder, { enabled });
    }
    return reminder;
  });
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
};

const completeReminder = (reminderId) => {
  const store = readStore();
  const completedAt = formatDateTime(new Date());
  store.reminders = store.reminders.map((reminder) => {
    if (reminder.id === reminderId) {
      return Object.assign({}, reminder, { lastCompletedAt: completedAt });
    }
    return reminder;
  });
  writeStore(store);
  markLocalSync();
  syncStoreToCloud();
  return completedAt;
};

const getTodaySummary = (dateValue = today()) => {
  const records = listRecordsByDate(dateValue);
  return records.reduce(
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

const getWeeklyTrend = () => {
  return lastNDates(7).map((dateValue) => {
    const summary = getTodaySummary(dateValue);
    return Object.assign({
      date: dateValue,
      label: humanDateLabel(dateValue).slice(5)
    }, summary);
  });
};

const getRecordTitle = (type) => {
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

const describeRecord = (record) => {
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

const getTimelineItems = (dateValue = today()) => {
  return listRecordsByDate(dateValue).map((record) =>
    Object.assign({}, record, {
      time: record.occurredAt.slice(11, 16),
      title: getRecordTitle(record.type),
      description: describeRecord(record),
      hasNote: !!record.note
    })
  );
};

const getDashboardCards = (dateValue = today()) => {
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

const getQuickInsights = () => {
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
      : "高频记录都集中在首页，两步内完成一次记录"
  };
};

const getMilestoneViewModels = () => {
  return listMilestones().map((milestone) =>
    Object.assign({}, milestone, {
      hasNote: !!milestone.note,
      hasMedia: milestone.mediaList.length > 0,
      mediaCountText: `${milestone.mediaList.length} 个素材`,
      mediaList: milestone.mediaList.map((media) =>
        Object.assign({}, media, {
          isImage: media.kind === "image",
          previewPath: media.thumbCloudFileId || media.cloudFileId || media.thumbPath || media.filePath
        })
      )
    })
  );
};

const joinFamilyByInviteCode = (inviteCode, caregiverName, caregiverRole) => {
  return new Promise((resolve) => {
    if (!canUseCloudSync()) {
      resolve({
        ok: false,
        message: "cloud unavailable"
      });
      return;
    }

    cloudJoinFamily(inviteCode, caregiverName, caregiverRole)
      .then((result) => {
        if (result && result.store) {
          writeCloudStoreToLocal(result.store);
          applyCloudIdentity(result);
          markCloudSync();
        }
        resolve(result || { ok: false });
      })
      .catch((error) => {
        markCloudError(error);
        resolve({
          ok: false,
          message: (error && error.message) || "join family failed"
        });
      });
  });
};

const updateMemberProfile = (displayName, role) => {
  return new Promise((resolve) => {
    if (!canUseCloudSync()) {
      resolve({
        ok: false,
        message: "cloud unavailable"
      });
      return;
    }

    cloudUpdateMemberProfile(displayName, role, readStore())
      .then((result) => {
        if (result && result.store) {
          writeCloudStoreToLocal(result.store);
          applyCloudIdentity(result);
          markCloudSync();
        }
        resolve(result || { ok: false });
      })
      .catch((error) => {
        markCloudError(error);
        resolve({
          ok: false,
          message: (error && error.message) || "update member profile failed"
        });
      });
  });
};

module.exports = {
  initializeStore,
  configureCloudStatus,
  getDataSourceStatus,
  setCloudPreference,
  bootstrapCloudStore,
  refreshStoreFromCloud,
  syncStoreToCloud,
  joinFamilyByInviteCode,
  updateMemberProfile,
  getFamilyId,
  getMemberSummaries,
  getBaby,
  updateBaby,
  getCaregivers,
  getInviteCode,
  createRecord,
  updateRecord,
  getRecordById,
  deleteRecord,
  duplicateRecord,
  listRecordsByDate,
  listMilestones,
  getMilestoneById,
  createMilestone,
  createMilestoneWithMedia,
  deleteMilestoneById,
  resolveMilestonePreviewSources,
  recycleMilestoneMediaFiles,
  getReminders,
  upsertReminder,
  toggleReminder,
  completeReminder,
  getTodaySummary,
  getWeeklyTrend,
  getTimelineItems,
  getDashboardCards,
  getQuickInsights,
  getMilestoneViewModels
};
