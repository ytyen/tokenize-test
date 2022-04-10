import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Orderbook, Delta } from '@tokenize-test/api-interfaces';
import { io } from 'socket.io-client';
import { timer, map } from 'rxjs';

@Component({
  selector: 'tokenize-test-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  socket = io('wss://tokenize-test-yen-api.herokuapp.com/orderbook-ws')
  orderbook: Orderbook = { bid: [], ask: [] };

  totalAskSize = 0;
  totalBidAmount = 0;

  timer$ = timer(0, 1000).pipe(map(x => new Date()));

  constructor(private http: HttpClient) {
    this.http.get<Orderbook>('https://tokenize-test-yen-api.herokuapp.com/api/orderbook').subscribe(res => {
      this.orderbook = res;
      this.totalAskSize = this.getTotalSize(res.ask);
      this.totalBidAmount = this.getTotalAmount(res.bid);
    });

    this.socket.on('newEvent', (arg) => {
      this.orderbook = arg;
      this.totalAskSize = this.getTotalSize(arg.ask);
      this.totalBidAmount = this.getTotalAmount(arg.bid);
    });
  }

  getTotalAmount(data: Delta[]) {
    return data.map(x => x.size * x.price).reduce((acc, x) => acc + x);
  }

  getTotalSize(data: Delta[]) {
    return data.map(x => x.size).reduce((acc, x) => acc + x);
  }
}
