const express = require('express');
const {
  listElections,
  getElectionById,
  createElection,
  updateElectionName,
  addBallot,
  updateBallot,
  deleteBallot,
  deleteElection,
} = require('../data/elections.store');
const { getUserById, hasElectionPermission } = require('../data/users.store');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

async function ensureElectionAccess(req, res, electionId) {
  if (req.user?.role === 'admin') {
    return true;
  }

  const ok = await hasElectionPermission(req.user?.sub, electionId);
  if (!ok) {
    res.status(403).json({ message: 'Bạn không được phân quyền kiểm phiếu cuộc bầu cử này.' });
    return false;
  }

  return true;
}

router.get('/', async (req, res) => {
  try {
    const data = await listElections();
    if (req.user?.role === 'admin') {
      return res.json(data);
    }

    const currentUser = await getUserById(req.user?.sub);
    if (!currentUser) {
      return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    const allowedSet = new Set(currentUser.allowedElectionIds || []);
    return res.json(data.filter((item) => allowedSet.has(item.id)));
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải danh sách cuộc bầu cử.', detail: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const canAccess = await ensureElectionAccess(req, res, req.params.id);
    if (!canAccess) {
      return;
    }

    const election = await getElectionById(req.params.id);
    if (!election) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc bầu cử.' });
    }
    return res.json(election);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải cuộc bầu cử.', detail: error.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await createElection(req.body);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }
    return res.status(201).json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tạo cuộc bầu cử.', detail: error.message });
  }
});

router.put('/:id/name', requireRole('admin'), async (req, res) => {
  try {
    const result = await updateElectionName(req.params.id, req.body);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật tên cuộc bầu cử.', detail: error.message });
  }
});

router.post('/:id/ballots', async (req, res) => {
  try {
    const canAccess = await ensureElectionAccess(req, res, req.params.id);
    if (!canAccess) {
      return;
    }

    const result = await addBallot(req.params.id, req.body);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.status(201).json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể lưu lá phiếu.', detail: error.message });
  }
});

router.put('/:id/ballots/:ballotNumber', async (req, res) => {
  try {
    const canAccess = await ensureElectionAccess(req, res, req.params.id);
    if (!canAccess) {
      return;
    }

    const result = await updateBallot(req.params.id, req.params.ballotNumber, req.body);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật lá phiếu.', detail: error.message });
  }
});

router.post('/:id/ballots/:ballotNumber/update', async (req, res) => {
  try {
    const canAccess = await ensureElectionAccess(req, res, req.params.id);
    if (!canAccess) {
      return;
    }

    const result = await updateBallot(req.params.id, req.params.ballotNumber, req.body);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json(result.value);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật lá phiếu.', detail: error.message });
  }
});

router.delete('/:id/ballots/:ballotNumber', async (req, res) => {
  try {
    const canAccess = await ensureElectionAccess(req, res, req.params.id);
    if (!canAccess) {
      return;
    }

    const result = await deleteBallot(req.params.id, req.params.ballotNumber);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json({ message: 'Đã xóa lá phiếu thành công.', ...result.value });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể xóa lá phiếu.', detail: error.message });
  }
});

router.post('/:id/ballots/:ballotNumber/delete', async (req, res) => {
  try {
    const canAccess = await ensureElectionAccess(req, res, req.params.id);
    if (!canAccess) {
      return;
    }

    const result = await deleteBallot(req.params.id, req.params.ballotNumber);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json({ message: 'Đã xóa lá phiếu thành công.', ...result.value });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể xóa lá phiếu.', detail: error.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await deleteElection(req.params.id);
    if (!result.ok) {
      return res.status(result.code ?? 400).json({ message: result.message });
    }
    return res.json({ message: 'Đã xóa cuộc bầu cử thành công.', ...result.value });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể xóa cuộc bầu cử.', detail: error.message });
  }
});

module.exports = router;
