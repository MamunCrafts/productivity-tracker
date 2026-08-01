import mongoose, { Model, Schema } from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { mongoose?: MongooseCache };

const cached: MongooseCache = (globalForMongoose.mongoose ??= {
  conn: null,
  promise: null,
});

/**
 * Register a model without the stale-schema trap.
 *
 * The plain `mongoose.models.X || mongoose.model(...)` guard exists to avoid
 * `OverwriteModelError` when a model file is re-evaluated by hot reload. But
 * `mongoose.models` lives on the mongoose singleton, which sits on `global`
 * precisely so it survives a reload — so the guard keeps handing back a model
 * compiled from an *older* version of the schema. Any field added since is
 * then silently dropped on write: no error, the value just never lands, and
 * the only cure is killing the Node process.
 *
 * So in development the cached model is dropped first and rebuilt from the
 * schema as it is right now. Saving a file is enough; a restart isn't. In
 * production nothing is ever re-evaluated, so the cache is kept as-is.
 */
export function registerModel<T>(name: string, schema: Schema<T>): Model<T> {
  if (process.env.NODE_ENV !== 'production' && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return (
    (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema)
  );
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
