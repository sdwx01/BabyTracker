const { formatTime, today } = require("../../utils/date");
const { waitForInitialStore } = require("../../utils/page");
const {
  createRecord,
  deleteRecord,
  duplicateRecord,
  getDashboardCards,
  getRecordById,
  getQuickInsights,
  getTimelineItems,
  updateRecord
} = require("../../utils/store");

const quickActions = [
  { type: "feed", title: "喂奶", subtitle: "母乳 / 瓶喂 / 配方" },
  { type: "diaper", title: "尿布", subtitle: "大小便 / 更换" },
  { type: "sleep", title: "睡眠", subtitle: "时长一键记录" },
  { type: "medication", title: "喂药", subtitle: "维 AD / 维 D" },
  { type: "care", title: "护理", subtitle: "身体乳 / 洗澡" },
  { type: "outing", title: "外出", subtitle: "散步 / 出门小记" }
];

const buildPatch = (field, value) => {
  const patch = {};
  patch[field] = value;
  return patch;
};

Page({
  data: {
    quickActions,
    heroTitle: "",
    heroSubtitle: "",
    dashboardCards: [],
    timeline: [],
    hasTimeline: false,
    showComposer: false,
    isEditing: false,
    editingRecordId: "",
    composerTitle: "新增喂奶",
    composerSubtitle: "母乳 / 瓶喂 / 配方",
    composerSubmitText: "保存记录",
    activeAction: quickActions[0],
    isFeedComposer: true,
    isDiaperComposer: false,
    isSleepComposer: false,
    isMedicationComposer: false,
    isCareComposer: false,
    isOutingComposer: false,
    dateValue: today(),
    timeValue: formatTime(new Date()),
    noteValue: "",
    modeOptions: ["母乳", "瓶喂", "配方"],
    modeIndex: 0,
    showSideField: true,
    amountValue: "",
    durationValue: "",
    sideOptions: ["左侧", "右侧", "双侧"],
    sideIndex: 2,
    diaperKindOptions: ["小便", "大便", "混合", "仅换尿布"],
    diaperKindIndex: 0,
    diaperStatusOptions: ["正常", "偏稀", "偏干", "很多"],
    diaperStatusIndex: 0,
    medicationOptions: ["维生素AD", "维生素D", "益生菌", "其他"],
    medicationIndex: 0,
    dosageValue: "",
    careTypeOptions: ["擦身体乳", "洗澡", "抚触", "清洁护理"],
    careTypeIndex: 0,
    outingTypeOptions: ["散步", "外出看诊", "晒太阳", "探亲"],
    outingTypeIndex: 0
  },
  onShow() {
    waitForInitialStore().then(() => {
      this.refresh();
    });
  },
  refresh() {
    const insight = getQuickInsights();
    const timeline = getTimelineItems();
    this.setData({
      heroTitle: insight.heroTitle,
      heroSubtitle: insight.heroSubtitle,
      dashboardCards: getDashboardCards(),
      timeline,
      hasTimeline: timeline.length > 0
    });
  },
  updateComposerState(type) {
    this.setData({
      isFeedComposer: type === "feed",
      isDiaperComposer: type === "diaper",
      isSleepComposer: type === "sleep",
      isMedicationComposer: type === "medication",
      isCareComposer: type === "care",
      isOutingComposer: type === "outing"
    });
  },
  updateFeedModeState(modeIndex) {
    const mode = this.data.modeOptions[typeof modeIndex === "number" ? modeIndex : this.data.modeIndex];
    this.setData({
      showSideField: mode === "母乳"
    });
  },
  updateComposerCopy(activeAction, isEditing) {
    this.setData({
      composerTitle: `${isEditing ? "编辑" : "新增"}${activeAction.title}`,
      composerSubtitle: isEditing ? "修改后会直接覆盖原记录" : activeAction.subtitle,
      composerSubmitText: isEditing ? "保存修改" : "保存记录"
    });
  },
  openComposer(event) {
    const { type } = event.currentTarget.dataset;
    const activeAction = quickActions.find((action) => action.type === type) || quickActions[0];
    this.updateComposerState(activeAction.type);
    this.updateComposerCopy(activeAction, false);
    this.setData({
      showComposer: true,
      isEditing: false,
      editingRecordId: "",
      activeAction,
      dateValue: today(),
      timeValue: formatTime(new Date()),
      noteValue: "",
      amountValue: "",
      durationValue: "",
      dosageValue: ""
    });
    this.updateFeedModeState(0);
  },
  openEditComposer(event) {
    const { id } = event.currentTarget.dataset;
    const record = getRecordById(id);
    if (!record) {
      return;
    }

    const activeAction = quickActions.find((action) => action.type === record.type) || quickActions[0];
    const occurredAt = record.occurredAt || `${today()} ${formatTime(new Date())}`;
    const dateValue = occurredAt.slice(0, 10);
    const timeValue = occurredAt.slice(11, 16);
    const payload = record.payload || {};
    const nextModeIndex = Math.max(0, this.data.modeOptions.indexOf(payload.mode || "母乳"));

    this.updateComposerState(activeAction.type);
    this.updateComposerCopy(activeAction, true);
    this.setData({
      showComposer: true,
      isEditing: true,
      editingRecordId: id,
      activeAction,
      dateValue,
      timeValue,
      noteValue: record.note || "",
      modeIndex: nextModeIndex,
      amountValue: payload.amountMl ? String(payload.amountMl) : "",
      durationValue: payload.durationMin ? String(payload.durationMin) : "",
      sideIndex: Math.max(0, this.data.sideOptions.indexOf(payload.side || "双侧")),
      diaperKindIndex: Math.max(0, this.data.diaperKindOptions.indexOf(payload.diaperKind || "小便")),
      diaperStatusIndex: Math.max(0, this.data.diaperStatusOptions.indexOf(payload.diaperStatus || "正常")),
      medicationIndex: Math.max(0, this.data.medicationOptions.indexOf(payload.medicationName || "维生素AD")),
      dosageValue: payload.dosage || "",
      careTypeIndex: Math.max(0, this.data.careTypeOptions.indexOf(payload.careType || "擦身体乳")),
      outingTypeIndex: Math.max(0, this.data.outingTypeOptions.indexOf(payload.outingType || "散步"))
    });
    this.updateFeedModeState(nextModeIndex);
  },
  closeComposer() {
    this.setData({
      showComposer: false,
      isEditing: false,
      editingRecordId: "",
      composerTitle: "新增喂奶",
      composerSubtitle: "母乳 / 瓶喂 / 配方",
      composerSubmitText: "保存记录"
    });
  },
  onDateChange(event) {
    this.setData({ dateValue: event.detail.value });
  },
  onTimeChange(event) {
    this.setData({ timeValue: event.detail.value });
  },
  onInputChange(event) {
    const { field } = event.currentTarget.dataset;
    this.setData(buildPatch(field, event.detail.value));
  },
  onPickerChange(event) {
    const { field } = event.currentTarget.dataset;
    const nextValue = Number(event.detail.value);
    this.setData(buildPatch(field, nextValue));
    if (field === "modeIndex") {
      this.updateFeedModeState(nextValue);
    }
  },
  submitComposer() {
    const {
      activeAction,
      dateValue,
      timeValue,
      noteValue,
      modeOptions,
      modeIndex,
      amountValue,
      durationValue,
      sideOptions,
      sideIndex,
      diaperKindOptions,
      diaperKindIndex,
      diaperStatusOptions,
      diaperStatusIndex,
      medicationOptions,
      medicationIndex,
      dosageValue,
      careTypeOptions,
      careTypeIndex,
      outingTypeOptions,
      outingTypeIndex,
      isEditing,
      editingRecordId
    } = this.data;

    const payload = {};

    if (activeAction.type === "feed") {
      payload.mode = modeOptions[modeIndex];
      payload.amountMl = Number(amountValue) || undefined;
      payload.durationMin = Number(durationValue) || undefined;
      payload.side = modeOptions[modeIndex] === "母乳" ? sideOptions[sideIndex] : undefined;
    }

    if (activeAction.type === "diaper") {
      payload.diaperKind = diaperKindOptions[diaperKindIndex];
      payload.diaperStatus = diaperStatusOptions[diaperStatusIndex];
    }

    if (activeAction.type === "sleep") {
      payload.durationMin = Number(durationValue) || 0;
    }

    if (activeAction.type === "medication") {
      payload.medicationName = medicationOptions[medicationIndex];
      payload.dosage = dosageValue || "已服用";
    }

    if (activeAction.type === "care") {
      payload.careType = careTypeOptions[careTypeIndex];
    }

    if (activeAction.type === "outing") {
      payload.outingType = outingTypeOptions[outingTypeIndex];
      payload.durationMin = Number(durationValue) || undefined;
    }

    if (isEditing && editingRecordId) {
      updateRecord(editingRecordId, {
        type: activeAction.type,
        occurredAt: `${dateValue} ${timeValue}`,
        note: noteValue,
        payload
      });
    } else {
      createRecord({
        type: activeAction.type,
        occurredAt: `${dateValue} ${timeValue}`,
        note: noteValue,
        payload
      });
    }

    wx.showToast({
      title: isEditing ? "已更新" : "已记录",
      icon: "success"
    });

    this.closeComposer();
    this.refresh();
  },
  onDeleteRecord(event) {
    const { id } = event.currentTarget.dataset;
    wx.showModal({
      title: "删除记录",
      content: "这条记录会从时间轴中移除。",
      success: (result) => {
        if (result.confirm) {
          deleteRecord(id);
          this.refresh();
        }
      }
    });
  },
  onDuplicateRecord(event) {
    const { id } = event.currentTarget.dataset;
    duplicateRecord(id);
    wx.showToast({
      title: "已复制一条",
      icon: "success"
    });
    this.refresh();
  }
});
