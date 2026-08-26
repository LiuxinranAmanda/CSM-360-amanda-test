export default function RenewalBadge({ date }) {
  if (!date) return null;
  
  const expiryDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let badgeClass = '';
  let labelText = '';
  
  if (diffDays <= 0) {
    badgeClass = 'rb-expired';
    labelText = '已过期';
  } else if (diffDays <= 30) {
    badgeClass = 'rb-danger';
    labelText = `${diffDays}天`;
  } else if (diffDays <= 60) {
    badgeClass = 'rb-warning';
    labelText = `${diffDays}天`;
  } else {
    badgeClass = 'rb-normal';
    labelText = `${diffDays}天`;
  }
  
  return (
    <span className={`renewal-badge ${badgeClass}`}>
      {labelText}
    </span>
  );
}