const { minutesToDuration } = require("../../utils/date");
const { ensureReadyOrRedirect } = require("../../utils/page");
const { getTodaySummary, getWeeklyTrend } = require("../../utils/store");

Page({
  data: {
    cards: [],
    trend: []
  },
  onShow() {
    ensureReadyOrRedirect().then((result) => {
      if (result && result.ready) {
        this.renderPage();
      }
    });
  },
  renderPage() {
    const todaySummary = getTodaySummary();
    this.setData({
      cards: [
        {
          label: "今日喂奶",
          value: `${todaySummary.feedCount} 次`,
          detail: todaySummary.totalMilkMl ? `${todaySummary.totalMilkMl} ml` : "以次数为主"
        },
        {
          label: "今日睡眠",
          value: minutesToDuration(todaySummary.sleepMinutes),
          detail: "按照记录时长累计"
        },
        {
          label: "今日尿布",
          value: `${todaySummary.diaperCount} 次`,
          detail: "包含大小便和更换"
        },
        {
          label: "今日喂药",
          value: `${todaySummary.medicationDoneCount} 次`,
          detail: "以当天完成记录为准"
        }
      ],
      trend: getWeeklyTrend().map((item) =>
        Object.assign({}, item, {
          sleepLabel: minutesToDuration(item.sleepMinutes)
        })
      )
    });
  }
});
