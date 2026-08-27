import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import type { Env } from "../common/env";
import { AuthService, type AuthResult } from "./auth.service";
import { ChangePasswordDto, LoginDto, RegisterDto } from "./dto/auth.dto";

const REFRESH_COOKIE_NAME = "rt";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(reply, result.refreshToken);
    return this.toResponse(result);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(reply, result.refreshToken);
    return this.toResponse(result);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const plainToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await this.authService.refresh(plainToken);
    this.setRefreshCookie(reply, result.refreshToken);
    return this.toResponse(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const plainToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(plainToken);
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Patch("password")
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.id, dto);
    return { success: true };
  }

  private setRefreshCookie(reply: FastifyReply, token: string) {
    reply.setCookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.configService.get("NODE_ENV", { infer: true }) === "production",
      sameSite: "lax",
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }

  private toResponse(result: AuthResult) {
    return { accessToken: result.accessToken, user: result.user };
  }
}
