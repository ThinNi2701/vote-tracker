function MainLayout({ header, children, footer }) {
  return (
    <div className="app-shell">
      {header}
      {children}
      {footer}
    </div>
  )
}

export default MainLayout
