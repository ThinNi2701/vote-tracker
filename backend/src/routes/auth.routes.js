const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyUser, getUserById } = require('../data/users.store');
const { requireAuth } = require('../middleware/auth.middleware');

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

module.exports = router;
