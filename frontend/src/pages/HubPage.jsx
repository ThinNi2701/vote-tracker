function HubPage({
  elections,
  activeElectionId,
  busy,
  isAdmin,
  enterWorkspace,
  removeElection,
  newElection,
  setNewElection,
  createElection,
}) {
  return (
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
                placeholder={'Nguyen Van A\nTran Thi B\nLe Van C'}
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
  )
}

export default HubPage
