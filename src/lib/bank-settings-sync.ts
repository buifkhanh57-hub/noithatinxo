// ============================================================================
// BANK SETTINGS SYNC — keeps the `payment_bank_accounts` Setting row in the
// DB perfectly in sync with the hardcoded FIXED_BANK_ACCOUNT constant.
// ============================================================================
//
// WHY THIS EXISTS
// The checkout UI (BankTransferInfo) and the "vui lòng liên kết tài khoản"
// guard read the Setting `payment_bank_accounts` (JSON array), while orders +
// the SePay webhook use the FIXED_BANK_ACCOUNT constant. If those two ever
// diverge, customers see an account that the webhook will NOT credit →
// money sent to the wrong place and the order stays unpaid.
//
// The Setting row is admin-write-LOCKED (POST /api/admin/settings → 403
// BANK_ACCOUNT_LOCKED), so the only ways it can drift are (a) legacy seed
// data (the old dummy Vietcombank 0123456789 / old SePay test account
// 0000000002 · BUI THI BAO LOAN) or (b) direct DB edits. This sync repairs
// any such drift automatically on every storefront load (called from
// /api/seed), so display == order snapshot == webhook target ALWAYS.
//
// INVARIANT: there is exactly ONE valid receiving account in the whole
// system — FIXED_BANK_ACCOUNT. This helper mirrors it into the Setting.

import { db } from '@/lib/db'
import { FIXED_BANK_ACCOUNT } from '@/lib/fixed-bank-account'

export type BankSyncResult = 'in-sync' | 'repaired' | 'created' | 'error'

export async function ensureFixedBankAccountSetting(): Promise<BankSyncResult> {
  try {
    const fixedValue = JSON.stringify([
      {
        bank: FIXED_BANK_ACCOUNT.bank,
        bankCode: FIXED_BANK_ACCOUNT.bankCode,
        accountNumber: FIXED_BANK_ACCOUNT.accountNumber,
        holder: FIXED_BANK_ACCOUNT.holder,
        ...(FIXED_BANK_ACCOUNT.branch ? { branch: FIXED_BANK_ACCOUNT.branch } : {}),
      },
    ])

    const existing = await db.setting.findUnique({ where: { key: 'payment_bank_accounts' } })

    // Already exactly the fixed account (and non-empty)? → no write needed.
    if (existing && existing.value === fixedValue) return 'in-sync'

    if (existing) {
      // Log what we replaced so the admin can audit the change.
      try {
        const { logInfo } = await import('@/lib/system-log')
        await logInfo(
          'payment',
          'Đồng bộ tài khoản ngân hàng hiển thị về tài khoản cố định của cửa hàng',
          JSON.stringify({ before: existing.value.slice(0, 300), after: fixedValue.slice(0, 300) })
        )
      } catch { /* logging must never block the sync */ }

      await db.setting.update({ where: { key: 'payment_bank_accounts' }, data: { value: fixedValue } })
      return 'repaired'
    }

    await db.setting.create({
      data: {
        key: 'payment_bank_accounts',
        value: fixedValue,
        label: 'Tài khoản ngân hàng',
        group: 'payment',
      },
    })
    return 'created'
  } catch {
    // Never let a DB hiccup break the storefront seed call.
    return 'error'
  }
}
