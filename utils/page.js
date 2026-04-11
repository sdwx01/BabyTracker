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

module.exports = {
  waitForInitialStore
};
