import { encode } from "@msgpack/msgpack";
import type { ConfirmChannel, Channel } from "amqplib";

export async function createExchange(ch: Channel, exchange: string) {
  await ch.assertExchange(exchange, "direct", {
    durable: true,
  });
}

export function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const jsonBuf = Buffer.from(JSON.stringify(value));

  return new Promise((resolve, reject) => {
    ch.publish(
      exchange,
      routingKey,
      jsonBuf,
      { contentType: "application/json" },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

export function publishMsgPack<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const msgBuf = Buffer.from(encode(value));

  return new Promise((resolve, reject) => {
    ch.publish(
      exchange,
      routingKey,
      msgBuf,
      { contentType: "application/x-msgpack" },
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });
}
