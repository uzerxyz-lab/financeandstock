# Cash Book Corrections and Workflow Upgrade

## Confirmed decisions
- Fixed account types: **Buyer, Supplier, Worker**; users may also create custom account types.
- First setup: **username + numeric PIN**, with email or phone for local recovery.
- Personal Loans: full loan/repayment tracking, kept separate from business cashbook totals.
- Sales, Purchases, Expenses, Workers, Loans and Ledgers open as dedicated pages.

## 1. Dashboard and header
- Remove the Reports/Admin pills above the cards and remove the All Entries/Admin cards.
- Keep Reports, All Entries and Admin available from the hamburger menu.
- Center the full Mussa Enterprises logo in the top header; place the global account search in a clean row below it.
- Keep the hamburger on the left with Back and Logout. Replace the bordered lock control with direct Lock and adaptive Day/Night icons on the right.
- Remove the small “Mussa Enterprises” line above Dashboard, reorder instructions, reset control and arrow controls.
- Keep drag-and-drop tile rearranging and persist the order.
- Add a privacy eye on Cash in Hand that masks/unmasks its amount and related summary amounts.
- Use thicker outlines, larger icons and subtle tactile lift while preserving the distinct adaptive card colours.
- Rename “Received today” to **Receive Payment** and “Paid today” to **Issue Payment**.

## 2. Dedicated business sections
- Sales card opens a Sales page containing only sales records, filters, totals and new-sale action.
- Purchases card opens a Purchases page containing only purchase records, filters, totals and new-purchase action.
- Expenses card opens an Expenses page with categories and expense records. Salary and Advance live only here.
- Add a Workers card/page listing worker accounts, salaries and advances.
- Ledgers & Accounts opens a category-wise account directory: Buyer, Supplier, Worker and user-created types, each leading to its ledger.
- Restrict contextual account search by workflow: Sale → Buyers, Purchase → Suppliers, Salary/Advance → Workers. Global header and Ledgers search remain universal.

## 3. Accounts and balances
- Put Account Type first in New Account.
- Buyer/Supplier form: name required; title, contact, address optional; opening balance uses an explicit **Receivable / Payable** selector plus positive amount.
- Worker form: name required; fixed wages, contact, ID card number and address optional.
- Custom account types can be added and selected; their form uses the general buyer/supplier-style optional fields.
- Account-name suggestions search only within the selected account type.
- Migrate existing Customer accounts to Buyer, preserve Supplier/Worker/Other records, IDs, entries and balances.
- Store opening balances with the correct sign so receivable/payable calculations remain consistent everywhere.

## 4. Expenses and entry forms
- Replace default categories with only **LESCO Bill, Fuel, Grocery, Salary, Advance**; preserve any categories the user already created.
- Category control supports typing/search, dropdown selection and the existing New Category action.
- Selecting Salary or Advance opens the worker-specific form and limits suggestions to Worker accounts.
- Remove Tag/Location from every form, filter and settings view; safely ignore legacy tag data without losing entries.
- Sale form exposes only a Purchase switch; Purchase exposes only Sale. Receive Payment and Issue Payment similarly switch only to each other.
- Change each open form’s accent/border treatment to the active workflow colour so the selected transaction type is unmistakable.

## 5. Personal Loans
- Add a separate Personal Loans card and dedicated page.
- Record **Loan Given** and **Loan Taken** with person, date, amount, particulars and optional contact.
- Record repayments/installments against each loan, show paid and remaining amounts, status and history.
- Show total personal receivable and payable.
- Loan records and repayments do not alter Cash in Hand, business entries, party balances, sales/purchase totals or expense calculations.

## 6. Login, recovery and theme
- First setup collects business name, username, numeric PIN, plus at least one recovery method: email or phone.
- Sign-in accepts username + PIN.
- Forgot PIN locally verifies the registered email or phone, then allows a new PIN without a server.
- Existing password-based installs receive a one-time upgrade screen to set a PIN and recovery detail rather than losing access/data.
- Persist the selected theme independently so logout, lock and refresh never reset it.
- Keep the M-mark on login and existing favicon/PWA icons; use the full logo in the app header and print layouts.

## 7. Admin and audit trail
- Retain Admin in the hamburger menu with password/PIN re-check.
- Keep multi-select soft delete, delete log and one-click restore.
- Show compact Edited and Restored timestamp badges on relevant entries/accounts and in the audit log.
- Extend restore/delete handling to personal loans and repayments without hard deletion.

## 8. Printing and PDF naming
- Print the company logo first, then **Account Statement**, account title and smaller Short ID, followed by a divider and statement.
- Tighten A4 margins, table sizing and print-only widths so left/right content is not clipped.
- Set a contextual document title before printing so PDF defaults follow patterns such as `Ali Traders Statement 03-10-2026`; use equivalent names for general reports, vouchers and section prints.
- Preserve professional totals, signatures and date-period details.

## 9. Interaction rules
- Entry/account/loan dialogs do not close from an outside click or tap; only Save/Complete, Cancel or Close can dismiss them.
- Hamburger panel still closes when clicking/tapping outside it.
- Keep keyboard shortcuts, drafts, undo/redo, local snapshots and backup import/export working with the expanded data.

## Technical details
- Extend the local-first data schema with account-type definitions, worker fields, signed opening-balance direction, recovery metadata, loans/repayments and audit timestamps.
- Add a versioned in-browser migration so current accounts, entries, categories, credentials, short IDs and tile order survive the upgrade.
- Create dedicated TanStack routes for Sales, Purchases, Workers and Personal Loans, each with unique page metadata.
- Update reusable searches to accept account-type filters; update dialogs globally while leaving the hamburger sheet’s outside-click behavior unchanged.
- Keep all data offline in the browser; no cloud service is introduced.

## Verification
- Test first setup, legacy-login upgrade, lock/logout/theme persistence and email/phone PIN recovery.
- Test Buyer/Supplier/Worker/custom account forms and opening receivable/payable calculations.
- Test contextual searches and Sale↔Purchase / Receive↔Issue switching.
- Test expenses, worker salary/advance, loans with partial/full repayments, and confirm loans never change business totals.
- Test drag-only dashboard ordering, privacy masking, dialogs and hamburger behavior on desktop and mobile.
- Test edit/delete/restore timestamps and backup import/export migration.
- Print-preview account statements and section reports at A4; verify no clipping and contextual PDF filenames.
