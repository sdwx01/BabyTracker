const {
  bootstrapCloudStore,
  getBaby,
  getDataSourceStatus,
  getInviteCode,
  joinFamilyByInviteCode,
  setCloudPreference,
  updateBaby
} = require("../../utils/store");
const { ensureReadyOrRedirect } = require("../../utils/page");

Page({
  data: {
    baby: {},
    hasBaby: false,
    avatarText: "宝",
    profileTitle: "还没添加宝宝",
    profileMeta: "完成宝宝资料后，就可以开始记录喂奶、睡眠和第一次。",
    nicknameText: "未设置",
    birthDateText: "未设置",
    genderText: "未设置",
    dataSource: {},
    inviteCodeText: "开启云端同步后会自动生成邀请码",
    hasInviteCode: false,
    showBabyEditor: false,
    editorNickname: "",
    editorBirthDate: "",
    editorGenderIndex: 0,
    editorBirthDateText: "请选择出生日期",
    editorGenderText: "女宝宝",
    genderOptions: ["女宝宝", "男宝宝"]
  },
  onShow() {
    ensureReadyOrRedirect().then((result) => {
      if (result && result.ready) {
        this.refresh();
      }
    });
  },
  refresh() {
    const baby = getBaby();
    const genderMap = {
      girl: "女宝宝",
      boy: "男宝宝"
    };
    const inviteCode = getInviteCode();

    this.setData({
      baby,
      hasBaby: !!baby.nickname,
      avatarText: baby.avatarText || "宝",
      profileTitle: baby.nickname || "还没添加宝宝",
      profileMeta: baby.nickname ? `出生于 ${baby.birthDate} · ${genderMap[baby.gender] || "宝宝"}` : "完成宝宝资料后，就可以开始记录喂奶、睡眠和第一次。",
      nicknameText: baby.nickname || "未设置",
      birthDateText: baby.birthDate || "未设置",
      genderText: genderMap[baby.gender] || "未设置",
      dataSource: getDataSourceStatus(),
      inviteCodeText: inviteCode || "开启云端同步后会自动生成邀请码",
      hasInviteCode: !!inviteCode
    });
  },
  onCloudPreferenceChange(event) {
    const enabled = !!event.detail.value;
    setCloudPreference(enabled);

    if (!enabled) {
      this.refresh();
      wx.showToast({
        title: "已切换为本地保存",
        icon: "none"
      });
      return;
    }

    wx.showLoading({
      title: "连接中"
    });
    bootstrapCloudStore().then(() => {
      wx.hideLoading();
      this.refresh();
      wx.showToast({
        title: "已开启云端同步",
        icon: "success"
      });
    });
  },
  editBaby() {
    this.setData({
      showBabyEditor: true,
      editorNickname: this.data.baby.nickname || "",
      editorBirthDate: this.data.baby.birthDate || "",
      editorGenderIndex: this.data.baby.gender === "boy" ? 1 : 0,
      editorBirthDateText: this.data.baby.birthDate || "请选择出生日期",
      editorGenderText: this.data.baby.gender === "boy" ? "男宝宝" : "女宝宝"
    });
  },
  closeBabyEditor() {
    this.setData({
      showBabyEditor: false
    });
  },
  onEditorInputChange(event) {
    const patch = {};
    patch[event.currentTarget.dataset.field] = event.detail.value;
    this.setData(patch);
  },
  onEditorBirthDateChange(event) {
    this.setData({
      editorBirthDate: event.detail.value,
      editorBirthDateText: event.detail.value
    });
  },
  onEditorGenderChange(event) {
    const editorGenderIndex = Number(event.detail.value);
    this.setData({
      editorGenderIndex,
      editorGenderText: this.data.genderOptions[editorGenderIndex]
    });
  },
  submitBabyEditor() {
    const nickname = (this.data.editorNickname || "").trim();
    const birthDate = (this.data.editorBirthDate || "").trim();

    if (!nickname) {
      wx.showToast({
        title: "请输入宝宝昵称",
        icon: "none"
      });
      return;
    }

    if (!birthDate) {
      wx.showToast({
        title: "请选择出生日期",
        icon: "none"
      });
      return;
    }

    updateBaby({
      nickname,
      birthDate,
      gender: this.data.editorGenderIndex === 0 ? "girl" : "boy",
      avatarText: nickname.slice(0, 1)
    });
    this.closeBabyEditor();
    this.refresh();
    wx.showToast({
      title: "已保存",
      icon: "success"
    });
  },
  copyInviteCode() {
    if (!this.data.hasInviteCode) {
      wx.showToast({
        title: "还没有可用邀请码",
        icon: "none"
      });
      return;
    }
    wx.setClipboardData({
      data: this.data.inviteCodeText
    });
  },
  joinFamily() {
    if (!this.data.dataSource.canUseCloud) {
      wx.showToast({
        title: "请先开启云端同步",
        icon: "none"
      });
      return;
    }

    wx.showModal({
      title: "输入邀请码",
      editable: true,
      placeholderText: "如 BABY-AB12CD",
      success: (inviteResult) => {
        const inviteCode = inviteResult.content && inviteResult.content.trim().toUpperCase();
        if (!inviteResult.confirm || !inviteCode) {
          return;
        }

        wx.showLoading({
          title: "加入中"
        });
        joinFamilyByInviteCode(inviteCode, "家庭成员", "家庭成员").then((result) => {
          wx.hideLoading();
          this.refresh();
          wx.showToast({
            title: result && result.ok ? "已加入家庭" : ((result && result.message) || "加入失败"),
            icon: result && result.ok ? "success" : "none"
          });
        });
      }
    });
  }
});
