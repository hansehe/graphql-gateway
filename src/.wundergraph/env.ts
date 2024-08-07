require('dotenv').config({ path: ['private.env', '.env'] })
import getenv from "getenv";

export const getEnv = (
  name: string,
  defaultValue: string | undefined = undefined): string | undefined => {
  const value = process.env[name] || defaultValue;

  if (typeof value === 'undefined' && typeof defaultValue !== 'undefined') {
    throw new Error(`Missing environment variable '${name}'`);
  }

  return value ?? undefined;
};

export const getENVArray = (prefix: string): string[] => {
  let result = [];

  let value = getEnv(prefix, undefined);
  if (typeof value === 'string') {
    result.push(value);
  }

  const maxRemoteSchemas = getenv.int("MAX_REMOTE_SCHEMAS", 100);
  for (let i = 0; i < maxRemoteSchemas; i++) {
    let indexKey = `${prefix}_${i}`;
    let value = getEnv(indexKey, undefined);
    if (typeof value === 'string') {
      result.push(value);
    } else {
      break;
    }
  }
  return result;
};
