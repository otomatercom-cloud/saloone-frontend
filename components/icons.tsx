import { LayoutDashboard, CalendarCheck, Contact, Scissors, Users, Percent, Receipt, Wallet, BarChart3, TrendingUp, CalendarDays, UserCheck, PlusCircle, type LucideIcon } from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, bookings: CalendarCheck, customers: Contact, services: Scissors, staff: Users, rules: Percent,
  expenses: Receipt, payouts: Wallet, daily: BarChart3, profit: TrendingUp, calendar: CalendarDays, checkin: UserCheck, newbooking: PlusCircle,
};
