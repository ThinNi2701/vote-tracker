import { useEffect, useState } from 'react'

function WorkspacePage({
  activeElection,
  isAdmin,
  totalBallots,
  totalTrustVotes,
  stats,
  invalidBallots,
  selectedNow,
  currentBallotValid,
  stackSummary,
  ballotsWithNumber,
  filteredBallots,
  selectedStack,
  setSelectedStack,
  selectedBallotFilter,
  setSelectedBallotFilter,
  invalidDetailOptions,
  selectedBallotNumbers,
  toggleBallotSelection,
  toggleSelectAllFiltered,
  clearSelectedBallots,
  deleteSelectedBallots,
  renameElection,
  setStackModalOpen,
  crossOutHandlers,
}) {
  const {
    busy,
    crossedOut,
    submitBallot,
    clearBallot,
    openBallotDetail,
    toggleCandidate,
  } = crossOutHandlers

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameInput, setRenameInput] = useState('')

  useEffect(() => {
    setIsRenaming(false)
    setRenameInput(activeElection?.name ?? '')
  }, [activeElection?.id, activeElection?.name])

  const submitRenameElection = async (event) => {
    event.preventDefault()
    await renameElection(renameInput)
    setIsRenaming(false)
  }

  return (
    <main className="workspace-grid">
      <section className="panel stats-panel">
        <div className="section-title-row">
          <h2>{activeElection?.name ?? 'Chưa có cuộc bầu cử'}</h2>
          {isAdmin ? (
            isRenaming ? (
              <button
                type="button"
                onClick={() => {
                  setIsRenaming(false)
                  setRenameInput(activeElection?.name ?? '')
                }}
                disabled={busy}
              >
                Hủy
              </button>
            ) : (
              <button type="button" onClick={() => setIsRenaming(true)} disabled={busy}>
                Sửa tên cuộc bầu cử
              </button>
            )
          ) : null}
        </div>

        {isAdmin && isRenaming ? (
          <form className="creator-form" onSubmit={submitRenameElection}>
            <label>
              Tên cuộc bầu cử mới
              <input
                value={renameInput}
                onChange={(event) => setRenameInput(event.target.value)}
                placeholder="Nhập tên cuộc bầu cử"
              />
            </label>
            <button type="submit" className="primary-btn" disabled={busy}>
              Lưu tên mới
            </button>
          </form>
        ) : null}

        <div className="metric-bubbles" role="status" aria-label="Tổng quan phiếu bầu">
          <div className="metric-bubble ballots">
            <span>Tổng số phiếu</span>
            <strong>{totalBallots}</strong>
          </div>
          <div className="metric-bubble trust">
            <span>Tổng tín nhiệm</span>
            <strong>{totalTrustVotes}</strong>
          </div>
        </div>

        <ul>
          <li>Phiếu hợp lệ: {stats.validBallots}</li>
          <li>Phiếu thiếu (vẫn hợp lệ): {stats.shortBallots}</li>
          <li>Phiếu không hợp lệ: {invalidBallots}</li>
          <li>
            Đang chọn: {selectedNow.length}/{activeElection?.picksAllowed ?? 0}
          </li>
        </ul>

        <div className="ballot-log">
          <h3>Phân loại phiếu thiếu</h3>
          {Object.keys(stats.shortBuckets).length === 0 ? (
            <p className="muted">Chưa có phiếu thiếu.</p>
          ) : (
            <div className="ballot-log-list">
              {Object.entries(stats.shortBuckets).map(([label, count]) => (
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
            ? selectedNow.length === (activeElection?.picksAllowed ?? 0)
              ? 'Lá phiếu hiện tại hợp lệ, có thể lưu.'
              : 'Lá phiếu hiện tại là phiếu thiếu, vẫn hợp lệ và được tính tỉ lệ.'
            : `Đang chọn quá số lượng cho phép (${activeElection?.picksAllowed ?? 0}).`}
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
                <select value={selectedStack} onChange={(event) => setSelectedStack(event.target.value)}>
                  <option value="all">Tất cả các xấp</option>
                  {stackSummary.map((stack) => (
                    <option key={`opt-${stack.stackNumber}`} value={stack.stackNumber}>
                      Xấp {stack.stackNumber} - {stack.statusText}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-filter">
                Lọc trạng thái phiếu
                <select
                  value={selectedBallotFilter}
                  onChange={(event) => setSelectedBallotFilter(event.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="valid">Chỉ phiếu hợp lệ</option>
                  {invalidDetailOptions.map((detail) => (
                    <option key={`invalid-detail-${detail}`} value={`detail:${detail}`}>
                      Phiếu {detail.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>

              <div className="ballot-bulk-actions">
                <small>Đã chọn: {selectedBallotNumbers.size} phiếu</small>
                <button type="button" onClick={toggleSelectAllFiltered} disabled={filteredBallots.length === 0}>
                  Chọn/Bỏ chọn tất cả theo bộ lọc
                </button>
                <button type="button" onClick={clearSelectedBallots} disabled={selectedBallotNumbers.size === 0}>
                  Bỏ chọn tất cả
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={deleteSelectedBallots}
                  disabled={selectedBallotNumbers.size === 0 || busy}
                >
                  Xóa phiếu đã chọn
                </button>
              </div>

              <div className="ballot-log-list">
                {filteredBallots.length === 0 ? (
                  <p className="muted">Không có phiếu phù hợp với bộ lọc hiện tại.</p>
                ) : (
                  filteredBallots.map((ballot) => (
                    <div key={`${ballot.id}-${ballot.displayNumber}`} className="ballot-log-item with-check">
                      <input
                        type="checkbox"
                        checked={selectedBallotNumbers.has(ballot.displayNumber)}
                        onChange={() => toggleBallotSelection(ballot.displayNumber)}
                        aria-label={`Chọn phiếu #${ballot.displayNumber}`}
                      />
                      <button
                        type="button"
                        className="ballot-open-btn"
                        onClick={() => openBallotDetail(ballot)}
                      >
                        <span>
                          Phiếu #{ballot.displayNumber} • Xấp {ballot.stackNumber} (STT {ballot.stackIndex}/50)
                        </span>
                        <small>{ballot.status.label}</small>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel ballot-panel">
        <h2>Phiếu mô phỏng</h2>
        <div className="ballot-paper">
          <p className="ballot-seq">Phiếu thứ {totalBallots + 1}</p>
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
              <small className="candidate-meta">
                <span>{crossedOut.has(name) ? 'Đã gạch' : 'Còn hiệu lực'}</span>
              </small>
            </button>
          ))}

          <div className="action-row inside-ballot-actions">
            <button type="button" className="primary-btn" onClick={submitBallot} disabled={busy}>
              {busy ? 'Đang xử lý...' : 'Lưu phiếu'}
            </button>
            <button type="button" onClick={clearBallot} disabled={busy}>
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
  )
}

export default WorkspacePage
