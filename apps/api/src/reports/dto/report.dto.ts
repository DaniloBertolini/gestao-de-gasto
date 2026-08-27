import { createZodDto } from "nestjs-zod";
import { monthlySeriesQuerySchema, reportRangeQuerySchema } from "@gestao/shared";

export class ReportRangeQueryDto extends createZodDto(reportRangeQuerySchema) {}
export class MonthlySeriesQueryDto extends createZodDto(monthlySeriesQuerySchema) {}
