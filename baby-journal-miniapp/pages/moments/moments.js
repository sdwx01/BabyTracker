const { getMomentRecords } = require('../../utils/store');

Page({
  data: {
    records: []
  },

  onShow() {
    this.setData({ records: getMomentRecords() });
  }
});
