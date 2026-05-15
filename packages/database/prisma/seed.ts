import { PrismaClient, UserRole, Plan } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Tenant demo
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-restaurante' },
    update: {},
    create: {
      name: 'Demo Restaurante',
      slug: 'demo-restaurante',
      plan: Plan.PROFESSIONAL,
    },
  })

  // Admin do tenant demo
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrador',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  })

  // Empresa demo
  await prisma.company.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      tradeName: 'Demo Restaurante',
      companyName: 'Demo Restaurante LTDA',
      cnpj: '00.000.000/0001-00',
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      phone: '(11) 99999-9999',
      email: 'contato@demo.com',
    },
  })

  // Mesas demo
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { number_tenantId: { number: i, tenantId: tenant.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        number: i,
        capacity: i % 3 === 0 ? 6 : 4,
      },
    })
  }

  // Categorias e produtos demo
  const categorias = [
    { name: 'Entradas', icon: '🥗' },
    { name: 'Pratos Principais', icon: '🍽️' },
    { name: 'Bebidas', icon: '🥤' },
    { name: 'Sobremesas', icon: '🍮' },
  ]

  for (const cat of categorias) {
    await prisma.category.upsert({
      where: {
        id: `${tenant.id}-${cat.name.toLowerCase().replace(/ /g, '-')}`,
      },
      update: {},
      create: {
        id: `${tenant.id}-${cat.name.toLowerCase().replace(/ /g, '-')}`,
        tenantId: tenant.id,
        name: cat.name,
        icon: cat.icon,
      },
    })
  }

  console.log('Seed concluído com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
