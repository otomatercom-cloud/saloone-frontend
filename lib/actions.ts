import { SCHEMA } from './schema';
import { BY_MODEL, Extra } from './config';

export type Act = { method: string; label: string; reason: boolean; payment?: boolean; tone: 'primary' | 'danger' | 'ghost' };

const LABELS: Record<string, string> = {
  action_confirm: 'Confirm', action_check_in: 'Check-in', action_start_service: 'Start service', action_complete: 'Complete service',
  action_create_invoice: 'Create invoice', action_mark_paid: 'Mark paid', action_close: 'Close',
  action_cancel_wizard: 'Cancel booking', action_no_show_wizard: 'No-show', action_cancel: 'Cancel',
  action_calculate: 'Calculate', action_approve: 'Approve', action_pay: 'Pay out', action_reset_draft: 'Back to draft', action_reverse: 'Reverse payment',
  register_payment: 'Register payment',
};
const DANGER = new Set(['action_cancel', 'action_cancel_wizard', 'action_no_show_wizard', 'action_reverse']);
const GHOST = new Set(['action_reset_draft']);

export function labelOf(method: string) {
  return LABELS[method] || method.replace(/^action_/, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** Buttons the current record state allows. The server still enforces roles + prerequisites. */
export function actionsFor(model: string, rec: any): Act[] {
  const s = SCHEMA[model];
  const out: Act[] = [];
  if (s) {
    for (const [method, spec] of Object.entries(s.actions)) {
      if (!spec.from.includes(rec[s.stateField])) continue;
      out.push({ method, label: labelOf(method), reason: s.reason.includes(method), tone: DANGER.has(method) ? 'danger' : GHOST.has(method) ? 'ghost' : 'primary' });
    }
  }
  const extras: Extra[] = BY_MODEL[model]?.extra || [];
  for (const e of extras) {
    if (e.when(rec)) out.push({ method: e.method, label: e.label, reason: !!e.reason, payment: e.payment, tone: e.tone || 'primary' });
  }
  return out;
}

/** fields the action buttons depend on, so lists/tabs read enough to decide */
export function stateFieldsFor(model: string): string[] {
  const f = new Set<string>();
  if (SCHEMA[model]) f.add(SCHEMA[model].stateField);
  if (model === 'salon.booking') { f.add('invoice_id'); f.add('payment_status'); f.add('amount_due'); f.add('partner_id'); }
  const cfg = BY_MODEL[model];
  if (cfg?.stateField) f.add(cfg.stateField);
  return [...f];
}
export const stateFieldOf = (model: string) => BY_MODEL[model]?.stateField || SCHEMA[model]?.stateField || 'state';
