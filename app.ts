import { initializeStore } from "./utils/store";

App({
  globalData: {
    cloudEnabled: false
  },
  onLaunch() {
    initializeStore();

    if (wx.cloud) {
      try {
        wx.cloud.init({
          traceUser: true
        });
        this.globalData.cloudEnabled = true;
      } catch (error) {
        this.globalData.cloudEnabled = false;
      }
    }
  }
} as any);
