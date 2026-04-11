import { today } from "../../utils/date";
import { createMilestone, listMilestones } from "../../utils/store";

Page({
  data: {
    milestones: [],
    showEditor: false,
    titleValue: "",
    dateValue: today(),
    noteValue: "",
    mediaList: []
  },
  onShow() {
    this.refresh();
  },
  refresh() {
    this.setData({
      milestones: listMilestones()
    });
  },
  openEditor() {
    this.setData({
      showEditor: true,
      titleValue: "",
      dateValue: today(),
      noteValue: "",
      mediaList: []
    });
  },
  closeEditor() {
    this.setData({
      showEditor: false
    });
  },
  onInputChange(event: any) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [field]: event.detail.value
    });
  },
  onDateChange(event: any) {
    this.setData({
      dateValue: event.detail.value
    });
  },
  chooseMedia() {
    wx.chooseMedia({
      count: 6,
      mediaType: ["image", "video"],
      success: (result: any) => {
        const mediaList = result.tempFiles.map((file: any) => ({
          id: `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          kind: file.fileType === "video" ? "video" : "image",
          filePath: file.tempFilePath,
          thumbPath: file.thumbTempFilePath || file.tempFilePath
        }));

        this.setData({
          mediaList: [...this.data.mediaList, ...mediaList]
        });
      }
    });
  },
  removeMedia(event: any) {
    const { id } = event.currentTarget.dataset;
    this.setData({
      mediaList: this.data.mediaList.filter((item: any) => item.id !== id)
    });
  },
  submitMilestone() {
    if (!this.data.titleValue.trim()) {
      wx.showToast({
        title: "请输入标题",
        icon: "none"
      });
      return;
    }

    createMilestone({
      title: this.data.titleValue,
      occurredOn: this.data.dateValue,
      note: this.data.noteValue,
      mediaList: this.data.mediaList
    } as any);

    wx.showToast({
      title: "已保存",
      icon: "success"
    });
    this.closeEditor();
    this.refresh();
  }
} as any);
