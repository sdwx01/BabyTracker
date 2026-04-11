const { getAppEntryState } = require("./store");

let redirectingToOnboarding = false;

const waitForInitialStore = () => {
  const app = getApp();
  if (app && app.globalData && app.globalData.storeReadyPromise) {
    return app.globalData.storeReadyPromise;
  }
  return Promise.resolve({
    ok: false,
    mode: "local"
  });
};

const ensureReadyOrRedirect = () => {
  return waitForInitialStore().then(() => {
    const state = getAppEntryState();
    if (state === "ready") {
      return {
        ready: true,
        state
      };
    }

    if (!redirectingToOnboarding) {
      redirectingToOnboarding = true;
      wx.navigateTo({
        url: "/pages/onboarding/index",
        complete: () => {
          setTimeout(() => {
            redirectingToOnboarding = false;
          }, 300);
        }
      });
    }

    return {
      ready: false,
      state
    };
  });
};

module.exports = {
  waitForInitialStore,
  ensureReadyOrRedirect
};
