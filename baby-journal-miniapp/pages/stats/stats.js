const { getStats } = require('../../utils/store');
const { recordTypes } = require('../../utils/config');

Page({
  data: {
    stats: null,
    summary: []
  },

  onShow() {
    const stats = getStats();
    const summary = recordTypes.map((item) => ({
      label: item.label,
      count: stats.countByType[item.key] || 0
    }));
    this.setData({ stats, summary });
  }
});
