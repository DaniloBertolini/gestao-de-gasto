import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";
import {
  CategoryReportQueryDto,
  FlowSeriesQueryDto,
  MonthlySeriesQueryDto,
  ReportRangeQueryDto,
} from "./dto/report.dto";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRangeQueryDto) {
    return this.reportsService.summary(user.id, query);
  }

  @Get("by-category")
  byCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CategoryReportQueryDto,
    @Query("type") type: "INCOME" | "EXPENSE" = "EXPENSE",
  ) {
    return this.reportsService.byCategory(user.id, query, type);
  }

  @Get("monthly-series")
  monthlySeries(@CurrentUser() user: AuthenticatedUser, @Query() query: FlowSeriesQueryDto) {
    return this.reportsService.monthlySeries(user.id, query);
  }

  @Get("balance-history")
  balanceHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: MonthlySeriesQueryDto) {
    return this.reportsService.balanceHistory(user.id, query);
  }

  @Get("category-anomalies")
  categoryAnomalies(@CurrentUser() user: AuthenticatedUser, @Query() query: FlowSeriesQueryDto) {
    return this.reportsService.categoryAnomalies(user.id, query);
  }
}
