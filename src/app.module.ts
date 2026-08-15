import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ClockModule } from './common/clock/clock.module';
import { configuration } from './config/configuration';
import { validateEnvironment } from './config/environment.schema';
import { CurrenciesModule } from './currencies/currencies.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    ClockModule,
    HealthModule,
    CurrenciesModule,
  ],
  providers: [
    // Registered as providers rather than via app.useGlobalPipes so that tests
    // booting AppModule get exactly the same request handling as production.
    {
      provide: APP_PIPE,
      useFactory: (): ValidationPipe =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: false },
        }),
    },
  ],
})
export class AppModule {}
