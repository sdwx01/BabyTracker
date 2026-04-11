import { getBaby, getCaregivers, getInviteCode, updateBaby } from "../../utils/store";

Page({
  data: {
    baby: {},
    caregivers: [],
    inviteCode: ""
  },
  onShow() {
    this.refresh();
  },
  refresh() {
    const baby = getBaby();
    this.setData({
      baby,
      caregivers: getCaregivers(),
      inviteCode: getInviteCode(),
      genderLabel: baby.gender === "girl" ? "女宝宝" : "宝宝"
    });
  },
  editNickname() {
    wx.showModal({
      title: "修改宝宝昵称",
      editable: true,
      placeholderText: "请输入昵称",
      success: (result: any) => {
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
} as any);
