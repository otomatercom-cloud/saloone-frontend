# Saloone - Next.js frontend for `salon_management` (Odoo 19)

A friendly web app over the Odoo 19 module `salon_management`: **booking -> confirm -> check-in -> service -> complete -> invoice -> (split) payment -> paid -> closed**, plus customers, services, staff, commission rules, expenses, staff payouts and reports.
Colours: dark orange `#C2410C` + beige `#F5EBDD` (change the variables at the top of `app/globals.css`).

Nothing is duplicated: every button, role check and prerequisite runs **inside Odoo**. The app calls the module's own methods through a small server-side proxy, so groups, discount limits and record rules stay exactly as in Odoo.

## Run
```bash
cp .env.local.example .env.local      # set ODOO_URL (+ ODOO_DB if several databases)
npm install
npm run dev                            # http://localhost:3000   (production: npm run build && npm start)
```
Log in with any Odoo user that has a *Salon* group. Each person only sees what Odoo lets them.

## Screens
| Area | Pages |
|---|---|
| Dashboard | needs-attention tiles, 15 KPIs, 6 charts, filters (dates / staff / service) |
| Front desk | Bookings (status chips, services table, action buttons, payment modal, notes), New booking (multi-service, per-line staff + discount), Check-in board, Staff calendar, Customers (history + bookings) |
| Salon | Services, Staff (pay + commission), Commission rules |
| Finance | Expenses (approve / cancel), Staff payouts (calculate -> approve -> pay -> close / reverse) |
| Reports | Staff daily report, Profit report (CSV export on every list) |

Every record page: valid status buttons only, editable form, change history + notes (chatter), print, Ctrl-K search, dark mode, installable on phones (PWA), to-do bell from Odoo activities.

## How it stays in sync
* `lib/schema.ts` = the module's state machines (which button from which state).
* `lib/config.ts` = columns / form fields / tabs per object. Labels, types, selections come live from Odoo (`fields_get`). Add one entry -> list, form, tabs, nav appear.
* Cancel / no-show use the module's reason wizard; payments use `salon.booking.register_payment` (call again for split payments).

## Security
* Odoo session id lives in an httpOnly cookie; the browser never talks to Odoo directly.
* 5 wrong passwords per login+IP in 10 min -> locked. Auto sign-out after 30 min idle (`NEXT_PUBLIC_IDLE_MINUTES`).
* Use HTTPS in production (see `deploy/DEPLOYMENT.md`).
