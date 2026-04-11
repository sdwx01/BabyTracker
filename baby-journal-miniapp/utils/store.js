const RECORDS_KEY = 'babyJournalRecords';

function getRecords() {
  return (wx.getStorageSync(RECORDS_KEY) || []).sort((a, b) => b.createdAt - a.createdAt);
}

function saveRecord(record) {
  const records = getRecords();
  records.unshift(record);
  wx.setStorageSync(RECORDS_KEY, records);
  return records;
}

function getMomentRecords() {
  return getRecords().filter((item) => item.type === 'milestone');
}

function getStats() {
  const records = getRecords();
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todayRecords = records.filter((item) => item.dateKey === todayKey);
  const countByType = records.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  return {
    total: records.length,
    today: todayRecords.length,
    countByType,
    latest: records.slice(0, 5)
  };
}

module.exports = {
  getRecords,
  saveRecord,
  getMomentRecords,
  getStats
};
