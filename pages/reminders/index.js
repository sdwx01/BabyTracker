const { completeReminder, getReminders, upsertReminder } = require("../../utils/store");
const { ensureReadyOrRedirect } = require("../../utils/page");

const buildPatch = (field, value) => {
  const patch = {};
  patch[field] = value;
  return patch;
};

Page({
  data: {
    reminders: [],
    hasReminders: false,
    showEditor: false,
    editingId: "",
    editorTitle: "新增提醒",
    titleValue: "",
    dosageValue: "",
    timeValue: "08:00",
    enabledValue: true
  },
  onShow() {
    ensureReadyOrRedirect().then((result) => {
      if (result && result.ready) {
        this.refresh();
      }
    });
  },
  refresh() {
    const reminders = getReminders().map((item) =>
      Object.assign({}, item, {
        statusText: item.enabled
          ? (item.lastCompletedAt ? `最近完成：${item.lastCompletedAt}` : "今天还未完成")
          : "提醒已暂停"
      })
    );
    this.setData({
      reminders,
      hasReminders: reminders.length > 0
    });
  },
  completeReminder(event) {
    const { id } = event.currentTarget.dataset;
    completeReminder(id);
    wx.showToast({
      title: "已标记完成",
      icon: "success"
    });
    this.refresh();
  },
  openEditor() {
    this.setData({
      showEditor: true,
      editingId: "",
      editorTitle: "新增提醒",
      titleValue: "",
      dosageValue: "",
      timeValue: "08:00",
      enabledValue: true
    });
  },
  openEditReminder(event) {
    const { id } = event.currentTarget.dataset;
    const reminder = getReminders().find((item) => item.id === id);
    if (!reminder) {
      return;
    }

    this.setData({
      showEditor: true,
      editingId: reminder.id,
      editorTitle: "编辑提醒",
      titleValue: reminder.title || "",
      dosageValue: reminder.dosage || "",
      timeValue: reminder.scheduleTime || "08:00",
      enabledValue: reminder.enabled !== false
    });
  },
  closeEditor() {
    this.setData({
      showEditor: false
    });
  },
  onInputChange(event) {
    const { field } = event.currentTarget.dataset;
    this.setData(buildPatch(field, event.detail.value));
  },
  onTimeChange(event) {
    this.setData({
      timeValue: event.detail.value
    });
  },
  onEnabledChange(event) {
    this.setData({
      enabledValue: !!event.detail.value
    });
  },
  submitReminder() {
    if (!this.data.titleValue.trim()) {
      wx.showToast({
        title: "请输入提醒名称",
        icon: "none"
      });
      return;
    }

    upsertReminder({
      id: this.data.editingId || undefined,
      title: this.data.titleValue,
      dosage: this.data.dosageValue || "按时服用",
      scheduleTime: this.data.timeValue,
      frequencyLabel: "每日",
      enabled: this.data.enabledValue
    });

    this.closeEditor();
    this.refresh();
    wx.showToast({
      title: "已保存提醒",
      icon: "success"
    });
  }
});
