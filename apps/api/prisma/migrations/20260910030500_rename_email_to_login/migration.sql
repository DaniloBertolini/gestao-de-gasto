-- Renomeia a coluna preservando os dados: quem já tinha conta continua
-- entrando com o mesmo valor que usava como e-mail, agora como "login".
ALTER TABLE "User" RENAME COLUMN "email" TO "login";

-- Mantém o índice único coerente com o novo nome da coluna.
ALTER INDEX "User_email_key" RENAME TO "User_login_key";
