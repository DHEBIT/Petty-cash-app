import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
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

export default function EmployeeDashboard() {
  const { profile } = useAuth();
  const [ledger, setLedger] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [department, setDepartment] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [{ data: ledgerData }, { data: reqData }] = await Promise.all([
      supabase.from('petty_cash_ledger').select('*'),
      supabase.from('petty_cash_requests').select('*').eq('employee_id', profile.id).eq('hidden_by_employee', false).order('created_at', { ascending: false })
    ]);
    if (ledgerData) setLedger(ledgerData);
    if (reqData) setMyRequests(reqData);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const cashAtHand = computeCashAtHand(ledger);

  async function handleSubmit(e) {
    e.preventDefault();
    setToast('');
    if (!department.trim() || !purpose.trim() || !amount || Number(amount) <= 0) {
      setToast('Fill in department, purpose, and a valid amount.');
      return;
    }
    setBusy(true);

    let receiptPath = null;
    if (file) {
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('petty-cash-receipts')
        .upload(path, file);
      if (uploadError) {
        setToast('File upload failed: ' + uploadError.message);
        setBusy(false);
        return;
      }
      receiptPath = path;
    }

    const { error } = await supabase.from('petty_cash_requests').insert({
      employee_id: profile.id,
      employee_name: profile.full_name,
      department: department.trim(),
      purpose: purpose.trim(),
      estimated_amount: Number(amount),
      receipt_path: receiptPath
    });
    setBusy(false);
    if (error) {
      setToast(error.message);
    } else {
      setToast('Request submitted. Speak with finance to collect the cash.');
      setDepartment(''); setPurpose(''); setAmount(''); setFile(null);
      load();
    }
  }

  async function clearHistory() {
    const resolvedCount = myRequests.filter((r) => r.status !== 'pending').length;
    if (resolvedCount === 0) {
      setToast('No resolved requests to clear — pending ones stay visible.');
      return;
    }
    const confirmed = window.confirm(
      `This will clear ${resolvedCount} resolved request${resolvedCount === 1 ? '' : 's'} from your view. Pending requests stay visible. This only affects what you see — records are kept for company audit purposes.`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('petty_cash_requests')
      .update({ hidden_by_employee: true })
      .eq('employee_id', profile.id)
      .neq('status', 'pending');

    if (error) {
      setToast('Could not clear history: ' + error.message);
    } else {
      load();
    }
  }

  return (
    <div className="app">
      <Sidebar
        links={[
          { href: '#new-request', label: 'New request' },
          { href: '#my-requests', label: 'My requests' }
        ]}
      />
      <div className="app-right">
        <Topbar title="Petty Cash Ledger" />
        <main className="main">
          <section className="stat-grid">
          <StatCard label="Cash at hand" value={`GHS ${cashAtHand.toFixed(2)}`} />
          <StatCard label="Your pending requests" value={myRequests.filter(r => r.status === 'pending').length} />
          <StatCard label="Your fulfilled requests" value={myRequests.filter(r => r.status === 'fulfilled').length} />
        </section>

        <section className="dashboard-grid">
          <form className="card" id="new-request" onSubmit={handleSubmit}>
            <div className="card-header">
              <h2>New request</h2>
              <p>Attach an invoice or receipt if you have one — helps speed up approval.</p>
            </div>
            <div className="field">
              <label htmlFor="department">Department</label>
              <input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales, Marketing" />
            </div>
            <div className="field">
              <label htmlFor="purpose">Purpose</label>
              <input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Delivery refund, lunch for developer" />
            </div>
            <div className="field">
              <label htmlFor="amount">Estimated amount (GHS)</label>
              <input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="receipt">Supporting document (optional)</label>
              <input id="receipt" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
              <span className="field-hint">Photo or PDF of the invoice/receipt.</span>
            </div>
            {toast && <div className="alert alert-info">{toast}</div>}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
          </form>

          <div className="card" id="my-requests">
            <div className="card-header card-header-row">
              <h2>Your requests</h2>
              {myRequests.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear history</button>
              )}
            </div>
            {myRequests.length === 0 ? (
              <div className="empty-state">No requests yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Department</th><th>Purpose</th><th className="num">Amount</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {myRequests.map((r) => (
                      <tr key={r.id}>
                        <td className="cell-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>{r.department}</td>
                        <td>{r.purpose}</td>
                        <td className="num">GHS {Number(r.estimated_amount).toFixed(2)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>{r.receipt_path ? '📎' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}