import { completeReminder, getReminders, upsertReminder, toggleReminder } from "../../utils/store";

Page({
  data: {
    reminders: [],
    showEditor: false,
    editingId: "",
    titleValue: "",
    dosageValue: "",
    timeValue: "08:00"
  },
  onShow() {
    this.refresh();
  },
  refresh() {
    this.setData({
      reminders: getReminders().map((item) => ({
        ...item,
        statusText: item.lastCompletedAt ? `最近完成：${item.lastCompletedAt}` : "今天还未完成"
      }))
    });
  },
  onSwitchChange(event: any) {
    const { id } = event.currentTarget.dataset;
    toggleReminder(id, event.detail.value);
    this.refresh();
  },
  completeReminder(event: any) {
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
  onInputChange(event: any) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [field]: event.detail.value
    });
  },
  onTimeChange(event: any) {
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
    } as any);

    wx.showToast({
      title: "已保存提醒",
      icon: "success"
    });
    this.closeEditor();
    this.refresh();
  }
} as any);
