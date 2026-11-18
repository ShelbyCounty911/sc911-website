import { BODIES, STATUSES } from './strings.js';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_MATERIALS = 10;
const MAX_HOURS = 12;

const FIELD_NAMES = new Set([
  'body', 'start', 'end', 'status', 'locationName', 'locationAddress',
  'onlineUrl', 'recordingUrl', 'noteEn', 'noteEs',
]);
const TOP_NAMES = new Set(['list', 'itemId', 'version', 'approvedBy', 'approvedAt', 'fields', 'files']);
const FILE_NAMES = new Set(['role', 'name', 'contentType', 'base64']);
const ROLES = new Set(['agenda', 'materials', 'minutes']);

/** Parse a SharePoint version like "7.0" into a comparable array. */
export function parseVersion(v) {
  if (typeof v !== 'string' || !/^\d{1,6}(\.\d{1,6})?$/.test(v)) return null;
  return v.split('.').map(Number).concat([0]).slice(0, 2);
}

/** Negative, zero or positive, like a sort comparator. */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  return x[0] - y[0] || x[1] - y[1];
}

function isIsoInstant(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s) && !Number.isNaN(Date.parse(s));
}

function httpsUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && s.length <= 2000 ? u.toString() : null;
  } catch {
    return null;
  }
}

function optionalText(value, max, name, errors) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    errors.push(`${name} must be text`);
    return null;
  }
  const t = value.trim();
  if (t.length > max) errors.push(`${name} is longer than ${max} characters`);
  return t || null;
}

/** Turn an uploaded file name into a safe, readable R2 key segment ending in .pdf. */
export function safeFileName(name) {
  const base = String(name ?? '').split(/[\\/]/).pop().replace(/\.pdf$/i, '');
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 96);
  return `${cleaned || 'document'}.pdf`;
}

function decodeBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Validate a meetings publish payload.
 * Returns { errors: string[] } or { record, files } where files carry decoded bytes.
 */
export function validateMeetingPublish(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { errors: ['Body must be a JSON object'] };

  for (const k of Object.keys(payload)) if (!TOP_NAMES.has(k)) errors.push(`Unknown property: ${k}`);
  if (payload.list !== 'meetings') errors.push('list must be "meetings"');
  if (!Number.isInteger(payload.itemId) || payload.itemId < 1) errors.push('itemId must be a positive integer');
  if (!parseVersion(payload.version)) errors.push('version must look like "7.0"');
  if (!isIsoInstant(payload.approvedAt)) errors.push('approvedAt must be an ISO 8601 date-time with a time zone');
  const approvedBy = optionalText(payload.approvedBy, 200, 'approvedBy', errors);

  const f = payload.fields;
  if (!f || typeof f !== 'object' || Array.isArray(f)) {
    errors.push('fields must be an object');
    return { errors };
  }
  for (const k of Object.keys(f)) if (!FIELD_NAMES.has(k)) errors.push(`Unknown field: ${k}`);

  if (!Object.hasOwn(BODIES, f.body)) errors.push(`body must be one of: ${Object.keys(BODIES).join(', ')}`);
  if (!STATUSES.includes(f.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  if (!isIsoInstant(f.start)) errors.push('start must be an ISO 8601 date-time with a time zone');
  if (!isIsoInstant(f.end)) errors.push('end must be an ISO 8601 date-time with a time zone');
  if (isIsoInstant(f.start) && isIsoInstant(f.end)) {
    const hours = (Date.parse(f.end) - Date.parse(f.start)) / 3_600_000;
    if (hours <= 0) errors.push('end must be after start');
    if (hours > MAX_HOURS) errors.push(`meeting cannot be longer than ${MAX_HOURS} hours`);
  }

  const record = {
    itemId: payload.itemId,
    version: payload.version,
    approvedBy,
    approvedAt: isIsoInstant(payload.approvedAt) ? new Date(payload.approvedAt).toISOString() : null,
    body: f.body,
    status: f.status,
    start: isIsoInstant(f.start) ? new Date(f.start).toISOString() : null,
    end: isIsoInstant(f.end) ? new Date(f.end).toISOString() : null,
    locationName: optionalText(f.locationName, 200, 'locationName', errors),
    locationAddress: optionalText(f.locationAddress, 300, 'locationAddress', errors),
    noteEn: optionalText(f.noteEn, 2000, 'noteEn', errors),
    noteEs: optionalText(f.noteEs, 2000, 'noteEs', errors),
    onlineUrl: null,
    recordingUrl: null,
  };
  for (const [key, name] of [['onlineUrl', 'onlineUrl'], ['recordingUrl', 'recordingUrl']]) {
    if (f[key] === undefined || f[key] === null || f[key] === '') continue;
    record[key] = httpsUrl(f[key]);
    if (!record[key]) errors.push(`${name} must be an https:// link`);
  }

  const files = [];
  const list = payload.files ?? [];
  if (!Array.isArray(list)) errors.push('files must be an array');
  else {
    const counts = { agenda: 0, materials: 0, minutes: 0 };
    list.forEach((file, i) => {
      const where = `files[${i}]`;
      if (!file || typeof file !== 'object') return errors.push(`${where} must be an object`);
      for (const k of Object.keys(file)) if (!FILE_NAMES.has(k)) errors.push(`${where}: unknown property ${k}`);
      if (!ROLES.has(file.role)) return errors.push(`${where}.role must be agenda, materials or minutes`);
      counts[file.role]++;
      if (file.contentType !== 'application/pdf') return errors.push(`${where} must be a PDF (contentType application/pdf)`);
      if (typeof file.base64 !== 'string' || !file.base64) return errors.push(`${where}.base64 is required`);
      if (file.base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 4) return errors.push(`${where} is larger than 25 MB`);
      let bytes;
      try {
        bytes = decodeBase64(file.base64);
      } catch {
        return errors.push(`${where}.base64 is not valid base64`);
      }
      if (bytes.length > MAX_FILE_BYTES) return errors.push(`${where} is larger than 25 MB`);
      const magic = String.fromCharCode(...bytes.subarray(0, 5));
      if (magic !== '%PDF-') return errors.push(`${where} is not a PDF file`);
      files.push({ role: file.role, name: safeFileName(file.name), bytes });
    });
    if (counts.agenda > 1) errors.push('only one agenda file is allowed');
    if (counts.minutes > 1) errors.push('only one minutes file is allowed');
    if (counts.materials > MAX_MATERIALS) errors.push(`no more than ${MAX_MATERIALS} supporting files`);
  }

  return errors.length ? { errors } : { record, files };
}
