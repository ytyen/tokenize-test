import { Controller, Get } from '@nestjs/common';
import { Orderbook } from '@tokenize-test/api-interfaces';
import { AppService } from './app.service';
import { take } from 'rxjs/operators';


@Controller()
export class AppController {

  constructor(private readonly appService: AppService) {
    this.appService.setup();
  }

  @Get('orderbook')
  async getData(): Promise<Orderbook> {
    return this.appService.orderBook$.pipe(take(1)).toPromise();
  }
}
