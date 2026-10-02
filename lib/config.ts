// One entry per business object. Labels / types / selections are read live from Odoo (fields_get);
// state buttons come from lib/schema.ts. Add an entry here and list, form, tabs and navigation appear.
export type Tab = {
  title: string; model: string; field: string; columns: string[]; create?: string[]; edit?: string[]; deletable?: boolean;
  rowActions?: boolean; noAdd?: boolean; top?: boolean; link?: string; parentField?: string; order?: string;
};
export type Extra = { method: string; label: string; when: (r: any) => boolean; tone?: 'primary' | 'danger' | 'ghost'; reason?: boolean; payment?: boolean };
export type Cfg = {
  slug: string; model: string; title: string; singular: string; group: 'Front desk' | 'Salon' | 'Finance' | 'Reports';
  columns: string[]; search: string[]; sections: { title: string; fields: string[] }[];
  create?: string[]; createDefaults?: Record<string, any>; tabs?: Tab[]; extra?: Extra[]; order?: string; stateField?: string;
  prefillToday?: string[]; domain?: any[]; readonly?: boolean; noQuick?: boolean; newHref?: string;
};

export const CONFIG: Cfg[] = [
  {
    slug: 'bookings', model: 'salon.booking', title: 'Bookings', singular: 'Booking', group: 'Front desk', newHref: '/bookings/new',
    columns: ['name', 'partner_id', 'start_datetime', 'duration', 'amount_untaxed', 'payment_status', 'state'],
    search: ['name', 'partner_id'], order: 'start_datetime desc', create: ['partner_id'],
    sections: [
      { title: 'Booking', fields: ['partner_id', 'start_datetime', 'end_datetime', 'duration', 'source', 'employee_ids'] },
      { title: 'Amounts & payment', fields: ['amount_gross', 'amount_discount', 'amount_untaxed', 'invoice_id', 'amount_due', 'payment_status'] },
      { title: 'Progress', fields: ['checkin_datetime', 'completed_datetime', 'completed_user_id', 'paid_datetime', 'paid_user_id', 'cancel_date', 'cancel_user_id', 'cancel_reason'] },
      { title: 'Notes', fields: ['note'] },
    ],
    tabs: [
      {
        title: 'Services', top: true, model: 'salon.booking.line', field: 'booking_id', order: 'sequence, id', deletable: true,
        columns: ['product_id', 'employee_id', 'quantity', 'price_unit', 'discount_type', 'discount_value', 'price_subtotal', 'line_start', 'line_end', 'commission_amount', 'state'],
        create: ['product_id', 'employee_id', 'quantity', 'price_unit', 'discount_type', 'discount_value'],
        edit: ['product_id', 'employee_id', 'quantity', 'price_unit', 'discount_type', 'discount_value'],
      },
    ],
    extra: [
      { method: 'action_create_invoice', label: 'Create invoice', when: (r) => r.state === 'completed' && !r.invoice_id },
      { method: 'register_payment', label: 'Register payment', when: (r) => r.state === 'completed' && !!r.invoice_id && r.payment_status !== 'paid', payment: true },
      { method: 'action_mark_paid', label: 'Mark paid', when: (r) => r.state === 'completed' && r.payment_status === 'paid' },
    ],
  },
  {
    slug: 'customers', model: 'res.partner', title: 'Customers', singular: 'Customer', group: 'Front desk', noQuick: true,
    domain: [['is_company', '=', false], ['user_ids', '=', false]],
    columns: ['name', 'phone', 'email', 'salon_visit_count', 'salon_last_visit', 'salon_customer_status'],
    search: ['name', 'phone', 'email'], order: 'id desc',
    create: ['name', 'phone', 'email', 'salon_gender', 'salon_birthdate', 'salon_preferred_employee_id', 'salon_notes'],
    sections: [
      { title: 'Customer', fields: ['name', 'phone', 'email', 'salon_gender', 'salon_birthdate', 'salon_customer_status'] },
      { title: 'Preferences', fields: ['salon_preferred_employee_id', 'salon_preferred_service_ids', 'salon_notes'] },
      { title: 'History', fields: ['salon_visit_count', 'salon_last_visit', 'salon_total_spent', 'salon_cancel_count', 'salon_noshow_count'] },
    ],
    tabs: [{
      title: 'Bookings', top: true, model: 'salon.booking', field: 'partner_id', order: 'start_datetime desc', link: 'bookings',
      columns: ['name', 'start_datetime', 'amount_untaxed', 'payment_status', 'state'],
    }],
  },
  {
    slug: 'services', model: 'product.template', title: 'Services', singular: 'Service', group: 'Salon',
    domain: [['is_salon_service', '=', true]],
    columns: ['name', 'list_price', 'salon_duration', 'active'], search: ['name'], order: 'name',
    create: ['name', 'list_price', 'salon_duration'], createDefaults: { is_salon_service: true, type: 'service', sale_ok: true },
    sections: [{ title: 'Service', fields: ['name', 'list_price', 'salon_duration', 'active'] }],
    tabs: [{
      title: 'Commission rules', model: 'salon.commission.rule', field: 'product_tmpl_id', deletable: true,
      columns: ['name', 'employee_id', 'method', 'value', 'sequence'], create: ['name', 'employee_id', 'method', 'value', 'sequence'],
      edit: ['name', 'employee_id', 'method', 'value', 'sequence'],
    }],
  },
  {
    slug: 'staff', model: 'hr.employee', title: 'Staff', singular: 'Staff member', group: 'Salon',
    domain: [['salon_is_staff', '=', true]],
    columns: ['name', 'salon_salary_type', 'salon_commission_type', 'salon_commission_value'], search: ['name'], order: 'name',
    create: ['name', 'salon_salary_type', 'salon_fixed_salary', 'salon_daily_rate', 'salon_commission_type', 'salon_commission_value', 'salon_service_ids'],
    createDefaults: { salon_is_staff: true },
    sections: [
      { title: 'Staff', fields: ['name', 'salon_service_ids'] },
      { title: 'Pay & commission', fields: ['salon_salary_type', 'salon_fixed_salary', 'salon_daily_rate', 'salon_commission_type', 'salon_commission_value'] },
    ],
    tabs: [{
      title: 'Commission rules', model: 'salon.commission.rule', field: 'employee_id', deletable: true,
      columns: ['name', 'product_tmpl_id', 'method', 'value', 'sequence'], create: ['name', 'product_tmpl_id', 'method', 'value', 'sequence'],
      edit: ['name', 'product_tmpl_id', 'method', 'value', 'sequence'],
    }],
  },
  {
    slug: 'rules', model: 'salon.commission.rule', title: 'Commission rules', singular: 'Commission rule', group: 'Salon',
    columns: ['name', 'employee_id', 'product_tmpl_id', 'method', 'value', 'sequence', 'active'], search: ['name'], order: 'sequence, id',
    create: ['name', 'employee_id', 'product_tmpl_id', 'method', 'value', 'sequence'],
    sections: [{ title: 'Rule', fields: ['name', 'employee_id', 'product_tmpl_id', 'method', 'value', 'sequence', 'active'] }],
  },
  {
    slug: 'expenses', model: 'salon.expense', title: 'Expenses', singular: 'Expense', group: 'Finance',
    columns: ['name', 'date', 'category', 'partner_id', 'amount', 'state'], search: ['name'], order: 'date desc, id desc',
    create: ['name', 'date', 'category', 'amount', 'partner_id', 'bill_id'],
    sections: [
      { title: 'Expense', fields: ['name', 'date', 'category', 'amount', 'partner_id', 'bill_id'] },
      { title: 'Approval', fields: ['approved_by', 'approved_date', 'payout_id'] },
    ],
  },
  {
    slug: 'payouts', model: 'salon.staff.payout', title: 'Staff payouts', singular: 'Payout', group: 'Finance',
    columns: ['name', 'employee_id', 'date_from', 'date_to', 'commission_total', 'net_payable', 'state'], search: ['name', 'employee_id'], order: 'id desc',
    create: ['employee_id', 'date_from', 'date_to', 'advance', 'other_deduction', 'notes'],
    sections: [
      { title: 'Payout', fields: ['employee_id', 'date_from', 'date_to', 'attendance_days'] },
      { title: 'Amounts', fields: ['commission_total', 'base_pay', 'advance', 'other_deduction', 'net_payable'] },
      { title: 'Approval', fields: ['approved_by', 'approved_date', 'paid_by', 'paid_date', 'expense_id', 'notes'] },
    ],
    tabs: [{
      title: 'Commission lines', top: true, model: 'salon.booking.line', field: 'payout_id',
      columns: ['booking_id', 'booking_date', 'product_id', 'price_subtotal', 'commission_amount'],
    }],
  },
  {
    slug: 'daily', model: 'salon.staff.daily.report', title: 'Staff daily report', singular: 'Report', group: 'Reports', readonly: true, noQuick: true,
    columns: ['date', 'employee_id', 'bookings', 'services_done', 'services_cancelled', 'no_shows', 'revenue', 'commission', 'worked_hours', 'revenue_per_hour'],
    search: ['employee_id'], order: 'date desc', sections: [],
  },
  {
    slug: 'profit', model: 'salon.profit.report', title: 'Profit report', singular: 'Report', group: 'Reports', readonly: true, noQuick: true,
    columns: ['date', 'kind', 'category', 'employee_id', 'product_id', 'amount'],
    search: ['category'], order: 'date desc', sections: [],
  },
];

export const BY_SLUG = Object.fromEntries(CONFIG.map((c) => [c.slug, c]));
export const BY_MODEL = Object.fromEntries(CONFIG.map((c) => [c.model, c]));
export const GROUPS = ['Front desk', 'Salon', 'Finance', 'Reports'] as const;
