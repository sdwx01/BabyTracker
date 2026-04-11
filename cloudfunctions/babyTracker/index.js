const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const families = db.collection("bt_families");
const members = db.collection("bt_members");
const _ = db.command;

const randomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const generateInviteCode = () => `BABY-${randomCode()}`;

const normalizeSeedCaregivers = (caregivers) => {
  const list = Array.isArray(caregivers) ? caregivers : [];
  if (
    list.length === 2 &&
    list[0] &&
    list[1] &&
    list[0].id === "cg_mama" &&
    list[1].id === "cg_baba" &&
    list[0].name === "妈妈" &&
    list[1].name === "爸爸"
  ) {
    return [
      {
        id: "cg_owner",
        name: "当前照护者",
        role: "创建者",
        joinedAt: list[0].joinedAt || new Date().toISOString().replace("T", " ").slice(0, 16)
      }
    ];
  }
  return list;
};

const createSeedStore = () => {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const today = now.slice(0, 10);

  return {
    baby: {
      id: "baby_1",
      nickname: "糯米",
      birthDate: "2025-12-02",
      gender: "girl",
      avatarText: "糯"
    },
    caregivers: [
      {
        id: "cg_owner",
        name: "当前照护者",
        role: "创建者",
        joinedAt: now
      }
    ],
    records: [
      {
        id: `record_${Date.now()}`,
        babyId: "baby_1",
        type: "feed",
        occurredAt: `${today} 08:30`,
        createdBy: "cg_owner",
        note: "云端初始化样例数据",
        payload: {
          mode: "瓶喂",
          amountMl: 120
        }
      }
    ],
    milestones: [],
    reminders: []
  };
};

const sanitizeStore = (store) => {
  if (!store || typeof store !== "object") {
    return createSeedStore();
  }

  return {
    baby: store.baby || createSeedStore().baby,
    caregivers: normalizeSeedCaregivers(store.caregivers),
    records: Array.isArray(store.records) ? store.records : [],
    milestones: Array.isArray(store.milestones) ? store.milestones : [],
    reminders: Array.isArray(store.reminders) ? store.reminders : []
  };
};

const listFamilyMembers = async (familyId, store) => {
  const result = await members.where({
    familyId: _.eq(familyId)
  }).get();
  const memberDocs = (result && result.data) || [];
  const caregivers = sanitizeStore(store).caregivers;

  return memberDocs.map((member) => {
    const matchedCaregiver =
      caregivers.find((item) => item.id === member.caregiverId) ||
      caregivers.find((item) => item.name === member.displayName);

    return {
      id: member._id,
      name: member.displayName || (matchedCaregiver && matchedCaregiver.name) || "照护者",
      role: member.role || (matchedCaregiver && matchedCaregiver.role) || "共同照护者",
      isOwner: !!member.isOwner,
      joinedAt: member.createdAt || (matchedCaregiver && matchedCaregiver.joinedAt) || ""
    };
  });
};

const buildResponse = async (doc, extras) => {
  const memberSummaries = await listFamilyMembers(doc._id, doc.store);
  return Object.assign(
    {
      ok: true,
      store: sanitizeStore(doc.store),
      familyId: doc._id,
      inviteCode: doc.inviteCode || "",
      memberSummaries,
      updatedAt: doc.updatedAt || "",
      version: doc.version || 1
    },
    extras || {}
  );
};

const getFamilyDoc = async (familyId) => {
  try {
    return await families.doc(familyId).get();
  } catch (error) {
    if (error && error.errCode === -1) {
      return null;
    }
    throw error;
  }
};

const getMemberDoc = async (openid) => {
  try {
    return await members.doc(openid).get();
  } catch (error) {
    if (error && error.errCode === -1) {
      return null;
    }
    throw error;
  }
};

const saveMemberDoc = async (openid, familyId, role, displayName, caregiverId, isOwner) => {
  const now = new Date().toISOString();
  const existing = await getMemberDoc(openid);

  if (existing && existing.data) {
    await members.doc(openid).update({
      data: {
        familyId,
        displayName: displayName || existing.data.displayName || "照护者",
        caregiverId: caregiverId || existing.data.caregiverId || "",
        isOwner: typeof isOwner === "boolean" ? isOwner : !!existing.data.isOwner,
        role: role || existing.data.role || "照护者",
        updatedAt: now
      }
    });
    return;
  }

  await members.doc(openid).set({
    data: {
      familyId,
      displayName: displayName || "照护者",
      caregiverId: caregiverId || "",
      isOwner: !!isOwner,
      role: role || "照护者",
      createdAt: now,
      updatedAt: now
    }
  });
};

const updateCaregiverProfileInStore = (store, caregiverId, displayName) => {
  const nextStore = sanitizeStore(store);
  if (!caregiverId || !displayName) {
    return nextStore;
  }

  nextStore.caregivers = nextStore.caregivers.map((item) => {
    if (item.id === caregiverId) {
      return Object.assign({}, item, {
        name: displayName
      });
    }
    return item;
  });

  return nextStore;
};

const ensureInviteCode = async (familyDoc) => {
  if (familyDoc.inviteCode) {
    return familyDoc;
  }

  const inviteCode = generateInviteCode();
  const updatedAt = new Date().toISOString();
  await families.doc(familyDoc._id).update({
    data: {
      inviteCode,
      updatedAt
    }
  });

  return Object.assign({}, familyDoc, {
    inviteCode,
    updatedAt
  });
};

const createFamilyDoc = async (ownerOpenid, localStore) => {
  const store = sanitizeStore(localStore);
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();
  const result = await families.add({
    data: {
      ownerOpenid,
      inviteCode,
      store,
      version: 1,
      createdAt: now,
      updatedAt: now
    }
  });

  return {
    _id: result._id,
    ownerOpenid,
    inviteCode,
    store,
    version: 1,
    createdAt: now,
    updatedAt: now
  };
};

const ensureCaregiverInStore = (store, openid, caregiverName, roleLabel) => {
  const nextStore = sanitizeStore(store);
  const caregiverId = `cg_${openid.slice(-8)}`;
  const exists = nextStore.caregivers.find((item) => item.id === caregiverId);

  if (!exists) {
    nextStore.caregivers.push({
      id: caregiverId,
      name: caregiverName || "照护者",
      role: roleLabel || "共同照护者",
      joinedAt: new Date().toISOString().replace("T", " ").slice(0, 16)
    });
  }

  return nextStore;
};

const ensureFamilyContext = async (openid, localStore) => {
  const seedCaregiver = sanitizeStore(localStore).caregivers[0] || {};
  const member = await getMemberDoc(openid);
  if (member && member.data && member.data.familyId) {
    const familyDoc = await getFamilyDoc(member.data.familyId);
    if (familyDoc && familyDoc.data) {
      return await ensureInviteCode(familyDoc.data);
    }
  }

  const legacy = await getFamilyDoc(openid);
  if (legacy && legacy.data) {
    await saveMemberDoc(openid, openid, "创建者", seedCaregiver.name, seedCaregiver.id, true);
    return await ensureInviteCode(legacy.data);
  }

  const familyDoc = await createFamilyDoc(openid, localStore);
  await saveMemberDoc(openid, familyDoc._id, "创建者", seedCaregiver.name, seedCaregiver.id, true);
  return familyDoc;
};

const updateFamilyStore = async (familyId, store, version) => {
  const updatedAt = new Date().toISOString();
  await families.doc(familyId).update({
    data: {
      store: sanitizeStore(store),
      version,
      updatedAt
    }
  });

  return {
    _id: familyId,
    store: sanitizeStore(store),
    version,
    updatedAt
  };
};

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const action = event && event.action;

  if (!OPENID) {
    return {
      ok: false,
      message: "missing openid"
    };
  }

  if (action === "bootstrap") {
    const doc = await ensureFamilyContext(OPENID, event.localStore);
    return buildResponse(doc, {
      mode: "bootstrap"
    });
  }

  if (action === "syncStore") {
    const existing = await ensureFamilyContext(OPENID, event.store);
    const nextStore = sanitizeStore(event.store);
    const nextVersion = (existing.version || 1) + 1;
    const updatedFamily = await updateFamilyStore(existing._id, nextStore, nextVersion);

    return buildResponse(
      Object.assign({}, existing, updatedFamily),
      {
        mode: "sync"
      }
    );
  }

  if (action === "getStore") {
    const doc = await ensureFamilyContext(OPENID, event.localStore);
    return buildResponse(doc, {
      mode: "get"
    });
  }

  if (action === "joinFamily") {
    const inviteCode = ((event && event.inviteCode) || "").trim().toUpperCase();
    const caregiverName = ((event && event.caregiverName) || "").trim();
    const caregiverRole = ((event && event.caregiverRole) || "").trim() || "共同照护者";

    if (!inviteCode) {
      return {
        ok: false,
        message: "invite code required"
      };
    }

    const familySearch = await families.where({
      inviteCode
    }).limit(1).get();

    if (!familySearch.data || !familySearch.data.length) {
      return {
        ok: false,
        message: "invite code not found"
      };
    }

    const targetFamily = familySearch.data[0];
    const nextStore = ensureCaregiverInStore(targetFamily.store, OPENID, caregiverName, caregiverRole);
    const nextVersion = (targetFamily.version || 1) + 1;
    await updateFamilyStore(targetFamily._id, nextStore, nextVersion);
    const joinedCaregiverId = `cg_${OPENID.slice(-8)}`;
    await saveMemberDoc(OPENID, targetFamily._id, caregiverRole, caregiverName || "共同照护者", joinedCaregiverId, false);

    const latestFamily = await getFamilyDoc(targetFamily._id);
    return buildResponse(latestFamily.data, {
      mode: "join"
    });
  }

  if (action === "updateMemberProfile") {
    const displayName = ((event && event.displayName) || "").trim();
    const role = ((event && event.role) || "").trim();
    const familyDoc = await ensureFamilyContext(OPENID, event.localStore);
    const memberDoc = await getMemberDoc(OPENID);
    const caregiverId = (memberDoc && memberDoc.data && memberDoc.data.caregiverId) || "";
    const memberRole = role || (memberDoc && memberDoc.data && memberDoc.data.role) || "共同照护者";
    const isOwner = !!(memberDoc && memberDoc.data && memberDoc.data.isOwner);

    if (!displayName) {
      return {
        ok: false,
        message: "displayName required"
      };
    }

    await saveMemberDoc(OPENID, familyDoc._id, memberRole, displayName, caregiverId, isOwner);
    const nextStore = updateCaregiverProfileInStore(familyDoc.store, caregiverId, displayName).caregivers
      ? updateCaregiverProfileInStore(familyDoc.store, caregiverId, displayName)
      : familyDoc.store;
    nextStore.caregivers = nextStore.caregivers.map((item) => {
      if (item.id === caregiverId) {
        return Object.assign({}, item, {
          role: memberRole
        });
      }
      return item;
    });
    const nextVersion = (familyDoc.version || 1) + 1;
    await updateFamilyStore(familyDoc._id, nextStore, nextVersion);

    const latestFamily = await getFamilyDoc(familyDoc._id);
    return buildResponse(latestFamily.data, {
      mode: "updateMemberProfile"
    });
  }

  return {
    ok: false,
    message: "unknown action"
  };
};
