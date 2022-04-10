import { Injectable } from '@nestjs/common';
import { Orderbook, Delta } from '@tokenize-test/api-interfaces';
import { BehaviorSubject, timer, withLatestFrom, combineLatest, from, map, filter, Observable } from 'rxjs';
import * as signalR from 'signalr-client';
import * as zlib from 'zlib';
import axios from 'axios';
import * as _ from 'lodash';

@Injectable()
export class AppService {
  private url = 'wss://socket-v3.bittrex.com/signalr';
  private hub = ['c3'];
  private client;
  private resolveInvocationPromise: any = () => {
    /* empty */
  };

  bidDeltas$: BehaviorSubject<Delta>;
  askDeltas$: BehaviorSubject<Delta>;

  observable$: Observable<Orderbook>;
  orderBook$ = new BehaviorSubject<Orderbook>(null);

  async setup() {
    const response = await axios.get(
      'https://api.bittrex.com/v3/markets/ETH-BTC/orderbook?depth=1'
    );
    const { bid, ask } = response.data;

    this.bidDeltas$ = new BehaviorSubject<Delta>({
      size: +bid[0].quantity,
      price: +bid[0].rate,
    });
    this.askDeltas$ = new BehaviorSubject<Delta>({
      size: +ask[0].quantity,
      price: +ask[0].rate,
    });

    this.observable$ = timer(0, 30000).pipe(
      withLatestFrom(
        combineLatest([
          this.bidDeltas$.pipe(filter((x) => x.size > 0)),
          this.askDeltas$.pipe(filter((x) => x.size > 0)),
        ])
      ),
      map(([, data]) => data),
      map(this.generateData)
    );

    this.observable$.subscribe((res) => {
      // console.log(new Date(), res);

      // const sumOfBidAmount = res.bid.map(x => x.price * x.size).reduce((acc, x) => acc + x);
      // console.log(sumOfBidAmount);

      // const sumOfAskSize = res.ask.map(x => x.size).reduce((acc, x) => acc + x);
      // console.log(sumOfAskSize);

      this.orderBook$.next(res);
    });

    this.client = await this.connect();
    await this.subscribe(this.client);
  }

  async connect() {
    return new Promise((resolve) => {
      const client = new signalR.client(this.url, this.hub);
      client.serviceHandlers.messageReceived = (message) => {
        this.messageReceived(message, this.bidDeltas$, this.askDeltas$);
      };
      client.serviceHandlers.connected = () => {
        console.log('Connected');
        return resolve(client);
      };
    });
  }

  async subscribe(client) {
    const channels = ['orderbook_ETH-BTC_1'];
    const response = await this.invoke(client, 'subscribe', channels);

    for (let i = 0; i < channels.length; i++) {
      if (response[i]['Success']) {
        console.log('Subscription to "' + channels[i] + '" successful');
      } else {
        console.log(
          'Subscription to "' +
            channels[i] +
            '" failed: ' +
            response[i]['ErrorCode']
        );
      }
    }
  }

  async invoke(client, method, ...args) {
    return new Promise((resolve, reject) => {
      this.resolveInvocationPromise = resolve; // Promise will be resolved when response message received

      client.call(this.hub[0], method, ...args).done(function (err) {
        if (err) {
          return reject(err);
        }
      });
    });
  }

  messageReceived(message, bidDeltas$, askDeltas$) {
    const data = JSON.parse(message.utf8Data);
    if (data['R']) {
      console.log(this.resolveInvocationPromise);
      this.resolveInvocationPromise(data.R);
    } else if (data['M']) {
      data.M.forEach(function (m) {
        if (m['A']) {
          if (m.A[0]) {
            const b64 = m.A[0];
            const raw = Buffer.from(b64, 'base64');

            zlib.inflateRaw(raw, function (err, inflated) {
              if (!err) {
                const json = JSON.parse(inflated.toString('utf8'));
                // console.log(m.M + ': ');
                // console.log(json);

                from(json.bidDeltas)
                  .pipe(
                    map((x: any) => ({ size: +x.quantity, price: +x.rate }))
                  )
                  .subscribe((x) => bidDeltas$.next(x));
                from(json.askDeltas)
                  .pipe(
                    map((x: any) => ({ size: +x.quantity, price: +x.rate }))
                  )
                  .subscribe((x) => askDeltas$.next(x));
              }
            });
          } else if (m.M == 'heartbeat') {
            console.log('\u2661');
          } else if (m.M == 'authenticationExpiring') {
            console.log('Authentication expiring...');
          }
        }
      });
    }
  }

  private generateData(data: Delta[]): Orderbook {
    const [bestBid, bestAsk] = data;

    // total amount must less then 5
    const limit = (5 - bestBid.size * bestBid.price) / 11;
    const bidDeltas = Array.from(Array(11))
      .map(() => _.random(1, 1000) / 100000000)
      .reduce((acc, x, i) => {
        const last = acc[i];
        const price = +(last.price - x).toFixed(8);
        const size = +_.random(limit / price, true).toFixed(8);

        acc.push({ size, price });
        return acc;
      }, [bestBid]);

    // total of size must less then 150
    const randomUpper = (150 - bestAsk.size) / 11;
    const askDeltas = Array.from(Array(11))
      .map(() => _.random(1, 1000) / 100000000)
      .reduce((acc, x, i) => {
        const last = acc[i];
        const size = +_.random(randomUpper, true).toFixed(8);
        const price = +(last.price + x).toFixed(8);

        acc.push({ size, price });
        return acc;
      }, [bestAsk]);

    return {
      bid: bidDeltas,
      ask: askDeltas
    }
  }
}
