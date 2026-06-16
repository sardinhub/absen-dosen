export const formatTanggalStr = (tgl, lang = 'id') => {
  if (!tgl) return '-';
  const parts = tgl.split('T')[0].split('-');
  if (parts.length !== 3) return tgl;
  const monthsID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthsEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = lang === 'en' ? monthsEN : monthsID;
  return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
};
