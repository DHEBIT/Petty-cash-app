export function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', percent: 0 };

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: 'Very weak', color: '#B3261E' },
    { label: 'Weak', color: '#C4571B' },
    { label: 'Fair', color: '#8A5B10' },
    { label: 'Good', color: '#3B6D11' },
    { label: 'Strong', color: '#1E7A3B' }
  ];
  const clamped = Math.min(score, 4);
  return { score: clamped, ...levels[clamped], percent: ((clamped + 1) / 5) * 100 };
} 
