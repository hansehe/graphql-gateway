try {
  require('dotenv').config();
} catch (err) { }

export const getENV = (name, defaultValue) => {
  const value = process.env[name] || defaultValue;

  if (typeof value === 'undefined' && typeof defaultValue !== 'undefined') {
    throw new Error(`Missing environment variable '${name}'`);
  }

  return value;
};

export const getENVArray = prefix => {
  let result = [
    'http://localhost:5000/graphql',
    'http://localhost:8003/graphql'
  ];
  return result;

  let value = getENV(prefix, null);
  if (typeof value === 'string') {
    result.push(value);
  }

  const maxRemoteSchemas = parseInt(getENV("MAX_REMOTE_SCHEMAS", '100'))
  for (let i = 0; i < maxRemoteSchemas; i++) {
    let indexKey = `${prefix}_${i}`;
    let value = getENV(indexKey, null);
    if (typeof value === 'string') {
      result.push(value);
    } else {
      break;
    }
  }
  return result;
};
