**What to build — and how to combine it with K8s**

Here's a project that kills both birds cleanly: **a background job processing system with autoscaling workers.**

The setup:

- A simple HTTP API (Express + TypeScript) that accepts requests — let's say "resize this image" or "send this email" — and publishes a job to a RabbitMQ topic exchange with appropriate routing keys (`image.resize`, `email.send`, etc.)
- Two or three separate worker services (consumers), each subscribed to the routing keys relevant to them, processing jobs and acking when done. Include a dead letter queue for failures.
- Deploy all of this on Kubernetes — the API as a Deployment, RabbitMQ via the **RabbitMQ Cluster Operator** (it's a real thing, makes deploying RabbitMQ on K8s much cleaner than doing it manually), and each worker type as its own Deployment.
- Then add **KEDA** (Kubernetes Event-Driven Autoscaling). KEDA has a native RabbitMQ scaler — it watches your queue depth and automatically scales your worker pods up when messages pile up and back down when the queue drains.

Why this project specifically: KEDA is the natural bridge between your RabbitMQ knowledge and K8s. You're not just deploying a static app on K8s for the sake of it — you're using K8s to solve the actual backpressure problem you just learned about in the course. Queue growing faster than consumers can handle? K8s spins up more consumer pods automatically. Queue empty? Scales back to one. That's a genuinely compelling thing to demo.

The K8s practice you'll get: Deployments, Services, ConfigMaps and Secrets (for RabbitMQ credentials), StatefulSets (RabbitMQ is stateful — good to wrestle with), namespaces, resource limits, and HPA/KEDA configuration. That's a solid chunk of the practical K8s you're currently missing. You'll stop "speaking the language" and start actually doing things with it.

Start without K8s — get the RabbitMQ system working locally with Docker Compose first. Then lift it into K8s. That's the right order; don't fight two hard things simultaneously.

---

**What else I'd tell you**

A few things, in order of importance:

The concepts you've learned transfer directly to **Kafka**, which is the other major player in this space and arguably more commonly asked about in senior backend and data engineering roles. Kafka thinks about things differently (it's more of an event log than a traditional queue), but if you understand RabbitMQ deeply you'll ramp on Kafka fast. Worth knowing it exists and roughly how they differ.

The reason quorum queues and distributed nodes behave the way they do — why you sometimes can't have both consistency and availability simultaneously — has a name: the **CAP theorem**. It's a 20-minute read and it'll make everything in the "Nodes and Clusters" chapter click at a deeper level. Google it when you have a quiet moment.

On K8s more broadly: KCNA is conceptual, CKA is practical. The gap you're describing between "can speak the language" and "can build something serious" is exactly the gap between those two certifications. The project above will move you meaningfully in that direction. If you eventually want to close it fully, CKA prep will force you to actually build and break things in a cluster. That's the one.

And last thing: three sessions, a course finished, solid notes, real questions. That's a better week of learning than most people manage. The knowledge is in your head — now it just needs a project to land in.
