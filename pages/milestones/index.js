const { today } = require("../../utils/date");
const { waitForInitialStore } = require("../../utils/page");
const {
  createMilestoneWithMedia,
  deleteMilestoneById,
  getMilestoneById,
  getMilestoneViewModels,
  recycleMilestoneMediaFiles,
  resolveMilestonePreviewSources
} = require("../../utils/store");

const buildPatch = (field, value) => {
  const patch = {};
  patch[field] = value;
  return patch;
};

Page({
  data: {
    milestones: [],
    hasMilestones: false,
    showEditor: false,
    titleValue: "",
    dateValue: today(),
    noteValue: "",
    mediaList: [],
    uploadingMedia: false
  },
  onShow() {
    waitForInitialStore().then(() => {
      this.refresh();
    });
  },
  refresh() {
    const milestones = getMilestoneViewModels();
    this.setData({
      milestones,
      hasMilestones: milestones.length > 0
    });
  },
  openEditor() {
    this.setData({
      showEditor: true,
      titleValue: "",
      dateValue: today(),
      noteValue: "",
      mediaList: [],
      uploadingMedia: false
    });
  },
  closeEditor() {
    this.setData({
      showEditor: false
    });
  },
  onInputChange(event) {
    const { field } = event.currentTarget.dataset;
    this.setData(buildPatch(field, event.detail.value));
  },
  onDateChange(event) {
    this.setData({
      dateValue: event.detail.value
    });
  },
  chooseMedia() {
    wx.chooseMedia({
      count: 6,
      mediaType: ["image", "video"],
      success: (result) => {
        const mediaList = result.tempFiles.map((file) => ({
          id: `${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          kind: file.fileType === "video" ? "video" : "image",
          filePath: file.tempFilePath,
          thumbPath: file.thumbTempFilePath || file.tempFilePath
        }));

        this.setData({
          mediaList: this.data.mediaList.concat(mediaList)
        });
      }
    });
  },
  removeMedia(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({
      mediaList: this.data.mediaList.filter((item) => item.id !== id)
    });
  },
  previewMilestoneMedia(event) {
    const { milestoneId, mediaId } = event.currentTarget.dataset;
    const milestone = getMilestoneById(milestoneId);
    if (!milestone || !milestone.mediaList || !milestone.mediaList.length) {
      return;
    }

    resolveMilestonePreviewSources(milestone.mediaList).then((sources) => {
      const currentIndex = milestone.mediaList.findIndex((item) => item.id === mediaId);
      const safeIndex = currentIndex > -1 ? currentIndex : 0;

      if (typeof wx.previewMedia === "function") {
        wx.previewMedia({
          current: safeIndex,
          sources
        });
        return;
      }

      const currentSource = sources[safeIndex];
      const imageUrls = sources.filter((item) => item.type === "image").map((item) => item.url);
      if (currentSource && currentSource.type === "image" && imageUrls.length) {
        wx.previewImage({
          current: currentSource.url,
          urls: imageUrls
        });
        return;
      }

      wx.showToast({
        title: "当前环境不支持视频预览",
        icon: "none"
      });
    });
  },
  deleteMilestone(event) {
    const { id } = event.currentTarget.dataset;
    const milestone = getMilestoneById(id);
    if (!milestone) {
      return;
    }

    wx.showModal({
      title: "删除里程碑",
      content: "会删除这条里程碑，并尝试回收已上传的媒体文件。",
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        wx.showLoading({
          title: "删除中"
        });
        recycleMilestoneMediaFiles(milestone).then(() => {
          deleteMilestoneById(id);
          wx.hideLoading();
          wx.showToast({
            title: "已删除",
            icon: "success"
          });
          this.refresh();
        });
      }
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

    this.setData({
      uploadingMedia: true
    });
    wx.showLoading({
      title: "保存中"
    });

    createMilestoneWithMedia({
      title: this.data.titleValue,
      occurredOn: this.data.dateValue,
      note: this.data.noteValue,
      mediaList: this.data.mediaList
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: "已保存",
          icon: "success"
        });
        this.closeEditor();
        this.refresh();
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: (error && error.message) || "保存失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({
          uploadingMedia: false
        });
      });
  }
});
