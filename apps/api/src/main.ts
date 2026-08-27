import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "./app.module";
import type { Env } from "./common/env";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const configService = app.get(ConfigService<Env, true>);

  await app.register(fastifyCookie);

  app.enableCors({
    origin: configService.get("CORS_ORIGIN", { infer: true }),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });

  app.setGlobalPrefix("api/v1");

  const port = configService.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");
  console.log(`API rodando em http://localhost:${port}/api/v1`);
}

bootstrap();
