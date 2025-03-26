import 'dotenv/config';
import { Module, HttpException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoapisModule } from './cryptoapis/cryptoapis.module';
import { BondsModule } from './bonds/bonds.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ConfigModule } from '@nestjs/config';
import { ScriptsModule } from './scripts/scripts.module';
import { BinaryService } from './binary/binary.service';
import { UsersService } from './users/users.service';
import { UsersModule } from './users/users.module';
import { BinaryModule } from './binary/binary.module';

import { RanksModule } from './ranks/ranks.module';
import { RanksService } from './ranks/ranks.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import { ReportModule } from './report/report.module';
import { LocationModule } from './location/location.module';
import { GoogletaskModule } from './googletask/googletask.module';
import { GoogletaskService } from './googletask/googletask.service';
import { CloudflareModule } from './cloudflare/cloudflare.module';
import { AcademyModule } from './academy/academy.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { ShopifyModule } from './shopify/shopify.module';
import { EmailModule } from './email/email.module';
import { CartModule } from './cart/cart.module';
import { OpenpayModule } from './openpay/openpay.module';
import { AlgorithmMrRangeModule } from './algorithm-mr-range/algorithm-mr-range.module';
import { ParticipationsController } from './participations/participations.controller';
import { ParticipationsService } from './participations/participations.service';
import { ParticipationsModule } from './participations/participations.module';
import { BondsService } from './bonds/bonds.service';
import { SevenLevelsModule } from './seven-levels/seven-levels.module';
import { CoinpaymentsController } from './coinpayments/coinpayments.controller';
import { CoinpaymentsService } from './coinpayments/coinpayments.service';
import { CoinpaymentsModule } from './coinpayments/coinpayments.module';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { CryptoapisService } from './cryptoapis/cryptoapis.service';
import { ShopifyService } from './shopify/shopify.service';
import { EmailService } from './email/email.service';
import { AdminService } from './admin/admin.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    CryptoapisModule,
    BondsModule,
    SubscriptionsModule,
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
    }),
    ScriptsModule,
    UsersModule,
    BinaryModule,
    RanksModule,
    AdminModule,
    ReportModule,
    LocationModule,
    GoogletaskModule,
    CloudflareModule,
    AcademyModule,
    ShopifyModule,
    EmailModule,
    CartModule,
    OpenpayModule,
    AlgorithmMrRangeModule,
    ParticipationsModule,
    SevenLevelsModule,
    CoinpaymentsModule,
  ],
  controllers: [
    AppController,
    ParticipationsController,
    CoinpaymentsController,
  ],
  providers: [
    AppService,
    BinaryService,
    UsersService,
    RanksService,
    GoogletaskService,
    ParticipationsService,
    SubscriptionsService,
    BondsService,
    CoinpaymentsService,
    CryptoapisService,
    ShopifyService,
    EmailService,
  ],
})
export class AppModule {}
