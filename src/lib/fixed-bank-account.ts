// ============================================================================
// FIXED BANK ACCOUNT — the single, hardcoded, immutable bank account that
// ALL payments must use. No admin (not even super-admin) can change this.
// ============================================================================
//
// This is enforced server-side:
//   - POST /api/admin/settings rejects any request that touches the
//     `payment_bank_accounts` key (returns 403 BANK_ACCOUNT_LOCKED).
//   - POST /api/orders always snapshots this account into the PaymentSession,
//     so even if the Setting row is tampered with at the DB level, new orders
//     still use THIS account.
//   - /api/payments/sepay/webhook verifies `body.account_number` matches
//     this account; mismatches are rejected with 409 BANK_ACCOUNT_MISMATCH.
//
// Why a constant (not a Setting): the merchant specifically requested a
// single fixed account. Treating it as code (not data) means it cannot be
// changed from the admin panel — to change it, you'd have to deploy a new
// version of the code, which is an auditable, reviewable action.
//
// CURRENT CONFIG — PRODUCTION account (chủ shop cung cấp 2026-08):
//   - accountNumber: 08660628189
//   - holder:        PHAM THI HAI YEN
//   - bank:          MB Bank (Military Bank — VietQR code "mb", bin 970422)
//   - branch:        (không bắt buộc với tài khoản cá nhân)
//
// Khi SePay gửi webhook cho một giao dịch thật vào tài khoản này, payload
// sẽ có `accountNumber: "08660628189"` + `gateway: "MB Bank"` (hoặc biến
// thể hiển thị). `isFixedBankAccount()` chỉ so khớp accountNumber nên
// chấp nhận đúng giao dịch vào tài khoản này, mọi tài khoản khác đều bị
// từ chối với BANK_ACCOUNT_MISMATCH (đơn giữ PENDING, ghi log để soát).

export interface FixedBankAccount {
  /** Display name, e.g. "MB Bank" */
  bank: string
  /** VietQR short code, e.g. "mb" (lowercase, matches img.vietqr.io URL) */
  bankCode: string
  /** Account number, digits only */
  accountNumber: string
  /** Account holder, UPPERCASE per Vietnamese banking convention */
  holder: string
  /** Branch (optional, usually empty for personal accounts) */
  branch: string
}

export const FIXED_BANK_ACCOUNT: FixedBankAccount = {
  bank: 'MB Bank',
  bankCode: 'mb', // VietQR short code for MB Bank (bin 970422) — dùng sinh QR qua img.vietqr.io
  accountNumber: '08660628189', // Tài khoản nhận tiền DUY NHẤT của cửa hàng
  holder: 'PHAM THI HAI YEN',
  branch: '',
}

/**
 * Check whether a given account matches the fixed account.
 *
 * We ONLY compare accountNumber (digits-only, whitespace stripped) — the
 * bank code / gateway name in Sepay's payload can come in many forms
 * ("mb", "MB", "MB Bank", "MBBANK", "VPBank gateway", etc.) depending on
 * how Sepay labels the bank, so we can't reliably match on it. The account
 * number is the unique identifier for a bank account and is always sent as a
 * plain digits string by Sepay.
 */
export function isFixedBankAccount(account: {
  bankCode?: string
  accountNumber?: string
  gateway?: string
}): boolean {
  const received = (account.accountNumber || '').replace(/\s/g, '')
  return received !== '' && received === FIXED_BANK_ACCOUNT.accountNumber
}

/**
 * Human-readable summary for the admin panel. E.g.
 * "MB Bank · 08660628189 · PHAM THI HAI YEN"
 */
export const FIXED_BANK_ACCOUNT_DISPLAY = `${FIXED_BANK_ACCOUNT.bank} · ${FIXED_BANK_ACCOUNT.accountNumber} · ${FIXED_BANK_ACCOUNT.holder}`
