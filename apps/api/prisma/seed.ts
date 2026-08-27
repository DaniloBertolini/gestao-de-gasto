import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

const DEFAULT_CATEGORIES: { name: string; kind: "INCOME" | "EXPENSE"; icon: string; color: string }[] = [
  { name: "Salário", kind: "INCOME", icon: "banknote", color: "#16a34a" },
  { name: "Freelance", kind: "INCOME", icon: "briefcase", color: "#22c55e" },
  { name: "Investimentos", kind: "INCOME", icon: "trending-up", color: "#0ea5e9" },
  { name: "Outras receitas", kind: "INCOME", icon: "plus-circle", color: "#84cc16" },
  { name: "Moradia", kind: "EXPENSE", icon: "home", color: "#f97316" },
  { name: "Mercado", kind: "EXPENSE", icon: "shopping-cart", color: "#f59e0b" },
  { name: "Transporte", kind: "EXPENSE", icon: "car", color: "#eab308" },
  { name: "Alimentação", kind: "EXPENSE", icon: "utensils", color: "#ef4444" },
  { name: "Saúde", kind: "EXPENSE", icon: "heart-pulse", color: "#ec4899" },
  { name: "Educação", kind: "EXPENSE", icon: "graduation-cap", color: "#8b5cf6" },
  { name: "Lazer", kind: "EXPENSE", icon: "party-popper", color: "#a855f7" },
  { name: "Assinaturas", kind: "EXPENSE", icon: "repeat", color: "#6366f1" },
  { name: "Contas e serviços", kind: "EXPENSE", icon: "receipt", color: "#3b82f6" },
  { name: "Vestuário", kind: "EXPENSE", icon: "shirt", color: "#14b8a6" },
  { name: "Pets", kind: "EXPENSE", icon: "paw-print", color: "#d946ef" },
  { name: "Cuidados pessoais", kind: "EXPENSE", icon: "sparkles", color: "#f43f5e" },
  { name: "Presentes", kind: "EXPENSE", icon: "gift", color: "#fb7185" },
  { name: "Viagens", kind: "EXPENSE", icon: "plane", color: "#0891b2" },
  { name: "Impostos e taxas", kind: "EXPENSE", icon: "landmark", color: "#64748b" },
  { name: "Outras despesas", kind: "EXPENSE", icon: "minus-circle", color: "#78716c" },
];

async function main() {
  const email = "demo@gestao.local";
  const passwordHash = await argon2.hash("senha12345", ARGON2_OPTIONS);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Usuário Demo", passwordHash },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name_kind: { userId: user.id, name: category.name, kind: category.kind } },
      update: {},
      create: { ...category, userId: user.id },
    });
  }

  await prisma.account.upsert({
    where: { userId_name: { userId: user.id, name: "Carteira" } },
    update: {},
    create: { userId: user.id, name: "Carteira", type: "CASH", initialBalance: 0 },
  });

  console.log(`Seed concluído para ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
