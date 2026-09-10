import { z } from "zod";

// Query string manda um valor só como string e vários como array; normaliza
// para sempre virar lista (ou ausente, quando não há filtro).
const accountIdsFilter = z.preprocess(
  (v) => (v === undefined || v === null || v === "" ? undefined : Array.isArray(v) ? v : [v]),
  z.array(z.string().cuid()).optional(),
);

export const reportRangeQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;

/** Relatórios de fluxo (receita/despesa) aceitam recorte por conta. */
export const categoryReportQuerySchema = reportRangeQuerySchema.extend({
  accountId: accountIdsFilter,
});
export type CategoryReportQuery = z.infer<typeof categoryReportQuerySchema>;

export const monthlySeriesQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});
export type MonthlySeriesQuery = z.infer<typeof monthlySeriesQuerySchema>;

export const flowSeriesQuerySchema = monthlySeriesQuerySchema.extend({
  accountId: accountIdsFilter,
});
export type FlowSeriesQuery = z.infer<typeof flowSeriesQuerySchema>;
