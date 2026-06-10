import amqplib, { type Connection, type Channel } from 'amqplib';
import { AuthEvent, AuthEventType } from '../types';

// ── Exchange / Queue names ────────────────────────────────
export const EXCHANGE = 'quizhub.auth';
export const QUEUES = {
  AUTH_EVENTS: 'auth.events',
  NOTIFICATION_SERVICE: 'notification.auth',
  USER_SERVICE: 'user.auth',
} as const;

// ── Routing keys ──────────────────────────────────────────
export const ROUTING_KEYS: Record<AuthEventType, string> = {
  'user.registered':                'auth.user.registered',
  'user.logged_in':                 'auth.user.logged_in',
  'user.logged_out':                'auth.user.logged_out',
  'user.google_oauth':              'auth.user.google_oauth',
  'user.email_verified':            'auth.user.email_verified',
  'user.password_reset_requested':  'auth.user.password_reset_requested',
  'user.password_reset':            'auth.user.password_reset',
  'user.avatar_uploaded':           'auth.user.avatar_uploaded',
  'user.profile_updated':           'auth.user.profile_updated',
};

class RabbitMQClient {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private reconnectDelay = 5000;
  private isConnecting = false;

  async connect(): Promise<void> {
    if (this.isConnecting || this.channel) return;
    this.isConnecting = true;

    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';

    try {
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();

      // Declare topic exchange (durable — survives broker restarts)
      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      // Declare queues and bind routing keys
      await this.channel.assertQueue(QUEUES.AUTH_EVENTS, { durable: true });
      await this.channel.assertQueue(QUEUES.NOTIFICATION_SERVICE, { durable: true });
      await this.channel.assertQueue(QUEUES.USER_SERVICE, { durable: true });

      // Bind queues to exchange
      await this.channel.bindQueue(QUEUES.AUTH_EVENTS, EXCHANGE, 'auth.#');
      await this.channel.bindQueue(QUEUES.NOTIFICATION_SERVICE, EXCHANGE, 'auth.user.registered');
      await this.channel.bindQueue(QUEUES.NOTIFICATION_SERVICE, EXCHANGE, 'auth.user.password_reset_requested');
      await this.channel.bindQueue(QUEUES.USER_SERVICE, EXCHANGE, 'auth.user.registered');
      await this.channel.bindQueue(QUEUES.USER_SERVICE, EXCHANGE, 'auth.user.profile_updated');
      await this.channel.bindQueue(QUEUES.USER_SERVICE, EXCHANGE, 'auth.user.avatar_uploaded');

      // Prefetch 10 messages at a time
      await this.channel.prefetch(10);

      this.isConnecting = false;
      console.log('✅ RabbitMQ connected and exchange/queues ready');

      // Graceful reconnect on close
      this.connection.on('close', () => {
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
        console.warn(`⚠️  RabbitMQ connection closed. Reconnecting in ${this.reconnectDelay / 1000}s...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      this.connection.on('error', (err: Error) => {
        console.error('RabbitMQ connection error:', err.message);
      });
    } catch (err) {
      this.isConnecting = false;
      console.error('❌ RabbitMQ connection failed:', (err as Error).message);
      console.warn(`Retrying in ${this.reconnectDelay / 1000}s...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  /**
   * Publish an event to the topic exchange
   */
  async publish<T extends Record<string, unknown>>(
    eventType: AuthEventType,
    data: T
  ): Promise<boolean> {
    if (!this.channel) {
      console.warn('RabbitMQ channel not ready — event dropped:', eventType);
      return false;
    }

    const routingKey = ROUTING_KEYS[eventType];
    const event: AuthEvent<T> = {
      event: eventType,
      timestamp: new Date().toISOString(),
      serviceSource: 'auth-service',
      data,
    };

    try {
      const buffer = Buffer.from(JSON.stringify(event));
      this.channel.publish(EXCHANGE, routingKey, buffer, {
        persistent: true,                 // survives broker restart
        contentType: 'application/json',
        headers: { 'x-service': 'auth-service' },
      });
      console.log(`📤 RabbitMQ event published: ${routingKey}`);
      return true;
    } catch (err) {
      console.error('RabbitMQ publish error:', (err as Error).message);
      return false;
    }
  }

  /**
   * Subscribe to a queue (for consuming events in this service)
   */
  async subscribe(
    queue: string,
    handler: (event: AuthEvent) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialised.');
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const event: AuthEvent = JSON.parse(msg.content.toString());
        await handler(event);
        this.channel!.ack(msg);
      } catch (err) {
        console.error('RabbitMQ consume error:', (err as Error).message);
        // Requeue once, then dead-letter
        this.channel!.nack(msg, false, !msg.fields.redelivered);
      }
    });

    console.log(`👂 RabbitMQ listening on queue: ${queue}`);
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('RabbitMQ connection closed.');
    } catch {
      // ignore close errors
    }
  }

  get isReady(): boolean {
    return !!this.channel;
  }
}

// Singleton
const rabbitMQ = new RabbitMQClient();
export default rabbitMQ;
