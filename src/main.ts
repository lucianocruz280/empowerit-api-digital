import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';

import * as Sentry from '@sentry/node';
import { SentryFilter } from './sentry/sentry.filter';

async function bootstrap() {
  /*Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV,
    enabled: true,
    debug: true,
  });*/

  dayjs.extend(utc);
  dayjs.extend(timezone);
  dayjs.extend(isoWeek);
  dayjs.locale({
    name: 'es-ES',
    weekStart: 7,
  } as any);

  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  console.log("la apikey", process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),)
  //app.useGlobalFilters(new SentryFilter(httpAdapter));
  const PORT = process.env.PORT || 8080
  await app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

bootstrap();
