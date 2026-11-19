export class MemoryStore {
  constructor() {
    this.entries = new Map();
    this.version = 0;
  }
  async get(key, { type = "text" } = {}) {
    const item = this.entries.get(key);
    if (!item) return null;
    if (type === "json") return structuredClone(item.data);
    if (type === "arrayBuffer") {
      const bytes = Buffer.from(item.data);
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    }
    return item.data;
  }
  async getWithMetadata(key, options) {
    const data = await this.get(key, options);
    return data === null
      ? null
      : {
          data,
          etag: this.entries.get(key).etag,
          metadata: this.entries.get(key).metadata,
        };
  }
  async set(key, data, options = {}) {
    const current = this.entries.get(key);
    if (
      (options.onlyIfNew && current) ||
      (options.onlyIfMatch && current?.etag !== options.onlyIfMatch)
    )
      return { modified: false };
    const etag = String(++this.version);
    this.entries.set(key, {
      data: structuredClone(data),
      etag,
      metadata: options.metadata || {},
    });
    return { modified: true, etag };
  }
  async setJSON(key, data, options) {
    return this.set(key, data, options);
  }
  async list({ prefix = "" }) {
    return {
      blobs: [...this.entries.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key })),
    };
  }
  async delete(key) {
    this.entries.delete(key);
  }
}
