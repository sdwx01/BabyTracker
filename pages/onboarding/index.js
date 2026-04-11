const {
  completeOnboarding,
  getAppEntryState,
  joinFamilyByInviteCode,
  updateBaby
} = require("../../utils/store");
const { waitForInitialStore } = require("../../utils/page");
const { today } = require("../../utils/date");

Page({
  data: {
    mode: "landing",
    isLanding: true,
    isCreateMode: false,
    isJoinMode: false,
    titleText: "开始记录宝宝的每一天",
    subtitleText: "两步内完成一次记录，也能通过邀请码和家人共享同一份成长日记。",
    babyNickname: "",
    birthDate: today(),
    genderOptions: ["女宝宝", "男宝宝"],
    genderIndex: 0,
    genderText: "女宝宝",
    inviteCode: ""
  },
  onShow() {
    waitForInitialStore().then(() => {
      const state = getAppEntryState();
      if (state === "ready") {
        wx.switchTab({
          url: "/pages/home/index"
        });
        return;
      }
      if (state === "needs_baby_setup") {
        this.enterCreateMode(true);
      }
    });
  },
  setMode(mode, titleText, subtitleText) {
    this.setData({
      mode,
      isLanding: mode === "landing",
      isCreateMode: mode === "create",
      isJoinMode: mode === "join",
      titleText,
      subtitleText
    });
  },
  enterCreateMode(fromFamily) {
    this.setMode(
      "create",
      fromFamily ? "先补充宝宝资料" : "添加宝宝开始记录",
      fromFamily
        ? "你已经加入家庭，再补充一下宝宝资料就可以开始记录。"
        : "填写宝宝昵称、生日和性别后，就可以开始记录。"
    );
  },
  startCreateFlow() {
    this.enterCreateMode(false);
  },
  startJoinFlow() {
    this.setMode(
      "join",
      "通过邀请码加入家庭",
      "输入邀请码后，就能和家人共享同一份记录。"
    );
  },
  goBack() {
    this.setMode(
      "landing",
      "开始记录宝宝的每一天",
      "两步内完成一次记录，也能通过邀请码和家人共享同一份成长日记。"
    );
  },
  onInputChange(event) {
    const patch = {};
    patch[event.currentTarget.dataset.field] = event.detail.value;
    this.setData(patch);
  },
  onBirthDateChange(event) {
    this.setData({
      birthDate: event.detail.value
    });
  },
  onGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      genderText: this.data.genderOptions[genderIndex]
    });
  },
  submitCreate() {
    const nickname = this.data.babyNickname.trim();

    if (!nickname) {
      wx.showToast({
        title: "请输入宝宝昵称",
        icon: "none"
      });
      return;
    }

    wx.showLoading({
      title: "保存中"
    });
    updateBaby({
      nickname,
      birthDate: this.data.birthDate,
      gender: this.data.genderIndex === 0 ? "girl" : "boy",
      avatarText: nickname.slice(0, 1)
    });
    completeOnboarding();
    wx.hideLoading();
    wx.switchTab({
      url: "/pages/home/index"
    });
  },
  submitJoin() {
    const inviteCode = this.data.inviteCode.trim().toUpperCase();

    if (!inviteCode) {
      wx.showToast({
        title: "请输入邀请码",
        icon: "none"
      });
      return;
    }

    wx.showLoading({
      title: "加入中"
    });
    joinFamilyByInviteCode(inviteCode, "家庭成员", "家庭成员").then((result) => {
      wx.hideLoading();
      if (!(result && result.ok)) {
        wx.showToast({
          title: (result && result.message) || "加入失败",
          icon: "none"
        });
        return;
      }

      completeOnboarding();
      if (getAppEntryState() === "ready") {
        wx.switchTab({
          url: "/pages/home/index"
        });
        return;
      }

      this.enterCreateMode(true);
      wx.showToast({
        title: "已加入家庭",
        icon: "success"
      });
    });
  }
});
