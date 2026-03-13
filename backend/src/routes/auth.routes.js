const express = require('express');
const jwt = require('jsonwebtoken');
const {
  verifyUser,
  getUserById,
  listUsers,
  createUserByAdmin,
  setUserElectionPermissions,
} = require('../data/users.store');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await verifyUser(username, password);

    if (!user) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET || 'vote-tracker-secret',
      { expiresIn: '12h' },
    );

    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể đăng nhập.', detail: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng.' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải thông tin người dùng.', detail: error.message });
  }
});

router.get('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await listUsers();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải danh sách người dùng.', detail: error.message });
  }
});

router.post('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await createUserByAdmin(req.body);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.status(201).json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tạo người dùng.', detail: error.message });
  }
});

router.put('/admin/users/:id/permissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await setUserElectionPermissions(req.params.id, req.body);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật phân quyền cuộc bầu cử.', detail: error.message });
  }
});

module.exports = router;
