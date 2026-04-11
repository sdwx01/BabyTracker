const {
  formatDate,
  formatDateTime,
  formatAge,
  formatTimeSince,
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
const createEmptyBaby = () => null;
const createDefaultCaregiver = () => ({
  id: "cg_owner",
  name: "我",
  role: "待设置",
  joinedAt: formatDateTime(new Date())
});

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
  return {
    baby: createEmptyBaby(),
    caregivers: [createDefaultCaregiver()],
    records: [],
    milestones: [],
    reminders: []
  };
};

const readStore = () => {
  const store = wx.getStorageSync(STORAGE_KEY);
  return sanitizeStoreForLocal(store || seedStore());
};

const writeStore = (store) => {
  wx.setStorageSync(STORAGE_KEY, sanitizeStoreForLocal(store));
};

const defaultSettings = () => ({
  preferCloudSync: true,
  lastSyncMode: "local",
  cloudReady: false,
  cloudEnvId: CLOUD_ENV_ID || "",
  familyId: "",
  inviteCode: "",
  memberSummaries: [],
  currentMember: null,
  lastSyncAt: "",
  syncInFlight: false,
  lastError: "",
  onboardingCompleted: false
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
  settings.lastError = (error && error.message) || "sync failed";
  settings.lastSyncMode = "local";
  writeSettings(settings);
};

const initializeStore = () => {
  const store = wx.getStorageSync(STORAGE_KEY);
  if (!store) {
    writeStore(seedStore());
  } else {
    writeStore(store);
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
  settings.currentMember = result.currentMember || settings.currentMember || null;
  if (settings.familyId || (result.store && result.store.baby)) {
    settings.onboardingCompleted = true;
  }
  writeSettings(settings);
};

const completeOnboarding = () => {
  const settings = readSettings();
  settings.onboardingCompleted = true;
  writeSettings(settings);
};

const hasBaby = () => {
  const baby = readStore().baby;
  return !!(baby && baby.id && baby.nickname);
};

const getAppEntryState = () => {
  const settings = readSettings();
  if (hasBaby()) {
    return "ready";
  }
  if (settings.onboardingCompleted || settings.familyId) {
    return "needs_baby_setup";
  }
  return "needs_onboarding";
};

const getDataSourceStatus = () => {
  const settings = readSettings();
  const cloudConnected = !!(settings.cloudReady && settings.cloudEnvId && isCloudAvailable());
  const usingCloud = !!(cloudConnected && settings.preferCloudSync);
  const lastSyncLabel = settings.lastSyncAt ? `最近同步 ${settings.lastSyncAt}` : "";
  let statusText = "当前仅保存在本设备";
  let hintText = "不开启也能继续记录，数据会保存在当前设备。";

  if (usingCloud) {
    statusText = "已开启云端同步，记录会自动同步";
    hintText = "开启后会自动同步到云端，也能通过邀请码邀请家人一起记录。";
  } else if (cloudConnected) {
    hintText = "开启后会自动同步到云端，换设备也能继续查看记录。";
  } else if (settings.preferCloudSync && !cloudConnected) {
    hintText = "当前还未连接云端，记录仍会保存在本设备。";
  }

  return {
    preferCloudSync: settings.preferCloudSync,
    syncEnabled: usingCloud,
    cloudReady: settings.cloudReady,
    cloudEnvId: settings.cloudEnvId,
    familyId: settings.familyId,
    inviteCode: settings.inviteCode,
    memberSummaries: Array.isArray(settings.memberSummaries) ? settings.memberSummaries : [],
    lastSyncMode: usingCloud ? "cloud" : settings.lastSyncMode || "local",
    lastSyncAt: settings.lastSyncAt,
    modeLabel: usingCloud ? "云端同步" : "本地记录",
    syncMetaText: lastSyncLabel || (usingCloud ? "开启后会自动同步" : "当前未连接云端同步"),
    statusText,
    hintText,
    canUseCloud: cloudConnected,
    lastError: settings.lastError ? "上次同步未完成，已自动保留本地记录。" : "",
    hasInviteCode: !!settings.inviteCode
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
  if (Array.isArray(settings.memberSummaries) && settings.memberSummaries.length) {
    return settings.memberSummaries;
  }

  return getCaregivers().map((item, index) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    isOwner: index === 0,
    joinedAt: item.joinedAt || ""
  }));
};

const getCurrentMemberProfile = () => {
  const settings = readSettings();
  if (settings.currentMember) {
    return settings.currentMember;
  }
  const caregiver = getCaregivers()[0] || createDefaultCaregiver();
  return {
    id: caregiver.id,
    name: caregiver.name,
    role: caregiver.role,
    caregiverId: caregiver.id,
    isOwner: true
  };
};

const writeCloudStoreToLocal = (store) => {
  writeStore(sanitizeStoreForLocal(store));
};

const sanitizeStoreForLocal = (store) => {
  return {
    baby: store && store.baby ? store.baby : createEmptyBaby(),
    caregivers: normalizeSeedCaregivers(store && store.caregivers).length
      ? normalizeSeedCaregivers(store && store.caregivers)
      : [createDefaultCaregiver()],
    records: Array.isArray(store && store.records) ? store.records : [],
    milestones: Array.isArray(store && store.milestones) ? store.milestones : [],
    reminders: Array.isArray(store && store.reminders) ? store.reminders : []
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

const getBaby = () => {
  const baby = readStore().baby;
  if (baby) {
    return baby;
  }
  return {
    id: "",
    nickname: "",
    birthDate: "",
    gender: "",
    avatarText: "宝"
  };
};

const updateBaby = (patch) => {
  const store = readStore();
  const currentBaby = store.baby || {
    id: createId("baby"),
    nickname: "",
    birthDate: "",
    gender: "",
    avatarText: "宝"
  };
  store.baby = Object.assign({}, currentBaby, patch, {
    id: currentBaby.id || createId("baby"),
    avatarText: ((patch && patch.avatarText) || currentBaby.avatarText || (patch && patch.nickname && patch.nickname.slice(0, 1)) || "宝").slice(0, 1)
  });
  writeStore(store);
  completeOnboarding();
  markLocalSync();
  syncStoreToCloud();
  return store.baby;
};

const getCaregivers = () => readStore().caregivers;

const getInviteCode = () => readSettings().inviteCode || "";

const updateLocalCaregiver = (displayName, role) => {
  const store = readStore();
  const nextName = (displayName || "").trim() || "我";
  const nextRole = (role || "").trim() || "共同照护者";
  const settings = readSettings();
  const currentMember = settings.currentMember || {};
  const caregiverId = currentMember.caregiverId || (store.caregivers[0] && store.caregivers[0].id) || "cg_owner";
  const fallback = store.caregivers[0] || createDefaultCaregiver();
  let matched = false;
  store.caregivers = store.caregivers.map((item) => {
    if (item.id === caregiverId) {
      matched = true;
      return Object.assign({}, item, {
        name: nextName,
        role: nextRole
      });
    }
    return item;
  });
  if (!matched) {
    store.caregivers.unshift(
      Object.assign({}, fallback, {
        id: caregiverId,
        name: nextName,
        role: nextRole
      })
    );
  }
  writeStore(store);

  if (!Array.isArray(settings.memberSummaries) || !settings.memberSummaries.length) {
    settings.memberSummaries = [
      {
        id: caregiverId,
        name: nextName,
        role: nextRole,
        isOwner: true,
        joinedAt: fallback.joinedAt
      }
    ];
  } else {
    settings.memberSummaries = settings.memberSummaries.map((item, index) => {
      if (item.id === caregiverId || item.caregiverId === caregiverId || (!currentMember.id && index === 0)) {
        return Object.assign({}, item, {
          name: nextName,
          role: nextRole
        });
      }
      return item;
    });
  }
  settings.currentMember = Object.assign({}, currentMember, {
    caregiverId,
    name: nextName,
    role: nextRole
  });
  writeSettings(settings);
  markLocalSync();
  return store.caregivers.find((item) => item.id === caregiverId) || store.caregivers[0];
};

const createRecord = (input) => {
  const store = readStore();
  const owner = store.caregivers[0] || createDefaultCaregiver();
  const record = Object.assign({}, input, {
    id: createId("record"),
    babyId: store.baby && store.baby.id,
    createdBy: input.createdBy || owner.id
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
  const owner = store.caregivers[0] || createDefaultCaregiver();
  const milestone = Object.assign({}, input, {
    id: createId("milestone"),
    babyId: store.baby && store.baby.id,
    createdBy: input.createdBy || owner.id
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
      babyId: store.baby && store.baby.id,
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

const getActionSubtitle = (type) => {
  const subtitles = {
    feed: "母乳 / 瓶喂 / 配方",
    diaper: "大小便 / 更换",
    sleep: "时长一键记录",
    medication: "维 AD / 维 D",
    care: "身体乳 / 洗澡",
    outing: "散步 / 出门小记"
  };
  return subtitles[type] || "";
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

const findLatestRecordByType = (type) => {
  const records = readStore().records
    .filter((record) => record.type === type)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return records[0] || null;
};

const getLastActionCards = () => {
  const actionTypes = ["feed", "diaper", "sleep", "medication", "care", "outing"];
  return actionTypes.map((type) => {
    const latestRecord = findLatestRecordByType(type);
    return {
      type,
      title: getRecordTitle(type),
      sinceText: latestRecord ? formatTimeSince(latestRecord.occurredAt) : "还没有记录",
      summaryText: latestRecord ? describeRecord(latestRecord) : "点一下开始第一次记录",
      isEmpty: !latestRecord
    };
  });
};

const getQuickActionCards = () => {
  return getLastActionCards().map((item) => ({
    type: item.type,
    title: item.title,
    subtitle: getActionSubtitle(item.type),
    metaText: item.sinceText,
    summaryText: item.summaryText
  }));
};

const getHomeOverview = () => {
  const baby = getBaby();
  return {
    babyName: baby.nickname || "宝宝",
    ageText: baby.birthDate ? formatAge(baby.birthDate) : "年龄待补充",
    infoText: baby.birthDate ? `出生于 ${baby.birthDate}` : "先补充宝宝生日，首页会自动计算年龄",
    lastActionCards: getLastActionCards(),
    quickActionCards: getQuickActionCards(),
    timeline: getTimelineItems()
  };
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
  const baby = getBaby();
  const reminders = getReminders().filter((reminder) => reminder.enabled);

  const pendingReminder = reminders.find((reminder) => {
    if (!reminder.lastCompletedAt) {
      return true;
    }
    return !sameDay(reminder.lastCompletedAt, today());
  });

  return {
    heroTitle: baby.nickname ? `${baby.nickname} 今天过得很充实` : "从今天开始记录宝宝日常",
    heroSubtitle: pendingReminder
      ? `${pendingReminder.title} 还没完成，建议在 ${pendingReminder.scheduleTime} 前后提醒自己`
      : (baby.nickname ? "高频记录都集中在首页，两步内完成一次记录" : "先添加宝宝资料，再开始喂养、睡眠和里程碑记录")
  };
};

const getMilestoneViewModels = () => {
  return listMilestones().map((milestone) =>
    Object.assign({}, milestone, {
      hasNote: !!milestone.note,
      hasMedia: (milestone.mediaList || []).length > 0,
      mediaCountText: `${(milestone.mediaList || []).length} 个素材`,
      mediaList: (milestone.mediaList || []).map((media) =>
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
          completeOnboarding();
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
    const nextMember = updateLocalCaregiver(displayName, role);
    completeOnboarding();

    if (!canUseCloudSync()) {
      resolve({
        ok: true,
        mode: "local",
        caregiver: nextMember
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
          ok: true,
          mode: "local",
          message: (error && error.message) || "update member profile failed",
          caregiver: nextMember
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
  getCurrentMemberProfile,
  hasBaby,
  getAppEntryState,
  completeOnboarding,
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
  getMilestoneViewModels,
  getHomeOverview
};
