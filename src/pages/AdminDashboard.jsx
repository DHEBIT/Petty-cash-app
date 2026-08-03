import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import StatCard from '../components/StatCard.jsx';
import LedgerCodePicker from '../components/LedgerCodePicker.jsx';
import { exportMonthEnd } from '../utils/exportLedger.js';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

function computeCashAtHand(ledger) {
  return ledger
    .filter((row) => row.status !== 'voided')
    .reduce((total, row) => {
      if (row.entry_type === 'disbursement') return total - Number(row.amount);
      return total + Number(row.amount);
    }, 0);
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [ledger, setLedger] = useState([]);
  const [requests, setRequests] = useState([]);
  const [toast, setToast] = useState('');

  const [fulfillingId, setFulfillingId] = useState(null);
  const [fulfilAmount, setFulfilAmount] = useState('');
  const [fulfilCode, setFulfilCode] = useState('');

  const [imprestAmount, setImprestAmount] = useState('');
  const [imprestNote, setImprestNote] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');

  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getFullYear());
  const [exportMonth, setExportMonth] = useState(now.getMonth() + 1);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ beneficiary: '', purpose: '', ledger_code: '' });
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_PAGE_SIZE = 15;

  const load = useCallback(async () => {
    const [{ data: ledgerData }, { data: reqData }] = await Promise.all([
      supabase.from('petty_cash_ledger').select('*').order('entry_date', { ascending: true }),
      supabase.from('petty_cash_requests').select('*').order('created_at', { ascending: false })
    ]);
    if (ledgerData) setLedger(ledgerData);
    if (reqData) setRequests(reqData);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cashAtHand = computeCashAtHand(ledger);
  const pending = requests.filter((r) => r.status === 'pending');

  function startFulfil(req) {
    setFulfillingId(req.id);
    setFulfilAmount(req.estimated_amount);
    setFulfilCode('');
  }

  async function viewReceipt(path) {
  const { data, error } = await supabase.storage
    .from('petty-cash-receipts')
    .createSignedUrl(path, 60); 
  if (error) { setToast(error.message); return; }
  window.open(data.signedUrl, '_blank');
}

  async function confirmFulfil(req) {
    if (!fulfilAmount || Number(fulfilAmount) <= 0) { setToast('Enter a valid amount given.'); return; }
    setToast('');
    const { data: ledgerRow, error: ledgerError } = await supabase
      .from('petty_cash_ledger')
      .insert({
        entry_type: 'disbursement',
        beneficiary: req.employee_name,
        purpose: req.purpose,
        ledger_code: fulfilCode.trim() || null,
        amount: Number(fulfilAmount),
        recorded_by: profile.id,
        request_id: req.id
      })
      .select().single();
    if (ledgerError) { setToast(ledgerError.message); return; }

    const { error: reqError } = await supabase
      .from('petty_cash_requests')
      .update({ status: 'fulfilled', fulfilled_ledger_id: ledgerRow.id })
      .eq('id', req.id);
    if (reqError) { setToast(reqError.message); return; }

    setFulfillingId(null);
    load();
  }

  async function declineRequest(id) {
    const { error } = await supabase.from('petty_cash_requests').update({ status: 'declined' }).eq('id', id);
    if (error) setToast(error.message); else load();
  }

  async function logImprest(e) {
    e.preventDefault();
    if (!imprestAmount || Number(imprestAmount) <= 0) { setToast('Enter a valid imprest amount.'); return; }
    const { error } = await supabase.from('petty_cash_ledger').insert({
      entry_type: 'imprest',
      purpose: imprestNote.trim() || 'Imprest replenishment',
      amount: Number(imprestAmount),
      recorded_by: profile.id
    });
    if (error) { setToast(error.message); return; }
    setImprestAmount(''); setImprestNote('');
    load();
  }

  async function logOpeningBalance(e) {
    e.preventDefault();
    if (!openingAmount || Number(openingAmount) <= 0) { setToast('Enter a valid opening balance.'); return; }
    const { error } = await supabase.from('petty_cash_ledger').insert({
      entry_type: 'opening_balance',
      purpose: 'Opening balance',
      amount: Number(openingAmount),
      recorded_by: profile.id
    });
    if (error) { setToast(error.message); return; }
    setOpeningAmount('');
    load();
  }

  async function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.trim().split('\n').map((line) => {
      const [code, ...rest] = line.split(',');
      return { code: code?.trim(), description: rest.join(',').trim() };
    }).filter((r) => r.code && r.description && r.code.toLowerCase() !== 'code');

    const batchSize = 500;
    let imported = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from('chart_of_accounts').upsert(batch, { onConflict: 'code' });
      if (error) { setToast(`Failed at row ${i}: ${error.message}`); e.target.value = ''; return; }
      imported += batch.length;
      setToast(`Imported ${imported} / ${rows.length}…`);
    }
    setToast(`Done — imported ${imported} accounts.`);
    e.target.value = '';
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      beneficiary: row.beneficiary || '',
      purpose: row.purpose || '',
      ledger_code: row.ledger_code || ''
    });
  }

  async function saveEdit(row) {
    const { error } = await supabase
      .from('petty_cash_ledger')
      .update({
        beneficiary: editForm.beneficiary.trim() || null,
        purpose: editForm.purpose.trim() || null,
        ledger_code: editForm.ledger_code.trim() || null
      })
      .eq('id', row.id);
    if (error) { setToast(error.message); return; }
    setEditingId(null);
    load();
  }

  function startVoid(row) {
    setVoidingId(row.id);
    setVoidReason('');
  }

  async function confirmVoid(row) {
    if (!voidReason.trim()) { setToast('Enter a reason for voiding this entry.'); return; }
    const { error } = await supabase
      .from('petty_cash_ledger')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: profile.id,
        void_reason: voidReason.trim()
      })
      .eq('id', row.id);
    if (error) { setToast(error.message); return; }
    setVoidingId(null);
    load();
  }

  let running = 0;
  const ledgerWithBalance = ledger.map((row) => {
    if (row.status !== 'voided') {
      running += row.entry_type === 'disbursement' ? -Number(row.amount) : Number(row.amount);
    }
    return { ...row, balanceAfter: running };
  });

  const reversedLedger = [...ledgerWithBalance].reverse();
  const filteredLedger = ledgerSearch.trim()
    ? reversedLedger.filter((row) => {
        const q = ledgerSearch.trim().toLowerCase();
        return (
          (row.beneficiary || '').toLowerCase().includes(q) ||
          (row.purpose || '').toLowerCase().includes(q) ||
          (row.ledger_code || '').toLowerCase().includes(q) ||
          row.entry_type.toLowerCase().includes(q)
        );
      })
    : reversedLedger;
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedger.length / LEDGER_PAGE_SIZE));
  const ledgerPageClamped = Math.min(ledgerPage, ledgerTotalPages);
  const pagedLedger = filteredLedger.slice(
    (ledgerPageClamped - 1) * LEDGER_PAGE_SIZE,
    ledgerPageClamped * LEDGER_PAGE_SIZE
  );

  return (
    <div className="app">
      <Sidebar
        links={[
          { href: '#pending', label: 'Pending' },
          { href: '#ledger', label: 'Ledger' },
          { href: '#chart-of-accounts', label: 'Chart of accounts' },
          { href: '#export', label: 'Export' }
        ]}
      />
      <div className="app-right">
        <Topbar title="Petty Cash Ledger — Finance" />
        <main className="main">
          <section className="stat-grid">
          <StatCard label="Cash at hand" value={`GHS ${cashAtHand.toFixed(2)}`} />
          <StatCard label="Pending requests" value={pending.length} tone={pending.length > 0 ? 'attention' : undefined} />
          <StatCard label="Ledger entries" value={ledger.length} />
        </section>

        {toast && <div className="alert alert-info">{toast}</div>}

        <section className="card" id="pending">
          <div className="card-header">
            <h2>Pending requests ({pending.length})</h2>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state">No pending requests.</div>
          ) : pending.map((req) => (
            <div key={req.id} className="request-card">
              <div className="request-card-header">
                <div>
                   <strong>{req.employee_name}</strong> <span className="cell-muted">— {req.department}</span>
                   <p>{req.purpose} — requested GHS {Number(req.estimated_amount).toFixed(2)}</p>
                     {req.receipt_path && (
                    <button className="btn btn-ghost btn-sm" onClick={() => viewReceipt(req.receipt_path)}>
                        📎 View attached document
                      </button>
                      )}
                       </div>
              </div>
              {fulfillingId === req.id ? (
                <div className="field-row" style={{ marginTop: 10, alignItems: 'end' }}>
                  <div className="field">
                    <label>Amount given (GHS)</label>
                    <input type="number" value={fulfilAmount} onChange={(e) => setFulfilAmount(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Ledger code</label>
                    <LedgerCodePicker value={fulfilCode} onChange={setFulfilCode} />
                  </div>
                  <div className="request-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => confirmFulfil(req)}>Confirm & disburse</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setFulfillingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="request-card-actions">
                  <button className="btn btn-approve btn-sm" onClick={() => startFulfil(req)}>Fulfil</button>
                  <button className="btn btn-reject btn-sm" onClick={() => declineRequest(req.id)}>Decline</button>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="card-pair">
          <section className="card">
            <div className="card-header"><h2>Log imprest replenishment</h2></div>
            <form className="inline-form" onSubmit={logImprest}>
              <div className="field">
                <label>Amount received (GHS)</label>
                <input type="number" value={imprestAmount} onChange={(e) => setImprestAmount(e.target.value)} />
              </div>
              <div className="field">
                <label>Note</label>
                <input value={imprestNote} onChange={(e) => setImprestNote(e.target.value)} placeholder="Optional" />
              </div>
              <button className="btn btn-secondary" type="submit">Log imprest</button>
            </form>
          </section>

          <section className="card">
            <div className="card-header"><h2>Set opening balance</h2></div>
            <form className="inline-form" onSubmit={logOpeningBalance}>
              <div className="field">
                <label>Opening balance (GHS)</label>
                <input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
              </div>
              <button className="btn btn-secondary" type="submit">Log opening balance</button>
            </form>
          </section>
        </div>

        <section className="card" id="chart-of-accounts">
          <div className="card-header">
            <h2>Chart of accounts</h2>
            <p>Upload a CSV with two columns: code, description.</p>
          </div>
          <input type="file" accept=".csv" onChange={handleCsvUpload} />
        </section>

        <section className="card card-narrow" id="export">
          <div className="card-header">
            <h2>Month-end export</h2>
            <p>Download a ledger extract for one month, formatted for posting.</p>
          </div>
          <div className="inline-form">
            <div className="field">
              <label>Month</label>
              <select value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Year</label>
              <input type="number" value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} style={{ width: 100 }} />
            </div>
            <button className="btn btn-secondary" onClick={() => exportMonthEnd(ledger, exportYear, exportMonth)}>
              Download .xlsx
            </button>
          </div>
        </section>

        <section className="card" id="ledger">
          <div className="card-header"><h2>Ledger</h2></div>
          <div style={{ margin: '14px 18px 0' }} className="table-search">
            <input
              placeholder="Search:"
              value={ledgerSearch}
              onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(1); }}
            />
          </div>
          <div className="table-wrap" style={{ margin: '10px 18px 0' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Beneficiary</th><th>Purpose</th><th>Code</th>
                  <th className="num">Amount</th><th className="num">Balance</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pagedLedger.map((row) => {
                  const isVoided = row.status === 'voided';
                  const isEditing = editingId === row.id;
                  const isVoiding = voidingId === row.id;

                  if (isEditing) {
                    return (
                      <tr key={row.id}>
                        <td className="cell-muted">{row.entry_date}</td>
                        <td><span className={`badge badge-${row.entry_type}`}>{row.entry_type.replace('_', ' ')}</span></td>
                        <td><input value={editForm.beneficiary} onChange={(e) => setEditForm({ ...editForm, beneficiary: e.target.value })} /></td>
                        <td><input value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} /></td>
                        <td><input value={editForm.ledger_code} onChange={(e) => setEditForm({ ...editForm, ledger_code: e.target.value })} /></td>
                        <td className="num">{row.entry_type === 'disbursement' ? '-' : '+'}GHS {Number(row.amount).toFixed(2)}</td>
                        <td className="num">GHS {row.balanceAfter.toFixed(2)}</td>
                        <td className="actions-cell">
                          <button className="btn btn-primary btn-sm" onClick={() => saveEdit(row)}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </td>
                      </tr>
                    );
                  }

                  if (isVoiding) {
                    return (
                      <tr key={row.id}>
                        <td colSpan={8}>
                          <div className="field-row" style={{ alignItems: 'end', margin: '8px 0' }}>
                            <div className="field" style={{ gridColumn: 'span 3' }}>
                              <label>Reason for voiding this entry</label>
                              <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Duplicate entry, wrong amount recorded" />
                            </div>
                            <div>
                              <button className="btn btn-reject btn-sm" onClick={() => confirmVoid(row)}>Confirm void</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setVoidingId(null)}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.id} style={isVoided ? { opacity: 0.5 } : undefined}>
                      <td className="cell-muted">{row.entry_date}</td>
                      <td>
                        <span className={`badge badge-${row.entry_type}`}>{row.entry_type.replace('_', ' ')}</span>
                        {isVoided && <div><span className="badge badge-declined" style={{ marginTop: 4 }}>voided</span></div>}
                      </td>
                      <td>{row.beneficiary || '—'}</td>
                      <td>
                        {row.purpose || '—'}
                        {isVoided && row.void_reason && (
                          <div className="cell-muted" style={{ fontStyle: 'italic' }}>Reason: {row.void_reason}</div>
                        )}
                      </td>
                      <td className="cell-muted">{row.ledger_code || '—'}</td>
                      <td className="num" style={isVoided ? { textDecoration: 'line-through' } : undefined}>
                        {row.entry_type === 'disbursement' ? '-' : '+'}GHS {Number(row.amount).toFixed(2)}
                      </td>
                      <td className="num">GHS {row.balanceAfter.toFixed(2)}</td>
                      <td className="actions-cell">
                        {!isVoided && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(row)}>Edit</button>
                            <button className="btn btn-reject btn-sm" onClick={() => startVoid(row)}>Void</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-pagination" style={{ margin: '10px 18px 16px' }}>
            <span>
              Showing {filteredLedger.length === 0 ? 0 : (ledgerPageClamped - 1) * LEDGER_PAGE_SIZE + 1}
              {' '}to {Math.min(ledgerPageClamped * LEDGER_PAGE_SIZE, filteredLedger.length)} of {filteredLedger.length} entries
            </span>
            <span className="table-pagination-pages">
              <button disabled={ledgerPageClamped === 1} onClick={() => setLedgerPage(ledgerPageClamped - 1)}>Previous</button>
              {Array.from({ length: ledgerTotalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === ledgerTotalPages || Math.abs(p - ledgerPageClamped) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '…' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '3px 4px' }}>…</span>
                  ) : (
                    <button key={p} className={p === ledgerPageClamped ? 'active' : ''} onClick={() => setLedgerPage(p)}>{p}</button>
                  )
                )}
              <button disabled={ledgerPageClamped === ledgerTotalPages} onClick={() => setLedgerPage(ledgerPageClamped + 1)}>Next</button>
            </span>
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}