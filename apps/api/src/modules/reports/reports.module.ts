import { Module } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { ReportsController } from './reports.controller'
import Redis from 'ioredis'

@Module({
  providers: [
    ReportsService,
    {
      provide: 'REDIS',
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: 0,
        })
        return redis
      },
    },
  ],
  controllers: [ReportsController],
})
export class ReportsModule {}
