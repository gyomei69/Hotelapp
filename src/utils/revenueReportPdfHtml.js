function escapeHtml(s) {
  const str = s == null ? '' : String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildRevenueReportHtml(data) {
  const hotel = escapeHtml(data.hotelName || 'Aurora Grand Hotel');
  const reportType = escapeHtml(data.reportType || '');
  const generated = escapeHtml(
    data.generatedAt ? new Date(data.generatedAt).toLocaleString() : new Date().toLocaleString()
  );
  const total = Number(data.totalRevenue || 0);
  const rows = (data.breakdown || [])
    .map((line) => {
      const paidStr = line.paidAt ? new Date(line.paidAt).toLocaleString() : '';
      return (
        '<tr>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;">' +
        escapeHtml(line.guest) +
        '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;">' +
        escapeHtml(line.room) +
        '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">' +
        '\u20b1' +
        Number(line.amount || 0).toLocaleString() +
        '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:11px;">' +
        escapeHtml(paidStr) +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  const emptyRow =
    '<tr><td colspan="4" style="padding:12px;">No paid bookings in this period.</td></tr>';
  const bodyRows = rows || emptyRow;

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<title>Revenue Report</title>' +
    '<style>' +
    'body{font-family:system-ui,sans-serif;color:#1B2036;padding:24px;}' +
    'h1{font-size:22px;margin:0 0 8px;}' +
    '.meta{color:#64748b;font-size:13px;margin-bottom:24px;}' +
    '.total{font-size:18px;font-weight:700;margin:16px 0;}' +
    'table{width:100%;border-collapse:collapse;font-size:13px;}' +
    'th{text-align:left;padding:8px;background:#f1f5f9;}' +
    '</style></head><body>' +
    '<h1>' +
    hotel +
    '</h1>' +
    '<div class="meta">Report: ' +
    reportType +
    '<br/>Generated: ' +
    generated +
    '</div>' +
    '<div class="total">Total revenue: \u20b1' +
    total.toLocaleString() +
    '</div>' +
    '<table><thead><tr><th>Guest</th><th>Room</th>' +
    '<th style="text-align:right;">Amount</th><th>Paid</th></tr></thead><tbody>' +
    bodyRows +
    '</tbody></table></body></html>'
  );
}
