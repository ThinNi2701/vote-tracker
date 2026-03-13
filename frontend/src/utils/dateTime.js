export function formatDateTime(value) {
  if (!value) {
    return 'Không rõ thời gian'
  }
  return new Date(value).toLocaleString('vi-VN')
}
