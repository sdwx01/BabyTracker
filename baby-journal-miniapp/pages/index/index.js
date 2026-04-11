const { recordTypes } = require('../../utils/config');
const { saveRecord, getStats } = require('../../utils/store');

Page({
  data: {
    recordTypes,
    activeType: 'feeding',
    amount: '',
    note: '',
    stats: {
      total: 0,
      today: 0,
      countByType: {}
    }
  },

  onShow() {
    this.refreshStats();
  },

  chooseType(e) {
    this.setData({ activeType: e.currentTarget.dataset.type });
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  quickSave() {
    const now = new Date();
    const typeMeta = recordTypes.find((item) => item.key === this.data.activeType) || {};
    const record = {
      id: String(now.getTime()),
      type: this.data.activeType,
      typeLabel: typeMeta.label || '',
      amount: this.data.amount,
      note: this.data.note,
      createdAt: now.getTime(),
      displayTime: `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      dateKey: now.toISOString().slice(0, 10)
    };

    saveRecord(record);
    this.setData({ amount: '', note: '' });
    this.refreshStats();

    wx.showToast({
      title: '已记录',
      icon: 'success'
    });
  },

  refreshStats() {
    this.setData({ stats: getStats() });
  }
});
