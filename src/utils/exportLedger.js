import * as XLSX from 'xlsx';


function balanceBefore(ledger, monthStart) {
  return ledger
    .filter((row) => row.status !== 'voided' && new Date(row.entry_date) < monthStart)
    .reduce((total, row) => {
      if (row.entry_type === 'disbursement') return total - Number(row.amount);
      return total + Number(row.amount);
    }, 0);
}

export function exportMonthEnd(ledger, year, month) {
  // month is 1-12
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // first day of next month (exclusive)

  // rows active within the requested month (exclude voided rows)
  const inMonth = ledger.filter((row) => {
    const d = new Date(row.entry_date);
    return row.status !== 'voided' && d >= monthStart && d < monthEnd;
  });

  const openingBal = balanceBefore(ledger, monthStart);
  const imprestTotal = inMonth
    .filter((r) => r.entry_type === 'imprest')
    .reduce((s, r) => s + Number(r.amount), 0);
  const disbursements = inMonth
    .filter((r) => r.entry_type === 'disbursement')
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
  const outflowTotal = disbursements.reduce((s, r) => s + Number(r.amount), 0);
  const cashAtHand = openingBal + imprestTotal - outflowTotal;

  const rows = [
    ['', '', 'OPENING BAL', openingBal],
    ['', '', 'ACCOUNTABLE IMPREST', imprestTotal],
    ['', '', '', -outflowTotal],
    ['', '', 'TOTAL OUTFLOW', -outflowTotal],
    ['', '', 'CASH @ HAND', cashAtHand],
    [],
    ['NO.', 'DATE', 'BENEFICIARY', 'PURPOSE', 'AMOUNT', 'CODE']
  ];

  disbursements.forEach((r, i) => {
    rows.push([
      i + 1,
      r.entry_date,
      r.beneficiary || '',
      r.purpose || '',
      Number(r.amount),
      r.ledger_code || ''
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 20 }];

  const workbook = XLSX.utils.book_new();
  const monthName = monthStart.toLocaleString('default', { month: 'long' });
  XLSX.utils.book_append_sheet(workbook, sheet, `${monthName} ${year}`.slice(0, 31));

  XLSX.writeFile(workbook, `petty-cash-${year}-${String(month).padStart(2, '0')}.xlsx`);
} 
