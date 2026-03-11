import { classifyBallot, formatDateTime } from '../utils/voteUtils'

function BallotDetailModal({
  selectedBallot,
  activeElection,
  editingBallot,
  editCrossedOut,
  toggleEditCandidate,
  saveBallotEdit,
  setEditingBallot,
  setEditCrossedOut,
  deleteBallotItem,
  closeModal,
  busy,
}) {
  if (!selectedBallot) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <h3>Chi tiết phiếu #{selectedBallot.displayNumber}</h3>
        <p className="muted">Thời gian: {formatDateTime(selectedBallot.createdAt)}</p>
        <p>
          Xấp {selectedBallot.stackNumber} • STT {selectedBallot.stackIndex}/50
        </p>
        <p>
          Trạng thái: <strong>{classifyBallot(selectedBallot, activeElection?.picksAllowed ?? 0).label}</strong>
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
          <button type="button" onClick={closeModal}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default BallotDetailModal
