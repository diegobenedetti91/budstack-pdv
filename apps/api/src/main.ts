import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  console.log('🔍 JWT_SECRET length:', process.env.JWT_SECRET?.length || 0)
  console.log('🔍 JWT_SECRET value:', process.env.JWT_SECRET?.substring(0, 20) + '...')
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
