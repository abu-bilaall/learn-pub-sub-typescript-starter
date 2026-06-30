# Pub/Sub - RabbitMQ
***
# Rabbit Session 1 Notes
Date: June 29, 2026

## Pub/Sub Intro

Pub/Sub is an architectural pattern that enables communication between decoupled services, making them efficient, scalable, and maintainable. It's often used in event-driven architectural setups such as microservices.

Pub/Sub relies on message brokers such as RabbitMQ, ActiveMQ, Kafka, SQS, etc.

## What really are message brokers?

Message brokers are the intermediary that sits between producing services and consuming services in a Pub/Sub system.

Protocols enabling them include AMQP, STOMP, and MQTT, which are open standards. There are also proprietary alternatives used in SQS and GCP Pub/Sub.

For this introductory course, RabbitMQ will be the message broker and AMQP the protocol. RabbitMQ has three components:

1. **The Server** — the broker itself
2. **The Client Library** — `amqplib` for the TypeScript/Node ecosystem
3. **The Management UI** — available at port `15672`

> **Note:** the Management UI isn't on by default — it's a plugin you have to enable:
> 
> ```
> rabbitmq-plugins enable rabbitmq_management
> ```
> 
> If you're using Docker, the `rabbitmq:management` image tag bakes this in; the plain `rabbitmq` tag doesn't. Worth checking now so `localhost:15672` doesn't mysteriously refuse connections later.

## What really are protocols?

Protocols are simply an agreed-upon language of communication between two systems. In the case of message brokers, they include AMQP, STOMP, and MQTT as highlighted above. All three are open standards.

- **MQTT** — the oldest of the three (1999, built by IBM for oil pipeline telemetry over satellite links). It's small and bare-bones by design: a 2-byte header, no concept of exchanges/queues/routing rules — a client just publishes to a topic and the broker fans it out. Built for constrained IoT devices and unreliable networks.
- **AMQP** — came later (2003, JPMorgan Chase, for financial messaging). Heavier than MQTT, but does more — it adds exchanges, queues, and rich routing logic. The one RabbitMQ supports out of the box.
- **STOMP** — newest of the three (~2005). Optimized for web applications; also supported by RabbitMQ via a plugin.

~~AMQP is the badass and the oldest~~ — AMQP is the badass, but MQTT is the old-timer. AMQP just came in later and brought more firepower (routing, exchanges) for enterprise use cases.

## Event-Driven Architecture?

> An event-driven architecture uses events to trigger and communicate between decoupled systems.

This architecture is often used with microservices. The alternative to EDA for microservices is non-event-driven setups (e.g., direct command).

The key thing in EDA: **the consumer has all the power to opt in** to consume events from the producer — unlike non-event-driven setups, where the publisher is the one that decides who to call and who to ignore.

## Terminologies

|Term|Meaning|
|---|---|
|Message broker|The middleman / middleware in a Pub/Sub system|
|Publisher / Producer / Sender|The service that emits the event|
|Subscriber / Consumer / Receiver|The service that is listening for the event|

---

_Corrections from session 1 review: protocol age order flipped (MQTT is oldest, not AMQP), `amqlib` → `amqplib` typo fixed, MQTT reframed as its own lightweight protocol rather than "AMQP for IoT", and a flag added for the Management UI plugin requirement._

# RabbitMQ Session 2 Notes
Date: June 30, 2026

## Exchanges and Queues

Exchanges and queues are the core components within a messaging broker such as RabbitMQ.

Exchanges are responsible for receiving messages from publishers and forwarding them to queues. As such, publishers don't know about queues, and queues don't know about publishers. Everyone is friends with the exchange. The exchange is friends with everyone.

There are four exchange types:

- **Direct** — the exchange only forwards the message to the queue(s) whose binding key _exactly matches_ the routing key.
- **Topic** — the exchange only forwards the message to the queue(s) whose binding _pattern matches_ the routing key.
- **Fanout** — the exchange forwards the message to every queue bound to it (ignores the routing key entirely).
- **Headers** — similar in spirit to Topic, but matches on header attributes attached to the message rather than pattern-matching the routing key.

The course author said Direct and Topic are the most used in his experience.

### Other jargon related to exchanges and queues

- **Queue** — a buffer where messages are stored before being consumed. Queues are either Durable (persisted to disk, survives a broker restart) or Transient (kept in memory, lost on restart).
- **Binding** — the link between an exchange and a queue, defined by a routing key (or pattern) that tells the exchange which messages belong on that queue.
- **Channel** — a lightweight virtual connection multiplexed _inside_ a single TCP connection. You open one real TCP connection to RabbitMQ per app, then open many cheap channels on top of it — one per thread/operation — to actually declare queues, publish, or consume. Channels are cheap; connections are comparatively expensive, which is why you don't open a new TCP connection for every operation.
- **Connection** — the actual TCP connection (carrying the AMQP protocol) between your application and the RabbitMQ server. One connection, many channels.

Relationship at a glance:

> Publisher → Exchange → Queue → Consumer(s)

## Async pub/sub vs. point-to-point sync

Pub/sub is asynchronous by nature — systems don't have to wait on each other, and operations are non-blocking. This is unlike point-to-point systems such as HTTP, where the caller sends a request and blocks until it gets a response before moving on.

The other major advantage of pub/sub over point-to-point is decoupling (covered in Session 1).

## Multi-consumers

A queue can have 0, 1, or many consumers.

Rules of thumb:

- A queue with only one consumer has all of its messages consumed by that one consumer.
- A queue with many consumers still delivers each individual message to only _one_ of them (not "a bit of" each message to each consumer) — by default this is distributed via **round robin**: RabbitMQ hands message 1 to consumer A, message 2 to consumer B, message 3 to consumer A, and so on in turn, so the workload spreads evenly across whoever's listening. (This can be tuned with prefetch/QoS settings if you want something other than strict alternation.)
- A queue with no consumers just keeps growing. There's no built-in size cap by default — durable queues keep filling on disk, transient ones in memory — until you either run out of resources or explicitly set a limit (RabbitMQ supports policies like `max-length` or message TTL to cap this).

## Routing patterns

Routing keys that tell exchanges which queue to send a message to can also be expressed as patterns (used by Topic exchanges). In RabbitMQ, routing keys are words separated by `.`, e.g. `user.created` is two words.

The pattern mechanism relies on two symbols, and both are used as **whole words in the dot-separated key** — so the dot before them matters:

- `#` matches zero or more words.
- `*` matches exactly one word.

Example — pattern `user.#` matches any of:

- `user`
- `user.created`
- `user.created.posts`

Example — pattern `user.*` matches any of:

- `user.created`
- `user.deleted`

…but does **not** match plain `user` alone, since `*` requires exactly one word to be present in that position — zero words doesn't satisfy it. That's the key difference between the two wildcards: `#` is flexible-length, `*` is fixed at exactly one word.

## On naming

**Exchange naming:** the course author said it's common for a pub/sub system to have a single exchange — similar to how you'll often have a single database in a Postgres instance. Name the exchange after the umbrella domain it manages, e.g. `social_posts`.

**Queue naming**, from the course:

> When I'm working with a direct `key -> queue` relationship, I'll often name the queue the same as the key, but add a word to describe the intended consumer. For example, if I have a routing key `user.created`, I might create a queue for my "email notifier" service called `user.created.email_notifier`.
> 
> If I have a queue that consumes _all_ user events, I might name it `user.all.billing_service`.
> 
> If I have temporary queues, I might append a UUID to the queue name to ensure uniqueness. For example, maybe I have web servers that scale up and down based on traffic, and each server needs a copy of "comment created" events. I might name each server's queue one of:
> 
> - `comment.created.bb7a488b-b4e9-4b16-a697-51c20a09b87b`
> - `comment.created.8d0a9d3e-5244-460b-bacc-80ae2b802677`
> - `comment.created.6814c13f-c33b-4ff7-a4f8-98c718fea980`
> - etc.
> 
> I'll often use auto-generated queue names like this with transient, auto-delete, and exclusive properties so they can be created and destroyed as the system restarts and scales.

**Routing key naming:** the most crucial one to get right, since you want it to be flexible and easy to work with via routing patterns. The course suggests a `noun.verb` convention, e.g. `user.created`.

## The three core processes

### Creating a queue
A consumer (occasionally a publisher) opens a channel on its connection to the broker, then sends a `queue.declare` command specifying the queue's name and properties (durable, exclusive, auto-delete, etc.). If the queue doesn't exist yet, RabbitMQ creates it; if it already exists with matching properties, this is a harmless no-op. On its own, a freshly declared queue is just sitting there — it won't receive anything until it's bound to an exchange via `queue.bind`, supplying the routing key or pattern that tells the exchange "send me messages that match this."

### Publishing a message
A publisher opens a channel, then sends a `basic.publish` command — crucially, **to an exchange, never directly to a queue**. The publish includes the message body, a routing key, and optional properties (headers, a "persistent" flag, etc.). The exchange evaluates that routing key against its bindings, according to its type (direct/topic/fanout/headers), and forwards a copy of the message to every queue whose binding matches. If no queue's binding matches, the message is silently dropped by default — unless the publisher sets the `mandatory` flag, which makes RabbitMQ return the unroutable message back to the publisher instead of discarding it.

### Consuming a message
A consumer opens a channel and registers against a specific queue — either by actively pulling one message at a time (`basic.get`, rarely used in practice) or, far more commonly, by subscribing (`basic.consume`), which tells RabbitMQ to push messages to it automatically as they arrive. After processing a message, the consumer must explicitly acknowledge it (`basic.ack`); only then does RabbitMQ remove it from the queue for good. If the consumer crashes or disconnects before acknowledging, RabbitMQ re-queues the message so another consumer can pick it up. This ack/re-queue mechanic is what makes RabbitMQ resilient to a consumer dying mid-task — you'll dig into this properly in the Delivery chapter.

---

_Corrections from session 2 review: Connection vs. Channel definitions clarified (a channel is a lightweight virtual connection multiplexed inside one TCP connection, not a separate network connection); routing pattern syntax fixed to include the required dot before wildcards (`user.#` / `user.*`, not `user#` / `user*`); the `*` wildcard example corrected, since it matches exactly one word and therefore does not match a bare `user` with zero following words; "round robin" explained; queue-growth note expanded to mention RabbitMQ's optional length/TTL policies; and the three blank sections (creating a queue, publishing a message, consuming a message) written out at a high level._
