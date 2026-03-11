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
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const data = await listElections();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Không thể tải danh sách cuộc bầu cử.', detail: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
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
