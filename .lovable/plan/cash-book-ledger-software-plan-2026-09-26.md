# Cash Book / Ledger Software — Plan

## Pehle aik zaroori baat
Main jo software banata hoon woh web app hota hai. Mac aur Windows dono par chalane ka tareeqa:
isay **installable offline app (PWA)** banaunga — Chrome/Edge/Safari mein aik dafa khol kar "Install" karne se yeh desktop par apne icon ke saath, apni window mein khulega, bilkul normal software ki tarah, aur **internet ke baghair** chalega.

**Data (final decision): Local-first + optional Cloud backup**
- Sara data machine par save hoga — software hamesha offline chalega.
- Cloud sirf backup/sync ke liye. Agar kabhi free limit khatam ho aur pay na karein, to sirf cloud backup rukega; software waise hi chalta rahega.
- Manual backup file (export/import) bhi hamesha available.

## 1. Login
- Sirf **aik user** (aap). Main screen par username + password.
- Main screen ke andar hi **Admin Panel** (edit/delete/restore) — kholne par password dobara confirm hoga.
- Currency sirf **PKR (Rs)**, koi aur currency nahi.

## 2. Accounts (Parties / Dealers / Workers)
- Naya account: naam, type (Customer / Supplier / Worker / Expense head), phone, address, opening balance.
- **Auto short ID**: naam ke initials + `01` + sequential number.
  - Ali Trader → `AT011`
  - Ali Enterprises → `AE012`
  - Ali Trading Company → `ATC013`
- ID hamesha unique rahegi.

## 3. Entries (main screen se)
Har entry mein: date, account, amount, payment method, reference, remarks.
- **Cash Inward** (receipt) — maslan Ali Enterprises se 10,00,000 aaye.
- **Cash Outward** (payment) — maslan Musa Enterprises ko 5,00,000 diye.
- **Sale** aur **Purchase** entries — qty/rate nahi, sirf aik **Particulars** field (maslan "Iron Billet 25 Ton") aur total amount.
- **Worker**: Salary, Advance.
- **Miscellaneous expenses** — categories aap khud add/edit kar sakenge (Bijli Bill, Gas Bill, Transport, Rent...), aur har category ke saath **location/tag** (Factory, Ghar, ya jo aap add karein).
- **Payment method**: Cash / Cheque / Online transfer — cheque par cheque no. aur bank, online par bank/reference.
- **Auto capital**: har naam, remarks aur text field mein har word ka pehla letter khud capital ho jayega (ali trader → Ali Trader).
- **Date format**: DD-MM-YYYY. **Time format**: 12-hour AM/PM (maslan 03:45 PM).

## 4. Search (har jagah)
- Typing ke saath saath suggestions.
- Capital/small, dash, space, dot sab ignore — `ali-trader`, `ALI TRADER`, `alitrader` sab same result.
- Short ID se bhi search (`AT011`).
- **Filters**: category (sirf "Bill"), tag (sirf "Factory"), dono mila kar (sirf Factory ka Bill), entry type, payment method, date range.

## 5. Ledgers aur Reports
- **Dealer-wise ledger**: date-wise entries, running balance, closing balance.
- **Cash book / Day book**: kisi bhi din ka total inward, outward, closing cash.
- **Worker ledger**: salary, advance, baqaya.
- **Expense report**: head-wise total.
- Date range filter, print aur Excel/PDF export.

## 6. Admin Panel
- Accounts aur entries ki list, **checkbox se multiple selection**.
- Edit aur Delete (soft delete — data khatam nahi hoga).
- **Delete Log**: kya delete hua, kisne, kab, poori details — wahin se **Restore** button.
- Edit karne par purani value bhi log mein rahegi (audit trail).

## 7. Keyboard Shortcuts
- Ctrl+S = Save, Ctrl+C / Ctrl+V / Ctrl+X = Copy / Paste / Cut, Ctrl+A = Select all
- Ctrl+Z = Undo (aakhri entry/tabdeeli wapas), Ctrl+Y = Redo
- Ctrl+F = Search, Ctrl+N = Nayi entry, Ctrl+P = Print, Esc = Cancel, Enter/Tab = agla field
- Mac par Cmd bhi kaam karega.

## 8. Mazeed professional features (meri tajweez)
- **Dashboard**: aaj ka cash in/out, total receivable, total payable, pending parties.
- **Backup / Restore**: aik click mein poori file export, doosri machine par import.
- **Financial year closing** aur opening balance carry forward.
- **Receipt / Voucher print** har entry ki.
- **Cheque tracking**: pending / cleared / bounced.
- **Duplicate entry warning** (same party, same amount, same din).
- Urdu/English UI (agar chahiye).

## 9. Banane ki tarteeb
1. Design + login + dashboard
2. Accounts + auto short ID + search
3. Entries + payment methods + auto capital
4. Ledgers aur reports + print/export
5. Admin panel + delete log + restore
6. Shortcuts, offline install, backup/restore

## 10. Printing (professional formats)
- A4 aur A5 size, company naam/logo header, print date-time, page numbers, footer mein signature line.
- **Voucher / Receipt**: voucher no., date, party naam + short ID, particulars, amount (figures + words mein), payment method, cheque/bank details.
- **Party Ledger**: date, voucher no., particulars, debit, credit, running balance, opening/closing balance.
- **Cash Book / Day Book**, **Worker Ledger**, **Expense Report** (category/tag filter ke saath).
- Print se pehle columns choose karne ka option; PDF aur Excel export.

## 11. Design
- Clean, modern accounting-software look: calm neutral background, aik strong primary color, inward ke liye green aur outward ke liye red accents.
- Saaf fonts, aligned tables, amounts right-aligned, consistent buttons aur forms.
- Left sidebar navigation, upar search bar, aur dashboard cards.
- Start se pehle aap ko 3 design options dikhaunga, un mein se aap aik choose karenge.
