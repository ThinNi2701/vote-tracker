function LoginPage({ loginForm, setLoginForm, login, authBusy, notice }) {
  return (
    <div className="login-shell">
      <div className="app-shell login-container">
        <header className="app-header">
          <p className="eyebrow">Vote Tracker</p>
          <h1>Đăng nhập hệ thống kiểm phiếu</h1>
          <p>Tài khoản mặc định: admin/admin123 (quản trị), user/user123 (kiểm phiếu).</p>
        </header>
        <main className="login-main">
          <section className="panel creator-panel login-panel">
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
    </div>
  )
}

export default LoginPage
