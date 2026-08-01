import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LedgerCodePicker({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);
      if (!error) setResults(data || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function pick(account) {
    onChange(account.code);
    setSelectedLabel(`${account.code} — ${account.description}`);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="picker">
      <input
        className="picker-input"
        value={open ? query : (selectedLabel || value || '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        placeholder="Type to search code or description…"
      />
      {open && results.length > 0 && (
        <div className="picker-results">
          {results.map((a) => (
            <div key={a.id} className="picker-result" onClick={() => pick(a)}>
              <strong>{a.code}</strong> — {a.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}