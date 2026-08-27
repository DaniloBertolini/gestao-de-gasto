import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply } from "fastify";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === "string") {
      reply.status(status).send({ statusCode: status, message: body });
      return;
    }

    reply.status(status).send({ statusCode: status, ...body });
  }
}

export const INTERNAL_SERVER_ERROR_BODY = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  message: "Erro interno do servidor",
};
