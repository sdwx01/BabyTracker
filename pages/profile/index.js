const {
  bootstrapCloudStore,
  getBaby,
  getCaregivers,
  getDataSourceStatus,
  getInviteCode,
  getMemberSummaries,
  joinFamilyByInviteCode,
  refreshStoreFromCloud,
  setCloudPreference,
  syncStoreToCloud,
  updateMemberProfile,
  updateBaby
} = require("../../utils/store");
const { waitForInitialStore } = require("../../utils/page");

Page({
  data: {
    baby: {},
    caregivers: [],
    hasCaregivers: false,
    inviteCode: "",
    hasInviteCode: false,
    inviteCodeText: "初始化云端后会生成真实邀请码",
    genderLabel: "",
    dataSource: {},
    primaryRoleOptions: ["爸爸", "妈妈", "爷爷", "奶奶", "外婆"],
    extendedRoleOptions: ["外公", "保姆", "月嫂", "阿姨", "其他"]
  },
  onShow() {
    waitForInitialStore().then(() => {
      this.refresh();
    });
  },
  refresh() {
    const baby = getBaby();
    const memberSummaries = getMemberSummaries();
    const fallbackCaregivers = getCaregivers();
    const caregivers = memberSummaries.length ? memberSummaries : fallbackCaregivers;
    this.setData({
      baby,
      caregivers,
      hasCaregivers: caregivers.length > 0,
      inviteCode: getInviteCode(),
      hasInviteCode: !!getInviteCode(),
      inviteCodeText: getInviteCode() || "初始化云端后会生成真实邀请码",
      genderLabel: baby.gender === "girl" ? "女宝宝" : "宝宝",
      dataSource: getDataSourceStatus()
    });
  },
  onCloudPreferenceChange(event) {
    setCloudPreference(event.detail.value);
    this.refresh();
  },
  pullFromCloud() {
    wx.showLoading({
      title: "拉取中"
    });
    refreshStoreFromCloud().then((result) => {
      wx.hideLoading();
      this.refresh();
      wx.showToast({
        title: result && result.ok ? "已拉取" : "使用本地数据",
        icon: result && result.ok ? "success" : "none"
      });
    });
  },
  pushToCloud() {
    wx.showLoading({
      title: "上传中"
    });
    syncStoreToCloud().then((result) => {
      wx.hideLoading();
      this.refresh();
      wx.showToast({
        title: result && result.ok ? "已上传" : "云同步失败",
        icon: result && result.ok ? "success" : "none"
      });
    });
  },
  bootstrapCloud() {
    wx.showLoading({
      title: "初始化中"
    });
    bootstrapCloudStore().then((result) => {
      wx.hideLoading();
      this.refresh();
      wx.showToast({
        title: result && result.ok ? "云端已就绪" : "仍使用本地",
        icon: result && result.ok ? "success" : "none"
      });
    });
  },
  promptCustomRole(callback) {
    wx.showModal({
      title: "自定义称呼",
      editable: true,
      placeholderText: "如 月嫂 / 阿姨 / 姑姑",
      success: (customResult) => {
        const customRole = customResult.content && customResult.content.trim();
        if (customResult.confirm && customRole) {
          callback(customRole);
        }
      }
    });
  },
  showExtendedRoleSheet(callback) {
    wx.showActionSheet({
      itemList: this.data.extendedRoleOptions,
      success: (result) => {
        const role = this.data.extendedRoleOptions[result.tapIndex];
        if (role === "其他") {
          this.promptCustomRole(callback);
          return;
        }
        callback(role);
      },
      fail: () => {
        this.promptCustomRole(callback);
      }
    });
  },
  chooseRole(callback) {
    const itemList = this.data.primaryRoleOptions.concat(["更多身份"]);
    wx.showActionSheet({
      itemList,
      success: (result) => {
        const role = itemList[result.tapIndex];
        if (role === "更多身份") {
          this.showExtendedRoleSheet(callback);
          return;
        }
        callback(role);
      },
      fail: () => {
        this.promptCustomRole(callback);
      }
    });
  },
  updateMyRole() {
    this.chooseRole((role) => {
      wx.showLoading({
        title: "保存中"
      });
      updateMemberProfile(role, role).then((result) => {
        wx.hideLoading();
        this.refresh();
        wx.showToast({
          title: result && result.ok ? "已更新身份" : ((result && result.message) || "更新失败"),
          icon: result && result.ok ? "success" : "none"
        });
      });
    });
  },
  joinFamily() {
    wx.showModal({
      title: "输入邀请码",
      editable: true,
      placeholderText: "如 BABY-AB12CD",
      success: (inviteResult) => {
        const inviteCode = inviteResult.content && inviteResult.content.trim().toUpperCase();
        if (!inviteResult.confirm || !inviteCode) {
          return;
        }

        this.chooseRole((role) => {
              wx.showLoading({
                title: "加入中"
              });
              joinFamilyByInviteCode(inviteCode, role, role).then((result) => {
                wx.hideLoading();
                this.refresh();
                wx.showToast({
                  title: result && result.ok ? "已加入家庭" : ((result && result.message) || "加入失败"),
                  icon: result && result.ok ? "success" : "none"
                });
              });
        });
      }
    });
  },
  editNickname() {
    wx.showModal({
      title: "修改宝宝昵称",
      editable: true,
      placeholderText: "请输入昵称",
      success: (result) => {
        const value = result.content && result.content.trim();
        if (result.confirm && value) {
          updateBaby({
            nickname: value,
            avatarText: value.slice(0, 1)
          });
          this.refresh();
        }
      }
    });
  }
});
