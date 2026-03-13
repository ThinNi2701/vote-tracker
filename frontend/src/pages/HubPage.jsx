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
  managedUsers,
  newUserForm,
  setNewUserForm,
  createUserAccount,
  permissionDrafts,
  toggleUserElectionPermission,
  saveUserPermissions,
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
        <>
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

          <section className="panel admin-users-panel">
            <h2>Quản lý tài khoản kiểm phiếu</h2>
            <form onSubmit={createUserAccount} className="creator-form">
              <div className="inline-fields">
                <label>
                  Tên đăng nhập
                  <input
                    value={newUserForm.username}
                    onChange={(event) =>
                      setNewUserForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    placeholder="vd: user01"
                  />
                </label>
                <label>
                  Tên hiển thị
                  <input
                    value={newUserForm.name}
                    onChange={(event) =>
                      setNewUserForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Người kiểm phiếu 01"
                  />
                </label>
              </div>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Tối thiểu 4 ký tự"
                />
              </label>
              <button type="submit" className="primary-btn" disabled={busy}>
                Tạo tài khoản mới
              </button>
            </form>

            <div className="permission-grid">
              {managedUsers.filter((user) => user.role === 'user').length === 0 ? (
                <p className="muted">Chưa có tài khoản user để phân quyền.</p>
              ) : (
                managedUsers
                  .filter((user) => user.role === 'user')
                  .map((user) => {
                    const selectedElectionIds = permissionDrafts[user.id] ?? user.allowedElectionIds ?? []

                    return (
                      <article key={user.id} className="user-permission-card">
                        <h3>{user.name}</h3>
                        <p className="muted">@{user.username}</p>

                        <div className="permission-checkboxes">
                          {elections.length === 0 ? (
                            <p className="muted">Chưa có cuộc bầu cử để gán quyền.</p>
                          ) : (
                            elections.map((election) => (
                              <label key={`${user.id}-${election.id}`} className="permission-item">
                                <input
                                  type="checkbox"
                                  checked={selectedElectionIds.includes(election.id)}
                                  onChange={() => toggleUserElectionPermission(user.id, election.id)}
                                />
                                <span>{election.name}</span>
                              </label>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => saveUserPermissions(user.id)}
                          disabled={busy}
                        >
                          Lưu phân quyền
                        </button>
                      </article>
                    )
                  })
              )}
            </div>
          </section>
        </>
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
