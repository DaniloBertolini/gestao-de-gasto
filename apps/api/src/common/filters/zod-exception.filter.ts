import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ZodValidationException } from "nestjs-zod";

@Catch(ZodValidationException)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const zodError = exception.getZodError();

    const errors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const path = issue.path.join(".") || "_root";
      errors[path] ??= [];
      errors[path].push(issue.message);
    }

    reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: "Erro de validação",
      errors,
    });
  }
}
