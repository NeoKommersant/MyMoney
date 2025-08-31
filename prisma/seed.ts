import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // один тестовый пользователь
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      name: "Demo",
      currency: "RUB",
      paydayAdvance: 10,
      paydayMain: 25,
    },
  });

  const base = ["Жилье","Еда","Транспорт","Коммунальные","Связь/Интернет","Здоровье (повс.)","Одежда","Развлечения","Образование","Прочее"];
  const unexpected = ["Медицина внепл.","Командировка","Подарки","Ремонт","Переезд","Налоги/Штрафы","Срочные покупки","Путешествия","Техника","Прочее внепл."];

  for (const name of base) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name, type: "base" },
    });
  }
  for (const name of unexpected) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name, type: "unexpected" },
    });
  }
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
