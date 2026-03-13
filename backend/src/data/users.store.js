const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const crypto = require('crypto');

let seeded = false;

async function ensureSeedUsers() {
  if (seeded) {
    return;
  }

  const defaults = [
    {
      username: String(process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
      name: 'Quản trị viên',
      role: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      allowedElectionIds: [],
    },
    {
      username: String(process.env.USER_USERNAME || 'user').toLowerCase(),
      name: 'Người kiểm phiếu',
      role: 'user',
      password: process.env.USER_PASSWORD || 'user123',
      allowedElectionIds: ['xa-van-ninh-2026'],
    },
  ];

  for (const item of defaults) {
    const exists = await User.findOne({ username: item.username }).lean();
    if (exists) {
      continue;
    }

    const passwordHash = await bcrypt.hash(String(item.password), 10);
    await User.create({
      id: crypto.randomUUID(),
      username: item.username,
      name: item.name,
      role: item.role,
      allowedElectionIds: Array.isArray(item.allowedElectionIds) ? item.allowedElectionIds : [],
      passwordHash,
      isActive: true,
      createdAt: new Date(),
    });
  }

  seeded = true;
}

async function verifyUser(username, password) {
  await ensureSeedUsers();
  const normalized = String(username || '').trim().toLowerCase();
  const target = await User.findOne({ username: normalized, isActive: true });
  if (!target) {
    return null;
  }

  const ok = await bcrypt.compare(String(password || ''), target.passwordHash);
  if (!ok) {
    return null;
  }

  return {
    id: target.id,
    username: target.username,
    name: target.name,
    role: target.role,
    allowedElectionIds: target.role === 'admin' ? [] : target.allowedElectionIds || [],
  };
}

async function getUserById(id) {
  await ensureSeedUsers();
  const target = await User.findOne({ id, isActive: true }).lean();
  if (!target) {
    return null;
  }

  return {
    id: target.id,
    username: target.username,
    name: target.name,
    role: target.role,
    allowedElectionIds: target.role === 'admin' ? [] : target.allowedElectionIds || [],
  };
}

function normalizeElectionIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(
      ids
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  );
}

async function listUsers() {
  await ensureSeedUsers();
  const users = await User.find({}).sort({ createdAt: 1 }).lean();

  return users.map((item) => ({
    id: item.id,
    username: item.username,
    name: item.name,
    role: item.role,
    isActive: item.isActive,
    allowedElectionIds: item.role === 'admin' ? [] : normalizeElectionIds(item.allowedElectionIds),
    createdAt: item.createdAt,
  }));
}

async function createUserByAdmin(payload) {
  await ensureSeedUsers();

  const username = String(payload?.username || '').trim().toLowerCase();
  const name = String(payload?.name || '').trim();
  const password = String(payload?.password || '').trim();
  const role = String(payload?.role || 'user').trim().toLowerCase();
  const allowedElectionIds = normalizeElectionIds(payload?.allowedElectionIds);

  if (!username) {
    return { ok: false, code: 400, message: 'Tên đăng nhập là bắt buộc.' };
  }

  if (!name) {
    return { ok: false, code: 400, message: 'Tên hiển thị là bắt buộc.' };
  }

  if (!password || password.length < 4) {
    return { ok: false, code: 400, message: 'Mật khẩu phải có ít nhất 4 ký tự.' };
  }

  if (!['admin', 'user'].includes(role)) {
    return { ok: false, code: 400, message: 'Vai trò không hợp lệ.' };
  }

  const exists = await User.findOne({ username }).lean();
  if (exists) {
    return { ok: false, code: 409, message: 'Tên đăng nhập đã tồn tại.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await User.create({
    id: crypto.randomUUID(),
    username,
    name,
    role,
    allowedElectionIds: role === 'admin' ? [] : allowedElectionIds,
    passwordHash,
    isActive: true,
    createdAt: new Date(),
  });

  return {
    ok: true,
    value: {
      id: created.id,
      username: created.username,
      name: created.name,
      role: created.role,
      isActive: created.isActive,
      allowedElectionIds: created.role === 'admin' ? [] : normalizeElectionIds(created.allowedElectionIds),
      createdAt: created.createdAt,
    },
  };
}

async function setUserElectionPermissions(userId, payload) {
  await ensureSeedUsers();

  const target = await User.findOne({ id: userId, isActive: true });
  if (!target) {
    return { ok: false, code: 404, message: 'Không tìm thấy người dùng.' };
  }

  if (target.role !== 'user') {
    return { ok: false, code: 400, message: 'Chỉ có thể phân quyền cuộc bầu cử cho tài khoản user.' };
  }

  target.allowedElectionIds = normalizeElectionIds(payload?.allowedElectionIds);
  await target.save();

  return {
    ok: true,
    value: {
      id: target.id,
      username: target.username,
      name: target.name,
      role: target.role,
      isActive: target.isActive,
      allowedElectionIds: normalizeElectionIds(target.allowedElectionIds),
      createdAt: target.createdAt,
    },
  };
}

async function hasElectionPermission(userId, electionId) {
  await ensureSeedUsers();

  const target = await User.findOne({ id: userId, isActive: true }).lean();
  if (!target) {
    return false;
  }

  if (target.role === 'admin') {
    return true;
  }

  const allowedElectionIds = normalizeElectionIds(target.allowedElectionIds);
  return allowedElectionIds.includes(String(electionId || '').trim());
}

module.exports = {
  verifyUser,
  getUserById,
  listUsers,
  createUserByAdmin,
  setUserElectionPermissions,
  hasElectionPermission,
};
