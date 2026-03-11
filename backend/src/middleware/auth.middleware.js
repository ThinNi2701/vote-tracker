const jwt = require('jsonwebtoken');

function parseBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'vote-tracker-secret');
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
