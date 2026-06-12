import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { join } from 'path'
import * as express from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'http://localhost:3001', 'https:'],
      },
    },
  }))
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  // Servir uploads como static files ANTES do prefix
  const uploadPath = join(__dirname, '..', 'public', 'uploads')
  app.use('/uploads', express.static(uploadPath))

  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('BudStack PDV API')
    .setDescription('API do sistema de restaurante BudStack PDV')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`🚀 API rodando em: http://localhost:${port}/api/v1`)
  console.log(`📚 Docs em: http://localhost:${port}/api/docs`)
}

bootstrap()
