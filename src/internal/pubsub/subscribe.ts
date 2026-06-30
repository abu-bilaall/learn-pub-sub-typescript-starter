import amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./consume.js";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => void,
): Promise<void> {
  const [channel, { queue }] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType,
  );

  await channel.consume(queue, (msg) => {
    if (!msg) return;

    try {
      const msgObj = JSON.parse(msg.content.toString("utf8")) as T;
      handler(msgObj);
      channel.ack(msg);
    } catch (err) {
      console.error("Failed to process message:", err);
      channel.nack(msg, false, false);
    }
  });
}
