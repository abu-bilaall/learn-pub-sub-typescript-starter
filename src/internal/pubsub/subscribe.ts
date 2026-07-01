import amqp from "amqplib";
import { decode } from "@msgpack/msgpack";
import { declareAndBind, SimpleQueueType } from "./consume.js";

export type AckType = "Ack" | "NackRequeue" | "NackDiscard";

async function subscribe<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  routingKey: string,
  simpleQueueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
  deserializer: (data: Buffer) => T,
): Promise<void> {
  const [channel, { queue }] = await declareAndBind(
    conn,
    exchange,
    queueName,
    routingKey,
    simpleQueueType,
  );

  await channel.prefetch(1);

  await channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const msgObj = deserializer(msg.content);
      const ackType = await handler(msgObj);

      if (ackType === "Ack") {
        channel.ack(msg);
        console.log(`[Ack]: ${JSON.stringify(msgObj)}`);
      } else if (ackType === "NackRequeue") {
        channel.nack(msg, false, true);
        console.log(`[NackRequeue]: ${JSON.stringify(msgObj)}`);
      } else if (ackType === "NackDiscard") {
        channel.nack(msg, false, false);
        console.log(`[NackDiscard]: ${JSON.stringify(msgObj)}`);
      }
    } catch (err) {
      console.error("Failed to process message:", err);
      channel.nack(msg, false, false);
    }
  });
}

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
  return subscribe(
    conn,
    exchange,
    queueName,
    key,
    queueType,
    handler,
    (data) => JSON.parse(data.toString("utf8")) as T,
  );
}

export async function subscribeMsgPack<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
  return subscribe(
    conn,
    exchange,
    queueName,
    key,
    queueType,
    handler,
    (data) => decode(data) as T,
  );
}
