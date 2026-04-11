import { minutesToDuration } from "../../utils/date";
import { getTodaySummary, getWeeklyTrend } from "../../utils/store";

Page({
  data: {
    cards: [],
    trend: []
  },
  onShow() {
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
      trend: getWeeklyTrend().map((item) => ({
        ...item,
        sleepLabel: minutesToDuration(item.sleepMinutes)
      }))
    });
  }
} as any);
