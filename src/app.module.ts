import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AccountsModule } from './accounts/accounts.module';
import { BillingModule } from './billing/billing.module';
import { ClockModule } from './common/clock/clock.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
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
    AccountsModule,
    BillingModule,
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
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
