import { createZodDto } from "nestjs-zod";
import {
  categoryReportQuerySchema,
  flowSeriesQuerySchema,
  monthlySeriesQuerySchema,
  reportRangeQuerySchema,
} from "@gestao/shared";

export class ReportRangeQueryDto extends createZodDto(reportRangeQuerySchema) {}
export class CategoryReportQueryDto extends createZodDto(categoryReportQuerySchema) {}
export class MonthlySeriesQueryDto extends createZodDto(monthlySeriesQuerySchema) {}
export class FlowSeriesQueryDto extends createZodDto(flowSeriesQuerySchema) {}
