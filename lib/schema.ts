// State machines of the salon_management module (salon.booking TRANSITIONS, payout, expense).
// Buttons shown = actions valid from the record's current state. Odoo still enforces roles + prerequisites.
export type Schema = Record<string, { stateField: string; states: Record<string, string>; reason: string[]; actions: Record<string, { from: string[] }> }>;

export const SCHEMA: Schema = {
  'salon.booking': {
    stateField: 'state',
    states: { draft: 'Draft', confirmed: 'Confirmed', checked_in: 'Checked-In', in_service: 'In Service', completed: 'Completed', paid: 'Paid', closed: 'Closed', cancelled: 'Cancelled', no_show: 'No Show' },
    reason: ['action_cancel_wizard', 'action_no_show_wizard'],
    actions: {
      action_confirm: { from: ['draft'] },
      action_check_in: { from: ['confirmed'] },
      action_start_service: { from: ['checked_in'] },
      action_complete: { from: ['in_service'] },
      action_close: { from: ['paid'] },
      action_cancel_wizard: { from: ['draft', 'confirmed'] },
      action_no_show_wizard: { from: ['confirmed'] },
    },
  },
  'salon.staff.payout': {
    stateField: 'state',
    states: { draft: 'Draft', calculated: 'Calculated', approved: 'Approved', paid: 'Paid', closed: 'Closed' },
    reason: [],
    actions: {
      action_calculate: { from: ['draft'] },
      action_approve: { from: ['calculated'] },
      action_pay: { from: ['approved'] },
      action_close: { from: ['paid'] },
      action_reset_draft: { from: ['calculated', 'approved'] },
      action_reverse: { from: ['paid'] },
    },
  },
  'salon.expense': {
    stateField: 'state',
    states: { draft: 'Draft', approved: 'Approved', cancelled: 'Cancelled' },
    reason: [],
    actions: { action_approve: { from: ['draft'] }, action_cancel: { from: ['draft', 'approved'] } },
  },
};
