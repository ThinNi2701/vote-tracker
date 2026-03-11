import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'
const SESSION_KEY = 'vote-tracker-session'

async function requestJson(url, options = {}, token) {
  const headers = {
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'Yêu cầu thất bại')
    error.status = response.status
    throw error
  }

  return data
}

function formatDateTime(value) {
  if (!value) {
    return 'Không rõ thời gian'
  }
  return new Date(value).toLocaleString('vi-VN')
}

function classifyBallot(ballot, picksAllowed) {
  const selectedCount = ballot.selected?.length ?? 0
  const delta = picksAllowed - selectedCount

  if (delta === 0) {
    return {
      isValid: true,
      label: 'Hợp lệ',
      selectedCount,
      trustValue: selectedCount,
    }
  }

  const detailLabel = delta > 0 ? `Thiếu ${delta}` : `Thừa ${Math.abs(delta)}`
  return {
    isValid: false,
    label: `Không hợp lệ (${detailLabel})`,
    detailLabel,
    selectedCount,
    trustValue: selectedCount,
  }
}

function computeBallotStats(election) {
  const voteMap = Object.fromEntries((election.candidates || []).map((name) => [name, 0]))
  const invalidBuckets = {}
  let validBallots = 0

  ;(election.ballots || []).forEach((ballot) => {
    const ballotStatus = classifyBallot(ballot, election.picksAllowed)

    if (ballotStatus.isValid) {
      validBallots += 1
      ;(ballot.selected || []).forEach((name) => {
        voteMap[name] = (voteMap[name] || 0) + 1
      })
      return
    }

    const bucketLabel = ballotStatus.detailLabel
    invalidBuckets[bucketLabel] = (invalidBuckets[bucketLabel] || 0) + 1
  })

  const sorted = Object.entries(voteMap)
    .map(([name, votes]) => ({
      name,
      votes,
      ratio: validBallots === 0 ? 0 : (votes / validBallots) * 100,
    }))
    .sort((a, b) => b.votes - a.votes)

  return { validBallots, sorted, invalidBuckets }
}

function buildBallotsWithMeta(election) {
  return (election?.ballots || []).map((ballot, index) => {
    const number = ballot.ballotNumber ?? index + 1
    const stackNumber = Math.ceil(number / 50)
    const stackIndex = ((number - 1) % 50) + 1
    return {
      ...ballot,
      displayNumber: number,
      stackNumber,
      stackIndex,
    }
  })
}

function App() {
  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })

  const [elections, setElections] = useState([])
  const [activeElectionId, setActiveElectionId] = useState('')
  const [activeElection, setActiveElection] = useState(null)
  const [screen, setScreen] = useState('hub')
  const [crossedOut, setCrossedOut] = useState(new Set())
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedBallot, setSelectedBallot] = useState(null)
  const [stackModalOpen, setStackModalOpen] = useState(false)
  const [editingBallot, setEditingBallot] = useState(false)
  const [editCrossedOut, setEditCrossedOut] = useState(new Set())
  const [selectedStack, setSelectedStack] = useState('all')
  const [newElection, setNewElection] = useState({
    name: '',
    seats: 5,
    picksAllowed: 3,
    candidatesText: '',
  })

  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.token && parsed?.user) {
        setToken(parsed.token)
        setCurrentUser(parsed.user)
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [])

  const ballotsWithNumber = useMemo(
    () =>
      buildBallotsWithMeta(activeElection).map((ballot) => ({
        ...ballot,
        status: classifyBallot(ballot, activeElection?.picksAllowed ?? 0),
      })),
    [activeElection],
  )

  const stackSummary = useMemo(() => {
    const map = {}
    ballotsWithNumber.forEach((ballot) => {
      const key = ballot.stackNumber
      if (!map[key]) {
        map[key] = {
          stackNumber: key,
          total: 0,
          valid: 0,
          invalid: 0,
          actualTrust: 0,
        }
      }
      map[key].total += 1
      map[key].actualTrust += ballot.status.trustValue
      if (ballot.status.isValid) {
        map[key].valid += 1
      } else {
        map[key].invalid += 1
      }
    })
    return Object.values(map)
      .map((stack) => {
        const expectedTrust = (activeElection?.picksAllowed ?? 0) * 50
        const enoughBallots = stack.total === 50
        const trustMatched = stack.actualTrust === expectedTrust
        const isCorrect = enoughBallots && trustMatched && stack.invalid === 0

        return {
          ...stack,
          expectedTrust,
          enoughBallots,
          trustMatched,
          isCorrect,
          statusText: isCorrect ? 'Đúng' : 'Sai',
        }
      })
      .sort((a, b) => a.stackNumber - b.stackNumber)
  }, [ballotsWithNumber, activeElection?.picksAllowed])

  const filteredBallots = useMemo(() => {
    if (selectedStack === 'all') {
      return ballotsWithNumber
    }
    const stackNo = Number(selectedStack)
    return ballotsWithNumber.filter((item) => item.stackNumber === stackNo)
  }, [ballotsWithNumber, selectedStack])

  const selectedNow = activeElection
    ? activeElection.candidates.filter((name) => !crossedOut.has(name))
    : []
  const currentBallotValid = activeElection
    ? selectedNow.length === activeElection.picksAllowed
    : false

  const stats = useMemo(
    () => computeBallotStats(activeElection ?? { candidates: [], ballots: [], picksAllowed: 0 }),
    [activeElection],
  )

  const totalBallots = activeElection?.ballots.length ?? 0
  const invalidBallots = totalBallots - stats.validBallots

  useEffect(() => {
    setSelectedStack('all')
  }, [activeElectionId])

  useEffect(() => {
    const handlePopState = () => {
      if (selectedBallot) {
        setSelectedBallot(null)
        setEditingBallot(false)
        return
      }

      if (stackModalOpen) {
        setStackModalOpen(false)
        return
      }

      if (screen === 'workspace') {
        setScreen('hub')
        setNotice('')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [screen, selectedBallot, stackModalOpen])

  const withAuth = async (action) => {
    try {
      return await action()
    } catch (error) {
      if (error.status === 401) {
        setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        localStorage.removeItem(SESSION_KEY)
        setToken('')
        setCurrentUser(null)
      } else {
        throw error
      }
      return null
    }
  }

  const loadElections = async () => {
    const data = await withAuth(() => requestJson(`${API_BASE_URL}/elections`, {}, token))
    if (!data) {
      return []
    }
    setElections(data)
    if (!activeElectionId && data.length > 0) {
      setActiveElectionId(data[0].id)
    }
    return data
  }

  const loadElectionDetail = async (id) => {
    const detail = await withAuth(() => requestJson(`${API_BASE_URL}/elections/${id}`, {}, token))
    if (!detail) {
      return
    }
    setActiveElection(detail)
    setActiveElectionId(detail.id)
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        setLoading(true)
        const list = await loadElections()
        if (list.length > 0) {
          await loadElectionDetail(list[0].id)
        } else {
          setActiveElection(null)
        }
      } catch (error) {
        setNotice(`Không thể tải dữ liệu: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [token])

  const login = async (event) => {
    event.preventDefault()
    try {
      setAuthBusy(true)
      const response = await requestJson(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      setToken(response.token)
      setCurrentUser(response.user)
      localStorage.setItem(SESSION_KEY, JSON.stringify(response))
      setNotice('Đăng nhập thành công.')
    } catch (error) {
      setNotice(`Đăng nhập thất bại: ${error.message}`)
    } finally {
      setAuthBusy(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setToken('')
    setCurrentUser(null)
    setElections([])
    setActiveElection(null)
    setNotice('Đã đăng xuất.')
  }

  const toggleCandidate = (name) => {
    setCrossedOut((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const submitBallot = async () => {
    if (!activeElection) {
      return
    }
    try {
      setBusy(true)
      const payload = { crossedOut: Array.from(crossedOut) }
      const response = await withAuth(() =>
        requestJson(
          `${API_BASE_URL}/elections/${activeElection.id}/ballots`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
          token,
        ),
      )
      if (!response) {
        return
      }

      await Promise.all([loadElectionDetail(activeElection.id), loadElections()])
      setCrossedOut(new Set())
      setNotice(
        response.ballot.isValid
          ? `Đã lưu lá phiếu #${response.ballot.ballotNumber ?? totalBallots + 1} hợp lệ.`
          : `Lá phiếu #${response.ballot.ballotNumber ?? totalBallots + 1} không hợp lệ.`,
      )
    } catch (error) {
      setNotice(`Không thể lưu lá phiếu: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const createElection = async (event) => {
    event.preventDefault()
    const candidates = newElection.candidatesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!newElection.name.trim() || candidates.length === 0) {
      setNotice('Vui lòng nhập tên cuộc bầu cử và danh sách đại biểu.')
      return
    }

    if (newElection.picksAllowed > candidates.length) {
      setNotice('Số lượng được chọn không được lớn hơn số đại biểu.')
      return
    }

    try {
      setBusy(true)
      const created = await withAuth(() =>
        requestJson(
          `${API_BASE_URL}/elections`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newElection.name.trim(),
              seats: Number(newElection.seats),
              picksAllowed: Number(newElection.picksAllowed),
              candidates,
            }),
          },
          token,
        ),
      )
      if (!created) {
        return
      }

      await loadElections()
      await loadElectionDetail(created.id)
      setScreen('workspace')
      setCrossedOut(new Set())
      setNotice('Đã tạo cuộc bầu cử mới.')
      setNewElection({ name: '', seats: 5, picksAllowed: 3, candidatesText: '' })
    } catch (error) {
      setNotice(`Không thể tạo cuộc bầu cử: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const enterWorkspace = async (id) => {
    try {
      setBusy(true)
      await loadElectionDetail(id)
      window.history.pushState({ screen: 'workspace' }, '')
      setScreen('workspace')
      setSelectedBallot(null)
      setNotice('')
    } catch (error) {
      setNotice(`Không thể mở cuộc bầu cử: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const removeElection = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa cuộc bầu cử này không?')) {
      return
    }
    try {
      setBusy(true)
      const deleted = await withAuth(() =>
        requestJson(`${API_BASE_URL}/elections/${id}`, { method: 'DELETE' }, token),
      )
      if (!deleted) {
        return
      }

      const list = await loadElections()
      if (list.length === 0) {
        setActiveElection(null)
        setActiveElectionId('')
        setScreen('hub')
      } else {
        await loadElectionDetail(list[0].id)
      }
      setSelectedBallot(null)
      setNotice('Đã xóa cuộc bầu cử.')
    } catch (error) {
      setNotice(`Không thể xóa cuộc bầu cử: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const openBallotDetail = (ballot) => {
    window.history.pushState({ screen: 'ballot-detail' }, '')
    setSelectedBallot(ballot)
    setEditingBallot(false)
    setEditCrossedOut(new Set(ballot.crossedOut ?? []))
  }

  const toggleEditCandidate = (candidateName) => {
    setEditCrossedOut((prev) => {
      const next = new Set(prev)
      if (next.has(candidateName)) {
        next.delete(candidateName)
      } else {
        next.add(candidateName)
      }
      return next
    })
  }

  const saveBallotEdit = async () => {
    if (!activeElection || !selectedBallot) {
      return
    }

    try {
      setBusy(true)
      const payload = { crossedOut: Array.from(editCrossedOut) }
      const response = await withAuth(() =>
        requestJson(
          `${API_BASE_URL}/elections/${activeElection.id}/ballots/${selectedBallot.displayNumber}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
          token,
        ),
      )
      if (!response) {
        return
      }

      await Promise.all([loadElectionDetail(activeElection.id), loadElections()])
      setSelectedBallot((prev) =>
        prev
          ? {
              ...prev,
              ...response.ballot,
              displayNumber: response.ballot.ballotNumber ?? prev.displayNumber,
            }
          : null,
      )
      setEditingBallot(false)
      setNotice(`Đã cập nhật phiếu #${selectedBallot.displayNumber}.`)
    } catch (error) {
      setNotice(`Không thể cập nhật lá phiếu: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const deleteBallotItem = async () => {
    if (!activeElection || !selectedBallot) {
      return
    }

    const willDelete = window.confirm(
      `Bạn có chắc muốn xóa phiếu #${selectedBallot.displayNumber} không?`,
    )
    if (!willDelete) {
      return
    }

    try {
      setBusy(true)
      const response = await withAuth(() =>
        requestJson(
          `${API_BASE_URL}/elections/${activeElection.id}/ballots/${selectedBallot.displayNumber}`,
          { method: 'DELETE' },
          token,
        ),
      )
      if (!response) {
        return
      }

      await Promise.all([loadElectionDetail(activeElection.id), loadElections()])
      setSelectedBallot(null)
      setEditingBallot(false)
      setNotice(`Đã xóa phiếu #${selectedBallot.displayNumber}.`)
    } catch (error) {
      setNotice(`Không thể xóa lá phiếu: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <p className="eyebrow">Vote Tracker</p>
          <h1>Đăng nhập hệ thống kiểm phiếu</h1>
          <p>
            Tài khoản mặc định: admin/admin123 (quản trị), user/user123 (kiểm phiếu).
          </p>
        </header>
        <main className="hub-grid">
          <section className="panel creator-panel">
            <h2>Đăng nhập</h2>
            <form onSubmit={login} className="creator-form">
              <label>
                Tên đăng nhập
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="admin hoặc user"
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Nhập mật khẩu"
                />
              </label>
              <button type="submit" className="primary-btn" disabled={authBusy}>
                {authBusy ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </section>
        </main>
        {notice && <div className="notice">{notice}</div>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="panel">Đang tải dữ liệu hệ thống...</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Vote Tracker</p>
        <h1>Hệ thống kiểm phiếu trực quan</h1>
        <p>
          Xin chào {currentUser?.name} ({currentUser?.role === 'admin' ? 'Quản trị' : 'Kiểm phiếu'})
        </p>
        <div className="election-actions">
          <button type="button" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      {screen === 'hub' && (
        <main className="hub-grid">
          <section className="panel election-list-panel">
            <h2>Cuộc bầu cử có sẵn</h2>
            <div className="election-list">
              {elections.map((election) => (
                <article
                  key={election.id}
                  className={`election-card ${election.id === activeElectionId ? 'active' : ''}`}
                >
                  <div>
                    <h3>{election.name}</h3>
                    <p>
                      {election.candidatesCount} đại biểu • {election.ballotsCount} lá phiếu đã nhập
                    </p>
                  </div>
                  <div className="election-actions">
                    <button type="button" onClick={() => enterWorkspace(election.id)} disabled={busy}>
                      Vào kiểm phiếu
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => removeElection(election.id)}
                        disabled={busy}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {isAdmin ? (
            <section className="panel creator-panel">
              <h2>Tạo cuộc bầu cử mới</h2>
              <form onSubmit={createElection} className="creator-form">
                <label>
                  Tên cuộc bầu cử
                  <input
                    value={newElection.name}
                    onChange={(event) =>
                      setNewElection((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="VD: Bầu cử Trưởng thôn 2026"
                  />
                </label>
                <div className="inline-fields">
                  <label>
                    Tổng số đại biểu
                    <input
                      type="number"
                      min="1"
                      value={newElection.seats}
                      onChange={(event) =>
                        setNewElection((prev) => ({ ...prev, seats: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label>
                    Số lượng được chọn
                    <input
                      type="number"
                      min="1"
                      value={newElection.picksAllowed}
                      onChange={(event) =>
                        setNewElection((prev) => ({ ...prev, picksAllowed: Number(event.target.value) }))
                      }
                    />
                  </label>
                </div>
                <label>
                  Danh sách đại biểu (mỗi dòng một tên)
                  <textarea
                    value={newElection.candidatesText}
                    onChange={(event) =>
                      setNewElection((prev) => ({ ...prev, candidatesText: event.target.value }))
                    }
                    rows={8}
                    placeholder={'Nguyễn Văn A\nTrần Thị B\nLê Văn C'}
                  />
                </label>
                <button type="submit" className="primary-btn" disabled={busy}>
                  Tạo và vào màn hình kiểm phiếu
                </button>
              </form>
            </section>
          ) : (
            <section className="panel creator-panel">
              <h2>Quyền của bạn</h2>
              <p className="muted">Bạn là người kiểm phiếu, chỉ được nhập và chỉnh sửa phiếu đã kiểm tra.</p>
            </section>
          )}
        </main>
      )}

      {screen === 'workspace' && (
        <main className="workspace-grid">
          <section className="panel stats-panel">
            <h2>{activeElection?.name ?? 'Chưa có cuộc bầu cử'}</h2>
            <ul>
              <li>Tổng số lá phiếu đã điền: {totalBallots}</li>
              <li>Phiếu hợp lệ: {stats.validBallots}</li>
              <li>Phiếu không hợp lệ: {invalidBallots}</li>
              <li>
                Đang chọn: {selectedNow.length}/{activeElection?.picksAllowed ?? 0}
              </li>
            </ul>

            <div className="ballot-log">
              <h3>Phân loại phiếu không hợp lệ</h3>
              {Object.keys(stats.invalidBuckets).length === 0 ? (
                <p className="muted">Chưa có phiếu không hợp lệ.</p>
              ) : (
                <div className="ballot-log-list">
                  {Object.entries(stats.invalidBuckets).map(([label, count]) => (
                    <div key={label} className="ballot-log-item">
                      <span>{label}</span>
                      <small>{count} phiếu</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`ballot-state ${currentBallotValid ? 'ok' : 'warn'}`}>
              {currentBallotValid
                ? 'Lá phiếu hiện tại hợp lệ, có thể lưu.'
                : `Cần đúng ${activeElection?.picksAllowed ?? 0} người để phiếu hợp lệ.`}
            </div>

            <div className="ballot-log">
              <h3>Thông tin xấp phiếu</h3>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({ screen: 'stack-detail' }, '')
                  setStackModalOpen(true)
                }}
              >
                Mở bảng xấp và thông tin chi tiết
              </button>
            </div>

            <div className="ballot-log">
              <h3>Phiếu đã nhập (ID từ 1 đến N)</h3>
              {ballotsWithNumber.length === 0 ? (
                <p className="muted">Chưa có lá phiếu nào.</p>
              ) : (
                <>
                  <label className="stack-filter">
                    Chọn xấp (dropdown)
                    <select
                      value={selectedStack}
                      onChange={(event) => setSelectedStack(event.target.value)}
                    >
                      <option value="all">Tất cả các xấp</option>
                      {stackSummary.map((stack) => (
                        <option key={`opt-${stack.stackNumber}`} value={stack.stackNumber}>
                          Xấp {stack.stackNumber} - {stack.statusText}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ballot-log-list">
                    {filteredBallots.map((ballot) => (
                    <button
                      key={`${ballot.id}-${ballot.displayNumber}`}
                      type="button"
                      className="ballot-log-item"
                      onClick={() => openBallotDetail(ballot)}
                    >
                      <span>
                        Phiếu #{ballot.displayNumber} • Xấp {ballot.stackNumber} (STT {ballot.stackIndex}/50)
                      </span>
                      <small>{ballot.status.label}</small>
                    </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="panel ballot-panel">
            <h2>Phiếu mô phỏng</h2>
            <div className="ballot-paper">
              <p className="ballot-title">Danh sách ứng cử viên</p>
              {(activeElection?.candidates ?? []).map((name, index) => (
                <button
                  type="button"
                  key={name}
                  className={`candidate-line ${crossedOut.has(name) ? 'crossed' : ''}`}
                  onClick={() => toggleCandidate(name)}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span>{name}</span>
                  <small>{crossedOut.has(name) ? 'Đã gạch' : 'Còn hiệu lực'}</small>
                </button>
              ))}

              <div className="action-row inside-ballot-actions">
                <button type="button" className="primary-btn" onClick={submitBallot} disabled={busy}>
                  {busy ? 'Đang xử lý...' : 'Lưu phiếu'}
                </button>
                <button type="button" onClick={() => setCrossedOut(new Set())} disabled={busy}>
                  Làm mới phiếu
                </button>
              </div>
            </div>

            <div className="chart-card">
              <h3>Biểu đồ tỉ lệ đại biểu</h3>
              {stats.validBallots === 0 ? (
                <p className="muted">Chưa có phiếu hợp lệ để tính tỉ lệ.</p>
              ) : (
                <div className="chart-stack">
                  {stats.sorted.map((item, index) => (
                    <div key={item.name} className="bar-row enhanced">
                      <div className="bar-label">
                        <span>
                          #{index + 1} {item.name}
                        </span>
                        <strong>
                          {item.votes} phiếu ({item.ratio.toFixed(1)}%)
                        </strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${item.ratio}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      {selectedBallot && (
        <div className="modal-backdrop" onClick={() => setSelectedBallot(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Chi tiết phiếu #{selectedBallot.displayNumber}</h3>
            <p className="muted">Thời gian: {formatDateTime(selectedBallot.createdAt)}</p>
            <p>
              Xấp {selectedBallot.stackNumber} • STT {selectedBallot.stackIndex}/50
            </p>
            <p>
              Trạng thái:{' '}
              <strong>{classifyBallot(selectedBallot, activeElection?.picksAllowed ?? 0).label}</strong>
            </p>
            <p>
              Danh sách được chọn:{' '}
              {selectedBallot.selected?.length > 0 ? selectedBallot.selected.join(', ') : 'Không có'}
            </p>
            <p>
              Danh sách bị gạch:{' '}
              {selectedBallot.crossedOut?.length > 0 ? selectedBallot.crossedOut.join(', ') : 'Không có'}
            </p>

            {editingBallot ? (
              <div className="ballot-edit-box">
                <p className="muted">Chọn tên cần gạch trong phiếu này:</p>
                <div className="ballot-edit-list">
                  {(activeElection?.candidates ?? []).map((candidate) => (
                    <button
                      key={`edit-${candidate}`}
                      type="button"
                      className={`candidate-line ${editCrossedOut.has(candidate) ? 'crossed' : ''}`}
                      onClick={() => toggleEditCandidate(candidate)}
                    >
                      <span>{candidate}</span>
                      <small>{editCrossedOut.has(candidate) ? 'Đã gạch' : 'Còn hiệu lực'}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="modal-actions">
              {editingBallot ? (
                <>
                  <button type="button" className="primary-btn" onClick={saveBallotEdit} disabled={busy}>
                    {busy ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
                  </button>
                  <button type="button" onClick={() => setEditingBallot(false)} disabled={busy}>
                    Hủy chỉnh sửa
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBallot(true)
                      setEditCrossedOut(new Set(selectedBallot.crossedOut ?? []))
                    }}
                  >
                    Chỉnh sửa phiếu này
                  </button>
                  <button type="button" className="danger-btn" onClick={deleteBallotItem} disabled={busy}>
                    Xóa phiếu này
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedBallot(null)
                  setEditingBallot(false)
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {stackModalOpen && (
        <div className="modal-backdrop" onClick={() => setStackModalOpen(false)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Bảng xấp và thông tin chi tiết</h3>
            {stackSummary.length === 0 ? (
              <p className="muted">Chưa có xấp phiếu.</p>
            ) : (
              <div className="ballot-log-list">
                {stackSummary.map((stack) => (
                  <div key={`modal-stack-${stack.stackNumber}`} className="ballot-log-item">
                    <span>
                      Xấp {stack.stackNumber} - <strong>{stack.statusText}</strong>
                    </span>
                    <small>
                      Phiếu: {stack.total}/50 • Tín nhiệm: {stack.actualTrust}/{stack.expectedTrust} • Hợp lệ{' '}
                      {stack.valid} • Không hợp lệ {stack.invalid}
                    </small>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" onClick={() => setStackModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>
          Cấu trúc phiếu: tổng đại biểu {activeElection?.seats ?? 0}, được chọn{' '}
          {activeElection?.picksAllowed ?? 0}.
        </p>
      </footer>
    </div>
  )
}

export default App
