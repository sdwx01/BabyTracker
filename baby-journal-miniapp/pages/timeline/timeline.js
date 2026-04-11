const { getRecords } = require('../../utils/store');

Page({
  data: {
    records: []
  },

  onShow() {
    this.setData({ records: getRecords() });
  }
});
