import { useEffect, useMemo, useState } from 'react'
import './App.css'
import LoginPage from './pages/LoginPage'
import HubPage from './pages/HubPage'
import WorkspacePage from './pages/WorkspacePage'
import BallotDetailModal from './components/BallotDetailModal'
import StackSummaryModal from './components/StackSummaryModal'
import {
  buildBallotsWithMeta,
  classifyBallot,
  computeBallotStats,
  requestJsonFactory,
} from './utils/voteUtils'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
const SESSION_KEY = 'vote-tracker-session'

function App() {
  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [authBooting, setAuthBooting] = useState(true)
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
  const [selectedBallotFilter, setSelectedBallotFilter] = useState('all')
  const [selectedBallotNumbers, setSelectedBallotNumbers] = useState(new Set())
  const [newElection, setNewElection] = useState({
    name: '',
    seats: 5,
    picksAllowed: 3,
    candidatesText: '',
  })

  const isAdmin = currentUser?.role === 'admin'
  const requestJson = useMemo(() => requestJsonFactory(token), [token])

  useEffect(() => {
    const bootstrapAuth = async () => {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) {
        setAuthBooting(false)
        return
      }

      try {
        const parsed = JSON.parse(raw)
        if (!parsed?.token) {
          localStorage.removeItem(SESSION_KEY)
          setAuthBooting(false)
          return
        }

        const requestWithSavedToken = requestJsonFactory(parsed.token)
        const profile = await requestWithSavedToken(`${API_BASE_URL}/auth/me`)

        setToken(parsed.token)
        setCurrentUser(profile)
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            token: parsed.token,
            user: profile,
          }),
        )
      } catch {
        localStorage.removeItem(SESSION_KEY)
        setToken('')
        setCurrentUser(null)
      } finally {
        setAuthBooting(false)
      }
    }

    bootstrapAuth()
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

  const invalidDetailOptions = useMemo(() => {
    const labels = new Set()
    ballotsWithNumber.forEach((ballot) => {
      if (ballot.status.category === 'short' && ballot.status.detailLabel) {
        labels.add(ballot.status.detailLabel)
      }
    })

    return Array.from(labels).sort((a, b) => {
      const aNumber = Number(a.replace('Thiếu ', ''))
      const bNumber = Number(b.replace('Thiếu ', ''))
      if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) {
        return a.localeCompare(b, 'vi')
      }
      return aNumber - bNumber
    })
  }, [ballotsWithNumber])

  const filteredBallots = useMemo(() => {
    let list = ballotsWithNumber

    if (selectedStack !== 'all') {
      const stackNo = Number(selectedStack)
      list = list.filter((item) => item.stackNumber === stackNo)
    }

    if (selectedBallotFilter === 'valid') {
      return list.filter((item) => item.status.isValid)
    }

    if (selectedBallotFilter.startsWith('detail:')) {
      const detail = selectedBallotFilter.slice('detail:'.length)
      return list.filter((item) => item.status.category === 'short' && item.status.detailLabel === detail)
    }

    return list
  }, [ballotsWithNumber, selectedStack, selectedBallotFilter])

  const selectedNow = activeElection
    ? activeElection.candidates.filter((name) => !crossedOut.has(name))
    : []

  const currentBallotValid = activeElection
    ? selectedNow.length <= activeElection.picksAllowed
    : false

  const stats = useMemo(
    () => computeBallotStats(activeElection ?? { candidates: [], ballots: [], picksAllowed: 0 }),
    [activeElection],
  )

  const totalBallots = activeElection?.ballots.length ?? 0
  const invalidBallots = totalBallots - stats.validBallots
  const totalTrustVotes = ballotsWithNumber.reduce((sum, ballot) => sum + (ballot.status?.trustValue ?? 0), 0)

  useEffect(() => {
    setSelectedStack('all')
    setSelectedBallotFilter('all')
    setSelectedBallotNumbers(new Set())
  }, [activeElectionId])

  useEffect(() => {
    const visibleNumbers = new Set(ballotsWithNumber.map((item) => item.displayNumber))
    setSelectedBallotNumbers((prev) => {
      const next = new Set([...prev].filter((num) => visibleNumbers.has(num)))
      return next.size === prev.size ? prev : next
    })
  }, [ballotsWithNumber])

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
    const data = await withAuth(() => requestJson(`${API_BASE_URL}/elections`))
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
    const detail = await withAuth(() => requestJson(`${API_BASE_URL}/elections/${id}`))
    if (!detail) {
      return
    }
    setActiveElection(detail)
    setActiveElectionId(detail.id)
  }

  useEffect(() => {
    if (authBooting) {
      return
    }

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
  }, [token, authBooting])

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
        requestJson(`${API_BASE_URL}/elections/${activeElection.id}/ballots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      )
      if (!response) {
        return
      }

      const savedStatus = classifyBallot(response.ballot, activeElection.picksAllowed)
      await Promise.all([loadElectionDetail(activeElection.id), loadElections()])
      setCrossedOut(new Set())
      if (savedStatus.category === 'short') {
        setNotice(`Đã lưu phiếu #${response.ballot.ballotNumber ?? totalBallots + 1} dạng phiếu thiếu.`)
      } else if (savedStatus.isValid) {
        setNotice(`Đã lưu lá phiếu #${response.ballot.ballotNumber ?? totalBallots + 1} hợp lệ.`)
      } else {
        setNotice(`Lá phiếu #${response.ballot.ballotNumber ?? totalBallots + 1} không hợp lệ.`)
      }
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
        requestJson(`${API_BASE_URL}/elections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newElection.name.trim(),
            seats: Number(newElection.seats),
            picksAllowed: Number(newElection.picksAllowed),
            candidates,
          }),
        }),
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
      const deleted = await withAuth(() => requestJson(`${API_BASE_URL}/elections/${id}`, { method: 'DELETE' }))
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

  const renameElection = async (nextName) => {
    if (!activeElection || !isAdmin) {
      return
    }

    const trimmed = String(nextName ?? '').trim()
    if (!trimmed) {
      setNotice('Tên cuộc bầu cử không được để trống.')
      return
    }

    if (trimmed === activeElection.name) {
      return
    }

    try {
      setBusy(true)
      const response = await withAuth(() =>
        requestJson(`${API_BASE_URL}/elections/${activeElection.id}/name`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        }),
      )
      if (!response) {
        return
      }

      await Promise.all([loadElectionDetail(activeElection.id), loadElections()])
      setNotice('Đã cập nhật tên cuộc bầu cử.')
    } catch (error) {
      setNotice(`Không thể cập nhật tên cuộc bầu cử: ${error.message}`)
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
      const response = await updateBallotRequest(activeElection.id, selectedBallot.displayNumber, payload)
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

    const willDelete = window.confirm(`Bạn có chắc muốn xóa phiếu #${selectedBallot.displayNumber} không?`)
    if (!willDelete) {
      return
    }

    try {
      setBusy(true)
      const response = await deleteBallotRequest(activeElection.id, selectedBallot.displayNumber)
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

  const updateBallotRequest = async (electionId, ballotNumber, payload) => {
    try {
      return await withAuth(() =>
        requestJson(`${API_BASE_URL}/elections/${electionId}/ballots/${ballotNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      )
    } catch (error) {
      if (!error?.status || error.status === 404 || error.status === 405) {
        return await withAuth(() =>
          requestJson(`${API_BASE_URL}/elections/${electionId}/ballots/${ballotNumber}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        )
      }
      throw error
    }
  }

  const deleteBallotRequest = async (electionId, ballotNumber) => {
    try {
      return await withAuth(() =>
        requestJson(`${API_BASE_URL}/elections/${electionId}/ballots/${ballotNumber}`, {
          method: 'DELETE',
        }),
      )
    } catch (error) {
      if (!error?.status || error.status === 404 || error.status === 405) {
        return await withAuth(() =>
          requestJson(`${API_BASE_URL}/elections/${electionId}/ballots/${ballotNumber}/delete`, {
            method: 'POST',
          }),
        )
      }
      throw error
    }
  }

  const toggleBallotSelection = (displayNumber) => {
    setSelectedBallotNumbers((prev) => {
      const next = new Set(prev)
      if (next.has(displayNumber)) {
        next.delete(displayNumber)
      } else {
        next.add(displayNumber)
      }
      return next
    })
  }

  const clearSelectedBallots = () => {
    setSelectedBallotNumbers(new Set())
  }

  const toggleSelectAllFiltered = () => {
    const filteredNumbers = filteredBallots.map((item) => item.displayNumber)
    const isAllSelected =
      filteredNumbers.length > 0 && filteredNumbers.every((number) => selectedBallotNumbers.has(number))

    setSelectedBallotNumbers((prev) => {
      const next = new Set(prev)
      if (isAllSelected) {
        filteredNumbers.forEach((number) => next.delete(number))
      } else {
        filteredNumbers.forEach((number) => next.add(number))
      }
      return next
    })
  }

  const deleteSelectedBallots = async () => {
    if (!activeElection || selectedBallotNumbers.size === 0) {
      return
    }

    const selectedNumbers = Array.from(selectedBallotNumbers).sort((a, b) => b - a)
    const willDelete = window.confirm(`Bạn có chắc muốn xóa ${selectedNumbers.length} phiếu đã chọn không?`)
    if (!willDelete) {
      return
    }

    try {
      setBusy(true)

      for (const number of selectedNumbers) {
        const result = await deleteBallotRequest(activeElection.id, number)
        if (!result) {
          return
        }
      }

      await Promise.all([loadElectionDetail(activeElection.id), loadElections()])
      if (selectedBallot && selectedNumbers.includes(selectedBallot.displayNumber)) {
        setSelectedBallot(null)
        setEditingBallot(false)
      }
      setSelectedBallotNumbers(new Set())
      setNotice(`Đã xóa ${selectedNumbers.length} phiếu đã chọn.`)
    } catch (error) {
      setNotice(`Không thể xóa phiếu đã chọn: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    if (authBooting) {
      return (
        <div className="app-shell">
          <div className="panel">Đang kiểm tra phiên đăng nhập...</div>
        </div>
      )
    }

    return (
      <LoginPage
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        login={login}
        authBusy={authBusy}
        notice={notice}
      />
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
        <h1>Hệ thống kiểm phiếu Online</h1>
        <p>
          Xin chào {currentUser?.name} ({currentUser?.role === 'admin' ? 'Quản trị' : 'Kiểm phiếu'})
        </p>
        <div className="election-actions">
          <button type="button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {screen === 'hub' ? (
        <HubPage
          elections={elections}
          activeElectionId={activeElectionId}
          busy={busy}
          isAdmin={isAdmin}
          enterWorkspace={enterWorkspace}
          removeElection={removeElection}
          newElection={newElection}
          setNewElection={setNewElection}
          createElection={createElection}
        />
      ) : (
        <WorkspacePage
          activeElection={activeElection}
          isAdmin={isAdmin}
          totalBallots={totalBallots}
          totalTrustVotes={totalTrustVotes}
          stats={stats}
          invalidBallots={invalidBallots}
          selectedNow={selectedNow}
          currentBallotValid={currentBallotValid}
          stackSummary={stackSummary}
          ballotsWithNumber={ballotsWithNumber}
          filteredBallots={filteredBallots}
          selectedStack={selectedStack}
          setSelectedStack={setSelectedStack}
          selectedBallotFilter={selectedBallotFilter}
          setSelectedBallotFilter={setSelectedBallotFilter}
          invalidDetailOptions={invalidDetailOptions}
          selectedBallotNumbers={selectedBallotNumbers}
          toggleBallotSelection={toggleBallotSelection}
          toggleSelectAllFiltered={toggleSelectAllFiltered}
          clearSelectedBallots={clearSelectedBallots}
          deleteSelectedBallots={deleteSelectedBallots}
          renameElection={renameElection}
          setStackModalOpen={setStackModalOpen}
          crossOutHandlers={{
            busy,
            crossedOut,
            submitBallot,
            clearBallot: () => setCrossedOut(new Set()),
            openBallotDetail,
            toggleCandidate,
          }}
        />
      )}

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      <BallotDetailModal
        selectedBallot={selectedBallot}
        activeElection={activeElection}
        editingBallot={editingBallot}
        editCrossedOut={editCrossedOut}
        toggleEditCandidate={toggleEditCandidate}
        saveBallotEdit={saveBallotEdit}
        setEditingBallot={setEditingBallot}
        setEditCrossedOut={setEditCrossedOut}
        deleteBallotItem={deleteBallotItem}
        closeModal={() => {
          setSelectedBallot(null)
          setEditingBallot(false)
        }}
        busy={busy}
      />

      <StackSummaryModal
        stackModalOpen={stackModalOpen}
        stackSummary={stackSummary}
        ballotsWithNumber={ballotsWithNumber}
        closeModal={() => setStackModalOpen(false)}
      />

      <footer className="app-footer">
        <p>
          Cấu trúc phiếu: tổng đại biểu {activeElection?.seats ?? 0}, được chọn{' '}
          {activeElection?.picksAllowed ?? 0}.
        </p>
        <p style={{textAlign: 'right', fontStyle: 'italic'}}>
            © 2026 - Develop by Nguyen Bao Thien
        </p>
      </footer>
    </div>
  )
}

export default App
