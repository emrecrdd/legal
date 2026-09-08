export const money = (value, currency = 'TRY') => {
  const n = Number(value || 0);
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0); }
  catch { return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'} ${currency || ''}`.trim(); }
};
export const dateTR = (value) => value ? new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Europe/Istanbul' }).format(new Date(value)) : '-';
export const transactionLabel = (type) => ({ receipt:'Tahsilat', expense:'Gider', refund:'İade', transfer_in:'Transfer Girişi', transfer_out:'Transfer Çıkışı', reversal:'Ters Kayıt' }[type] || type || '-');
export const statusLabel = (status) => ({ draft:'Taslak', posted:'İşlendi', open:'Açık', partially_paid:'Kısmi Ödendi', paid:'Ödendi', reversed:'Ters Kayıt', active:'Aktif', completed:'Tamamlandı', cancelled:'İptal' }[status] || status || '-');
export const rowsOf = (value) => Array.isArray(value?.rows) ? value.rows : Array.isArray(value) ? value : [];
