try {
  require('dotenv').config();
} catch (err) {}

export const getENV = (name, defaultValue) => {
  const value = process.env[name] || defaultValue;

  if (typeof value === 'undefined' && typeof defaultValue !== 'undefined') {
    throw new Error(`Missing environment varialbe '${name}'`);
  }

  return value;
};

export const getENVArray = prefix => {
  let result = [];

  let value = getENV(prefix, null);
  if (typeof value === 'string') {
    result.push(value);
  }

  for (let i = 0; i < 100; i++) {
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
