const { completeReminder, getReminders, upsertReminder, toggleReminder } = require("../../utils/store");
const { waitForInitialStore } = require("../../utils/page");

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
    titleValue: "",
    dosageValue: "",
    timeValue: "08:00"
  },
  onShow() {
    waitForInitialStore().then(() => {
      this.refresh();
    });
  },
  refresh() {
    const reminders = getReminders().map((item) =>
      Object.assign({}, item, {
        statusText: item.lastCompletedAt ? `最近完成：${item.lastCompletedAt}` : "今天还未完成"
      })
    );
    this.setData({
      reminders,
      hasReminders: reminders.length > 0
    });
  },
  onSwitchChange(event) {
    const { id } = event.currentTarget.dataset;
    toggleReminder(id, event.detail.value);
    this.refresh();
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
      titleValue: "",
      dosageValue: "",
      timeValue: "08:00"
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
      frequencyLabel: "每日"
    });

    wx.showToast({
      title: "已保存提醒",
      icon: "success"
    });
    this.closeEditor();
    this.refresh();
  }
});
