import { randomBytes, randomUUID, createHash } from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../common/prisma/prisma.service";
import { ARGON2_OPTIONS } from "../common/constants/argon2";
import type { Env } from "../common/env";
import type { ChangePasswordInput, LoginInput, RegisterInput } from "@gestao/shared";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException("E-mail já cadastrado");

    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });

    return this.issueSession(user.id, user.email, user.name);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    // Timing constante: sempre roda argon2.verify, mesmo com usuário inexistente.
    const passwordHash = user?.passwordHash ?? (await argon2.hash(randomUUID(), ARGON2_OPTIONS));
    const valid = await argon2.verify(passwordHash, input.password).catch(() => false);

    if (!user || !valid) throw new UnauthorizedException("Credenciais inválidas");

    return this.issueSession(user.id, user.email, user.name);
  }

  async refresh(plainToken: string | undefined): Promise<AuthResult> {
    if (!plainToken) throw new UnauthorizedException("Refresh token ausente");

    const tokenHash = this.hashToken(plainToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão expirada, faça login novamente");
    }

    if (stored.revokedAt) {
      // Token já usado sendo reapresentado: possível roubo. Revoga toda a família.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Sessão inválida, faça login novamente");
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedException("Usuário não encontrado");

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(user.id, user.email, user.name, stored.familyId);
  }

  async logout(plainToken: string | undefined): Promise<void> {
    if (!plainToken) return;
    const tokenHash = this.hashToken(plainToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await argon2.verify(user.passwordHash, input.currentPassword).catch(() => false);
    if (!valid) throw new UnauthorizedException("Senha atual incorreta");

    const passwordHash = await argon2.hash(input.newPassword, ARGON2_OPTIONS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  private async issueSession(
    userId: string,
    email: string,
    name: string,
    familyId: string = randomUUID(),
  ): Promise<AuthResult> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true }),
        expiresIn: ACCESS_TOKEN_TTL,
        algorithm: "HS256",
      },
    );

    const refreshToken = randomBytes(32).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken, user: { id: userId, email, name } };
  }

  private hashToken(token: string): string {
    const pepper = this.configService.get("JWT_REFRESH_PEPPER", { infer: true });
    return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
  }
}
