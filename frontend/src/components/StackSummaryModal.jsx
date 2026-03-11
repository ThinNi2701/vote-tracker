import { useEffect, useMemo, useState } from 'react'

function StackSummaryModal({ stackModalOpen, stackSummary, ballotsWithNumber, closeModal }) {
  const [expandedStack, setExpandedStack] = useState(null)
  const [detailStackNumber, setDetailStackNumber] = useState(null)

  const ballotsByStack = useMemo(() => {
    const grouped = {}
    ballotsWithNumber.forEach((ballot) => {
      const key = ballot.stackNumber
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(ballot)
    })
    return grouped
  }, [ballotsWithNumber])

  useEffect(() => {
    if (!stackModalOpen) {
      setExpandedStack(null)
      setDetailStackNumber(null)
    }
  }, [stackModalOpen])

  if (!stackModalOpen) {
    return null
  }

  const detailStack = stackSummary.find((item) => item.stackNumber === detailStackNumber)
  const detailBallots = detailStack ? ballotsByStack[detailStack.stackNumber] || [] : []
  const detailDelta = detailStack ? detailStack.actualTrust - detailStack.expectedTrust : 0

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <h3>Bảng xấp và thông tin chi tiết</h3>
        {stackSummary.length === 0 ? (
          <p className="muted">Chưa có xấp phiếu.</p>
        ) : (
          <div className="stack-box-list">
            {stackSummary.map((stack) => (
              <div key={`modal-stack-${stack.stackNumber}`} className="stack-box">
                <div className="stack-box-head">
                  <div>
                    <p className="stack-box-title">
                      Xấp {stack.stackNumber} - <strong>{stack.statusText}</strong>
                    </p>
                    <small>
                      Phiếu: {stack.total}/50 • Tín nhiệm: {stack.actualTrust}/{stack.expectedTrust} • Hợp lệ{' '}
                      {stack.valid} • Không hợp lệ {stack.invalid}
                    </small>
                  </div>
                  <div className="stack-box-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStack((prev) => (prev === stack.stackNumber ? null : stack.stackNumber))
                      }
                    >
                      {expandedStack === stack.stackNumber ? 'Ẩn phiếu' : `Xem phiếu xấp ${stack.stackNumber}`}
                    </button>
                    <button type="button" onClick={() => setDetailStackNumber(stack.stackNumber)}>
                      Chi tiết
                    </button>
                  </div>
                </div>

                {expandedStack === stack.stackNumber ? (
                  <div className="stack-ballot-list">
                    {(ballotsByStack[stack.stackNumber] || []).length === 0 ? (
                      <p className="muted">Không có phiếu trong xấp này.</p>
                    ) : (
                      (ballotsByStack[stack.stackNumber] || []).map((ballot) => (
                        <div key={`stack-${stack.stackNumber}-ballot-${ballot.displayNumber}`} className="stack-ballot-item">
                          <span>Phiếu #{ballot.displayNumber}</span>
                          <small>
                            {ballot.status.label} • Tín nhiệm {ballot.status.trustValue} • STT {ballot.stackIndex}/50
                          </small>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {detailStack ? (
          <div className="stack-detail-card">
            <h4>Tóm tắt xấp {detailStack.stackNumber}</h4>
            <ul>
              <li>Tổng phiếu trong xấp: {detailStack.total}</li>
              <li>Phiếu hợp lệ: {detailStack.valid}</li>
              <li>Phiếu không hợp lệ: {detailStack.invalid}</li>
              <li>Tổng tín nhiệm thực tế: {detailStack.actualTrust}</li>
              <li>Tổng tín nhiệm kỳ vọng: {detailStack.expectedTrust}</li>
              <li>Chênh lệch tín nhiệm: {detailDelta}</li>
              <li>Kết luận: {detailStack.statusText}</li>
            </ul>
            <p className="muted">Số phiếu đang hiển thị trong tóm tắt: {detailBallots.length}</p>
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" onClick={closeModal}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default StackSummaryModal
