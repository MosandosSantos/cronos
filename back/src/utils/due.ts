import { DueStatus } from '@prisma/client';

export type DueResult = {
  dueDate: Date;
  status: DueStatus;
  daysToDue: number;
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const daysBetween = (from: Date, to: Date) => {
  const fromStart = startOfDay(from).getTime();
  const toStart = startOfDay(to).getTime();
  return Math.ceil((toStart - fromStart) / (1000 * 60 * 60 * 24));
};

export const getStatus = (dueDate: Date, warningDays = 30, now = new Date()): DueStatus => {
  const daysToDue = daysBetween(now, dueDate);
  if (daysToDue < 0) {
    return DueStatus.EXPIRED;
  }
  if (daysToDue <= warningDays) {
    return DueStatus.DUE_SOON;
  }
  return DueStatus.VALID;
};

export const calculateDue = (
  performedAt: Date,
  validityDays: number,
  warningDays = 30,
  now = new Date()
): DueResult => {
  const dueDate = addDays(performedAt, validityDays);
  const status = getStatus(dueDate, warningDays, now);
  const daysToDue = daysBetween(now, dueDate);
  return { dueDate, status, daysToDue };
};
