const Election = require('../models/election.model');
const crypto = require('crypto');

const SEED_ELECTIONS = [
  {
    id: 'xa-van-ninh-2026',
    name: 'Bầu cử Đại biểu HĐND xã Vạn Ninh 2026',
    seats: 5,
    picksAllowed: 3,
    candidates: [
      'Nguyen Van Danh',
      'Nguyen Thi Hien Lam',
      'Dang Thi Hong Phuong',
      'Le Xuan Tran',
      'Nguyen Quoc Tuan',
    ],
    ballots: [],
    createdAt: new Date().toISOString(),
  },
];

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const count = await Election.countDocuments();
  if (count === 0) {
    await Election.insertMany(SEED_ELECTIONS);
  }

  seeded = true;
}

function summarizeElection(election) {
  const validBallots = election.ballots.filter((item) => item.isValid).length;
  return {
    id: election.id,
    name: election.name,
    seats: election.seats,
    picksAllowed: election.picksAllowed,
    candidatesCount: election.candidates.length,
    ballotsCount: election.ballots.length,
    validBallots,
    invalidBallots: election.ballots.length - validBallots,
    createdAt: election.createdAt,
  };
}

async function listElections() {
  await ensureSeedData();
  const elections = await Election.find({}).sort({ createdAt: -1 }).lean();
  return elections.map(summarizeElection);
}

async function getElectionById(id) {
  await ensureSeedData();
  return Election.findOne({ id }).lean();
}

function validateElectionPayload(payload) {
  const name = String(payload.name ?? '').trim();
  const seats = Number(payload.seats);
  const picksAllowed = Number(payload.picksAllowed);
  const candidates = Array.isArray(payload.candidates)
    ? payload.candidates.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!name) {
    return { ok: false, message: 'Tên cuộc bầu cử là bắt buộc.' };
  }

  if (!Number.isInteger(seats) || seats <= 0) {
    return { ok: false, message: 'Tổng số đại biểu phải là số nguyên dương.' };
  }

  if (!Number.isInteger(picksAllowed) || picksAllowed <= 0) {
    return { ok: false, message: 'Số lượng được chọn phải là số nguyên dương.' };
  }

  if (candidates.length === 0) {
    return { ok: false, message: 'Phải có ít nhất một ứng cử viên.' };
  }

  if (picksAllowed > candidates.length) {
    return { ok: false, message: 'Số lượng được chọn không được lớn hơn số ứng cử viên.' };
  }

  return {
    ok: true,
    value: { name, seats, picksAllowed, candidates },
  };
}

async function createElection(payload) {
  const validated = validateElectionPayload(payload);
  if (!validated.ok) {
    return validated;
  }

  const { name, seats, picksAllowed, candidates } = validated.value;
  await ensureSeedData();

  const newElection = await Election.create({
    id: crypto.randomUUID(),
    name,
    seats,
    picksAllowed,
    candidates,
    ballots: [],
    createdAt: new Date(),
  });

  return { ok: true, value: newElection.toObject() };
}

async function updateElectionName(electionId, payload) {
  await ensureSeedData();
  const election = await Election.findOne({ id: electionId });

  if (!election) {
    return { ok: false, code: 404, message: 'Không tìm thấy cuộc bầu cử.' };
  }

  const name = String(payload?.name ?? '').trim();
  if (!name) {
    return { ok: false, code: 400, message: 'Tên cuộc bầu cử là bắt buộc.' };
  }

  election.name = name;
  await election.save();

  return {
    ok: true,
    value: {
      election: election.toObject(),
      summary: summarizeElection(election),
    },
  };
}

async function addBallot(electionId, payload) {
  await ensureSeedData();
  const election = await Election.findOne({ id: electionId });

  if (!election) {
    return { ok: false, code: 404, message: 'Không tìm thấy cuộc bầu cử.' };
  }

  const crossedOut = Array.isArray(payload.crossedOut)
    ? payload.crossedOut.map((item) => String(item).trim()).filter(Boolean)
    : [];

  election.ballots.forEach((existingBallot, index) => {
    if (!existingBallot.ballotNumber) {
      existingBallot.ballotNumber = index + 1;
    }
  });

  const selected = election.candidates.filter((name) => !crossedOut.includes(name));
  const isValid = selected.length === election.picksAllowed;

  const ballot = {
    ballotNumber: election.ballots.length + 1,
    id: crypto.randomUUID(),
    crossedOut,
    selected,
    isValid,
    createdAt: new Date(),
  };

  election.ballots.push(ballot);
  await election.save();

  return {
    ok: true,
    value: {
      ballot,
      summary: summarizeElection(election),
    },
  };
}

async function updateBallot(electionId, ballotNumber, payload) {
  await ensureSeedData();
  const election = await Election.findOne({ id: electionId });

  if (!election) {
    return { ok: false, code: 404, message: 'Không tìm thấy cuộc bầu cử.' };
  }

  const number = Number(ballotNumber);
  if (!Number.isInteger(number) || number <= 0) {
    return { ok: false, code: 400, message: 'ID phiếu không hợp lệ.' };
  }

  const targetIndex = election.ballots.findIndex((item, index) => {
    const currentNumber = item.ballotNumber || index + 1;
    return currentNumber === number;
  });

  if (targetIndex === -1) {
    return { ok: false, code: 404, message: 'Không tìm thấy lá phiếu cần sửa.' };
  }

  const crossedOut = Array.isArray(payload.crossedOut)
    ? payload.crossedOut.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const selected = election.candidates.filter((name) => !crossedOut.includes(name));
  const isValid = selected.length === election.picksAllowed;

  const target = election.ballots[targetIndex];
  target.ballotNumber = target.ballotNumber || targetIndex + 1;
  target.crossedOut = crossedOut;
  target.selected = selected;
  target.isValid = isValid;

  await election.save();

  return {
    ok: true,
    value: {
      ballot: target.toObject ? target.toObject() : target,
      summary: summarizeElection(election),
    },
  };
}

async function deleteBallot(electionId, ballotNumber) {
  await ensureSeedData();
  const election = await Election.findOne({ id: electionId });

  if (!election) {
    return { ok: false, code: 404, message: 'Không tìm thấy cuộc bầu cử.' };
  }

  const number = Number(ballotNumber);
  if (!Number.isInteger(number) || number <= 0) {
    return { ok: false, code: 400, message: 'ID phiếu không hợp lệ.' };
  }

  const targetIndex = election.ballots.findIndex((item, index) => {
    const currentNumber = item.ballotNumber || index + 1;
    return currentNumber === number;
  });

  if (targetIndex === -1) {
    return { ok: false, code: 404, message: 'Không tìm thấy lá phiếu cần xóa.' };
  }

  election.ballots.splice(targetIndex, 1);

  election.ballots.forEach((item, index) => {
    item.ballotNumber = index + 1;
  });

  await election.save();

  return {
    ok: true,
    value: {
      deletedBallotNumber: number,
      summary: summarizeElection(election),
    },
  };
}

async function deleteElection(electionId) {
  await ensureSeedData();
  const deleted = await Election.findOneAndDelete({ id: electionId });

  if (!deleted) {
    return { ok: false, code: 404, message: 'Không tìm thấy cuộc bầu cử.' };
  }

  return { ok: true, value: { id: electionId } };
}

module.exports = {
  listElections,
  getElectionById,
  createElection,
  updateElectionName,
  addBallot,
  updateBallot,
  deleteBallot,
  deleteElection,
};
