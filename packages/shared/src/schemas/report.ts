import { z } from "zod";

export const reportRangeQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;

export const monthlySeriesQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});
export type MonthlySeriesQuery = z.infer<typeof monthlySeriesQuerySchema>;
