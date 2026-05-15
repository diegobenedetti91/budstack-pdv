import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { UsersModule } from './modules/users/users.module'
import { CompaniesModule } from './modules/companies/companies.module'
import { TablesModule } from './modules/tables/tables.module'
import { CategoriesModule } from './modules/categories/categories.module'
import { ProductsModule } from './modules/products/products.module'
import { OrdersModule } from './modules/orders/orders.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { PrintersModule } from './modules/printers/printers.module'
import { ReportsModule } from './modules/reports/reports.module'
import { KitchenModule } from './modules/kitchen/kitchen.module'
import { KioskModule } from './modules/kiosk/kiosk.module'
import { ShiftsModule } from './modules/shifts/shifts.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CompaniesModule,
    TablesModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    PrintersModule,
    ReportsModule,
    KitchenModule,
    KioskModule,
    ShiftsModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
