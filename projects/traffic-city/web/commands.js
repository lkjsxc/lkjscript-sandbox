// Presentation-side delivery only. Native acknowledgement remains the sole
// authority for an accepted edit. Never replay an uncertain paid action on reconnect.
export class CommandQueue {
  constructor(transmit, {limit = 96, changed = () => {}} = {}) {
    if (typeof transmit !== 'function' || !Number.isInteger(limit) || limit < 1) throw new TypeError('Invalid command queue');
    this.transmit = transmit; this.limit = limit; this.changed = changed;
    this.next = 0; this.ack = 0; this.flight = null; this.waiting = [];
  }
  get size() { return this.waiting.length + Number(this.flight !== null); }
  get items() { return [...(this.flight ? [{...this.flight, delivery: 'sent'}] : []), ...this.waiting.map(item => ({...item, delivery: 'queued'}))]; }
  enqueue(action) {
    if (this.size >= this.limit) return 0;
    const item = Object.freeze({...action, id: ++this.next});
    this.waiting.push(item); this.changed(); this.flush(); return item.id;
  }
  flush() {
    if (this.flight || !this.waiting.length) return;
    this.flight = this.waiting.shift();
    // Install flight before transmission: even synchronous test transports can reply.
    this.transmit(this.flight); this.changed();
  }
  acknowledge(id) {
    if (!Number.isSafeInteger(id) || id < 0) throw new TypeError('Invalid native acknowledgement');
    if (id <= this.ack) return null;
    if (!this.flight || id !== this.flight.id) throw new Error('Native command sequence differs from this connection');
    const item = this.flight; this.flight = null; this.ack = id; this.changed();
    // The caller applies the acknowledged native frame before sending the next action.
    return item;
  }
  reset() {
    const abandoned = this.items;
    this.flight = null; this.waiting = []; this.next = 0; this.ack = 0; this.changed();
    return abandoned;
  }
}

export const mapEdit = op => ['build', 'build-underground', 'build-tunnel', 'build-track', 'build-station', 'build-portal', 'review-remove'].includes(op);
export const cityMutation = op => !['resume', 'view', 'inspect', 'save', 'cancel-review'].includes(op);
