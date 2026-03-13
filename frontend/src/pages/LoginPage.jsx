import { useState } from 'react'

function LoginPage({ loginForm, setLoginForm, login, authBusy, notice }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="login-shell">
      <div className="app-shell login-container">
        <header className="app-header">
          <p className="eyebrow">Vote Tracker</p>
          <h1>Đăng nhập hệ thống kiểm phiếu</h1>
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
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="password-toggle-btn"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
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
