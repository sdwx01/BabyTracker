const {
  getDataSourceStatus,
  getInviteCode,
  getMemberSummaries,
  joinFamilyByInviteCode
} = require("../../utils/store");
const { waitForInitialStore } = require("../../utils/page");

Page({
  data: {
    inviteCodeText: "开启云端同步后会自动生成邀请码",
    hasInviteCode: false,
    members: [],
    hasMembers: false,
    dataSource: {}
  },
  onShow() {
    waitForInitialStore().then(() => {
      this.refresh();
    });
  },
  refresh() {
    const members = getMemberSummaries();
    const inviteCode = getInviteCode();
    this.setData({
      members,
      hasMembers: members.length > 0,
      inviteCodeText: inviteCode || "开启云端同步后会自动生成邀请码",
      hasInviteCode: !!inviteCode,
      dataSource: getDataSourceStatus()
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
  promptCustomRole(callback) {
    wx.showModal({
      title: "自定义称呼",
      editable: true,
      placeholderText: "如 姑姑 / 舅舅 / 育儿嫂",
      success: (result) => {
        const value = result.content && result.content.trim();
        if (result.confirm && value) {
          callback(value);
        }
      }
    });
  },
  chooseRole(callback) {
    const firstLevel = ["爸爸", "妈妈", "爷爷", "奶奶", "外婆", "更多身份"];
    const secondLevel = ["外公", "保姆", "月嫂", "阿姨", "其他"];
    wx.showActionSheet({
      itemList: firstLevel,
      success: (result) => {
        const role = firstLevel[result.tapIndex];
        if (role !== "更多身份") {
          callback(role);
          return;
        }
        wx.showActionSheet({
          itemList: secondLevel,
          success: (nextResult) => {
            const nextRole = secondLevel[nextResult.tapIndex];
            if (nextRole === "其他") {
              this.promptCustomRole(callback);
              return;
            }
            callback(nextRole);
          },
          fail: () => {
            this.promptCustomRole(callback);
          }
        });
      },
      fail: () => {
        this.promptCustomRole(callback);
      }
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
