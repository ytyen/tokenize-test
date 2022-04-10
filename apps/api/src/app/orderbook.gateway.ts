import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
  ConnectedSocket
} from '@nestjs/websockets';
import { Orderbook } from '@tokenize-test/api-interfaces';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Server, Socket } from 'socket.io';
import { AppService } from './app.service';

@WebSocketGateway({ namespace: 'orderbook-ws' })
export class OrderbookGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly appService: AppService) {

  }

  afterInit(@ConnectedSocket() client: Socket) {
    this.appService.orderBook$.subscribe(res => {
      client.emit('newEvent', res);
    });
  }
}
