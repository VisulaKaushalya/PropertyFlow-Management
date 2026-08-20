type PaymentLike = { month?: string; status?: string };

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(year, monthNumber, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns the first rent month that has not been logged after the latest
 * payment. A tenant with no history starts at the current month, unless the
 * lease starts later.
 */
export function nextRentMonth(leaseStart: string | null | undefined, payments: PaymentLike[] = []) {
  const loggedMonths = payments
    .map((payment) => payment.month)
    .filter((month): month is string => Boolean(month))
    .sort();

  if (loggedMonths.length > 0) {
    return addMonth(loggedMonths[loggedMonths.length - 1]);
  }

  const nowMonth = currentMonth();
  const leaseMonth = leaseStart?.slice(0, 7);
  return leaseMonth && leaseMonth > nowMonth ? leaseMonth : nowMonth;
}

/**
 * Uses the tenant's lease day as the suggested due/payment date for the
 * selected rent month. The user can still edit it before saving.
 */
export function suggestedRentDate(month: string, leaseStart?: string | null) {
  const day = Math.min(Math.max(Number(leaseStart?.slice(8, 10)) || new Date().getDate(), 1), 28);
  return `${month}-${String(day).padStart(2, '0')}`;
}