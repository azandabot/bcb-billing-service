import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config.type';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('BCB Billing Service')
      .setDescription(
        'Calculates account bills in GBP from a monthly base fee, per-transaction fees above a prorated threshold, and a promotional discount.',
      )
      .setVersion('1.0.0')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(ConfigService<AppConfig, true>);
  await app.listen(config.getOrThrow('port', { infer: true }));
}

void bootstrap();
