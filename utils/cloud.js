const { formatDateTime } = require("./date");

const CALL_FUNCTION_NAME = "babyTracker";

const isCloudAvailable = () => {
  return !!(wx.cloud && typeof wx.cloud.callFunction === "function");
};

const callCloud = (action, payload) => {
  return new Promise((resolve, reject) => {
    if (!isCloudAvailable()) {
      reject(new Error("cloud unavailable"));
      return;
    }

    wx.cloud.callFunction({
      name: CALL_FUNCTION_NAME,
      data: Object.assign({ action }, payload || {}),
      success: (result) => {
        const data = result && result.result ? result.result : {};
        if (data.ok) {
          resolve(data);
          return;
        }
        reject(new Error((data && data.message) || "cloud action failed"));
      },
      fail: reject
    });
  });
};

const cloudBootstrap = (localStore) => callCloud("bootstrap", { localStore });
const cloudGetStore = (localStore) => callCloud("getStore", { localStore });
const cloudSyncStore = (store) => callCloud("syncStore", { store });
const cloudJoinFamily = (inviteCode, caregiverName, caregiverRole) =>
  callCloud("joinFamily", {
    inviteCode,
    caregiverName,
    caregiverRole
  });
const cloudUpdateMemberProfile = (displayName, role, localStore) =>
  callCloud("updateMemberProfile", {
    displayName,
    role,
    localStore
  });

const getFileExtension = (filePath) => {
  const normalized = (filePath || "").split("?")[0];
  const match = normalized.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
};

const uploadSingleFile = (familyId, mediaId, sourcePath, suffix) => {
  return new Promise((resolve, reject) => {
    if (!sourcePath) {
      resolve("");
      return;
    }

    wx.cloud.uploadFile({
      cloudPath: `families/${familyId || "local"}/milestones/${mediaId}_${suffix}.${getFileExtension(sourcePath)}`,
      filePath: sourcePath,
      success: (result) => {
        resolve(result.fileID || "");
      },
      fail: reject
    });
  });
};

const uploadMilestoneMediaList = (familyId, mediaList) => {
  return Promise.all(
    (mediaList || []).map((media, index) => {
      const mediaId = media.id || `media_${Date.now()}_${index}`;
      return uploadSingleFile(familyId, mediaId, media.filePath, "source").then((fileID) =>
        uploadSingleFile(familyId, mediaId, media.thumbPath || media.filePath, "thumb").then((thumbFileID) =>
          Object.assign({}, media, {
            id: mediaId,
            cloudFileId: fileID,
            thumbCloudFileId: thumbFileID || fileID,
            filePath: fileID || media.filePath,
            thumbPath: thumbFileID || fileID || media.thumbPath || media.filePath,
            uploadedAt: formatDateTime(new Date())
          })
        )
      );
    })
  );
};

const getTempFileUrls = (fileList) => {
  return new Promise((resolve, reject) => {
    const fileIDs = (fileList || []).filter(Boolean);
    if (!fileIDs.length) {
      resolve([]);
      return;
    }

    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: (result) => {
        resolve((result.fileList || []).map((item) => item.tempFileURL || item.tempFileUrl || ""));
      },
      fail: reject
    });
  });
};

const deleteCloudFiles = (fileList) => {
  return new Promise((resolve, reject) => {
    const fileListClean = (fileList || []).filter(Boolean);
    if (!fileListClean.length) {
      resolve({
        fileList: []
      });
      return;
    }

    wx.cloud.deleteFile({
      fileList: fileListClean,
      success: resolve,
      fail: reject
    });
  });
};

const toSyncStamp = () => formatDateTime(new Date());

module.exports = {
  CALL_FUNCTION_NAME,
  isCloudAvailable,
  cloudBootstrap,
  cloudGetStore,
  cloudSyncStore,
  cloudJoinFamily,
  cloudUpdateMemberProfile,
  uploadMilestoneMediaList,
  getTempFileUrls,
  deleteCloudFiles,
  toSyncStamp
};
