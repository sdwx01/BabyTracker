import { formatDate, formatTime, today } from "../../utils/date";
import {
  createRecord,
  deleteRecord,
  duplicateRecord,
  getDashboardCards,
  getQuickInsights,
  getTimelineItems
} from "../../utils/store";

const quickActions = [
  { type: "feed", title: "喂奶", subtitle: "母乳 / 瓶喂 / 配方" },
  { type: "diaper", title: "尿布", subtitle: "大小便 / 更换" },
  { type: "sleep", title: "睡眠", subtitle: "时长一键记录" },
  { type: "medication", title: "喂药", subtitle: "维 AD / 维 D" },
  { type: "care", title: "护理", subtitle: "身体乳 / 洗澡" },
  { type: "outing", title: "外出", subtitle: "散步 / 出门小记" }
];

Page({
  data: {
    quickActions,
    heroTitle: "",
    heroSubtitle: "",
    dashboardCards: [],
    timeline: [],
    showComposer: false,
    activeAction: quickActions[0],
    dateValue: today(),
    timeValue: formatTime(new Date()),
    noteValue: "",
    modeOptions: ["母乳", "瓶喂", "配方"],
    modeIndex: 0,
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
    this.refresh();
  },
  refresh() {
    const insight = getQuickInsights();
    this.setData({
      heroTitle: insight.heroTitle,
      heroSubtitle: insight.heroSubtitle,
      dashboardCards: getDashboardCards(),
      timeline: getTimelineItems()
    });
  },
  openComposer(event: any) {
    const { type } = event.currentTarget.dataset;
    const activeAction = quickActions.find((action) => action.type === type) || quickActions[0];
    this.setData({
      showComposer: true,
      activeAction,
      dateValue: today(),
      timeValue: formatTime(new Date()),
      noteValue: "",
      amountValue: "",
      durationValue: "",
      dosageValue: ""
    });
  },
  closeComposer() {
    this.setData({
      showComposer: false
    });
  },
  onDateChange(event: any) {
    this.setData({ dateValue: event.detail.value });
  },
  onTimeChange(event: any) {
    this.setData({ timeValue: event.detail.value });
  },
  onInputChange(event: any) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [field]: event.detail.value
    });
  },
  onPickerChange(event: any) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [field]: Number(event.detail.value)
    });
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
      outingTypeIndex
    } = this.data as any;

    const payload: Record<string, any> = {};

    if (activeAction.type === "feed") {
      payload.mode = modeOptions[modeIndex];
      payload.amountMl = Number(amountValue) || undefined;
      payload.durationMin = Number(durationValue) || undefined;
      payload.side = sideOptions[sideIndex];
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

    createRecord({
      type: activeAction.type,
      occurredAt: `${dateValue} ${timeValue}`,
      note: noteValue,
      payload
    } as any);

    wx.showToast({
      title: "已记录",
      icon: "success"
    });

    this.closeComposer();
    this.refresh();
  },
  onDeleteRecord(event: any) {
    const { id } = event.currentTarget.dataset;
    wx.showModal({
      title: "删除记录",
      content: "这条记录会从时间轴中移除。",
      success: (result: any) => {
        if (result.confirm) {
          deleteRecord(id);
          this.refresh();
        }
      }
    });
  },
  onDuplicateRecord(event: any) {
    const { id } = event.currentTarget.dataset;
    duplicateRecord(id);
    wx.showToast({
      title: "已复制一条",
      icon: "success"
    });
    this.refresh();
  }
} as any);
