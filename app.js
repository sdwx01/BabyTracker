const { CLOUD_ENV_ID } = require("./utils/config");
const { bootstrapCloudStore, configureCloudStatus, initializeStore } = require("./utils/store");

App({
  globalData: {
    cloudEnabled: false,
    cloudEnvId: CLOUD_ENV_ID || "",
    storeReadyPromise: Promise.resolve({
      ok: false,
      mode: "local"
    })
  },
  onLaunch() {
    initializeStore();

    if (wx.cloud) {
      try {
        const cloudOptions = {
          traceUser: true
        };

        if (CLOUD_ENV_ID) {
          cloudOptions.env = CLOUD_ENV_ID;
        }

        wx.cloud.init(cloudOptions);
        this.globalData.cloudEnabled = !!CLOUD_ENV_ID;
        configureCloudStatus({
          cloudReady: !!CLOUD_ENV_ID,
          cloudEnvId: CLOUD_ENV_ID || ""
        });
        if (CLOUD_ENV_ID) {
          this.globalData.storeReadyPromise = bootstrapCloudStore();
        }
      } catch (error) {
        this.globalData.cloudEnabled = false;
        this.globalData.storeReadyPromise = Promise.resolve({
          ok: false,
          mode: "local"
        });
        configureCloudStatus({
          cloudReady: false,
          cloudEnvId: CLOUD_ENV_ID || ""
        });
      }
    } else {
      this.globalData.storeReadyPromise = Promise.resolve({
        ok: false,
        mode: "local"
      });
      configureCloudStatus({
        cloudReady: false,
        cloudEnvId: CLOUD_ENV_ID || ""
      });
    }
  }
});
