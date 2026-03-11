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
    },
    {
      username: String(process.env.USER_USERNAME || 'user').toLowerCase(),
      name: 'Người kiểm phiếu',
      role: 'user',
      password: process.env.USER_PASSWORD || 'user123',
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
  };
}

module.exports = {
  verifyUser,
  getUserById,
};
