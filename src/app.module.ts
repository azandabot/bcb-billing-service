import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClockModule } from './common/clock/clock.module';
import { configuration } from './config/configuration';
import { validateEnvironment } from './config/environment.schema';
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
  ],
})
export class AppModule {}
