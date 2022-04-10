import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderbookGateway } from './orderbook.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, OrderbookGateway],
})
export class AppModule {}
