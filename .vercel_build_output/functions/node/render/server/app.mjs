import {randomBytes, createHash} from "crypto";
import http from "http";
import https from "https";
import zlib from "zlib";
import Stream, {PassThrough, pipeline} from "stream";
import {types} from "util";
import {format, parse as parse$1, resolve, URLSearchParams as URLSearchParams$1} from "url";
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a2, b2) {
    return b2[1] - a2[1];
  }).forEach(function(entry, i2) {
    names.set(entry[0], getName(i2));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v2, i2) {
          return i2 in thing ? stringify(v2) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v2, i2) {
            statements_1.push(name + "[" + i2 + "]=" + stringify(v2));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v2) {
            return "add(" + stringify(v2) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k2 = _a[0], v2 = _a[1];
            return "set(" + stringify(k2) + ", " + stringify(v2) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c2) {
  return escaped$1[c2] || c2;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i2 = 0; i2 < str.length; i2 += 1) {
    var char = str.charAt(i2);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i2 + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i2];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i2 = 1; i2 < meta.length; i2++) {
    if (meta[i2] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i2]}`;
      if (meta[i2].indexOf("charset=") === 0) {
        charset = meta[i2].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
var src = dataUriToBuffer;
const {Readable} = Stream;
const wm = new WeakMap();
async function* read(parts) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else {
      yield part;
    }
  }
}
class Blob {
  constructor(blobParts = [], options = {type: ""}) {
    let size = 0;
    const parts = blobParts.map((element) => {
      let buffer;
      if (element instanceof Buffer) {
        buffer = element;
      } else if (ArrayBuffer.isView(element)) {
        buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
      } else if (element instanceof ArrayBuffer) {
        buffer = Buffer.from(element);
      } else if (element instanceof Blob) {
        buffer = element;
      } else {
        buffer = Buffer.from(typeof element === "string" ? element : String(element));
      }
      size += buffer.length || buffer.size || 0;
      return buffer;
    });
    const type = options.type === void 0 ? "" : String(options.type).toLowerCase();
    wm.set(this, {
      type: /[^\u0020-\u007E]/.test(type) ? "" : type,
      size,
      parts
    });
  }
  get size() {
    return wm.get(this).size;
  }
  get type() {
    return wm.get(this).type;
  }
  async text() {
    return Buffer.from(await this.arrayBuffer()).toString();
  }
  async arrayBuffer() {
    const data = new Uint8Array(this.size);
    let offset = 0;
    for await (const chunk of this.stream()) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    return data.buffer;
  }
  stream() {
    return Readable.from(read(wm.get(this).parts));
  }
  slice(start = 0, end = this.size, type = "") {
    const {size} = this;
    let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
    let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
    const span = Math.max(relativeEnd - relativeStart, 0);
    const parts = wm.get(this).parts.values();
    const blobParts = [];
    let added = 0;
    for (const part of parts) {
      const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
      if (relativeStart && size2 <= relativeStart) {
        relativeStart -= size2;
        relativeEnd -= size2;
      } else {
        const chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
        blobParts.push(chunk);
        added += ArrayBuffer.isView(chunk) ? chunk.byteLength : chunk.size;
        relativeStart = 0;
        if (added >= span) {
          break;
        }
      }
    }
    const blob = new Blob([], {type});
    Object.assign(wm.get(blob), {size: span, parts: blobParts});
    return blob;
  }
  get [Symbol.toStringTag]() {
    return "Blob";
  }
  static [Symbol.hasInstance](object) {
    return typeof object === "object" && typeof object.stream === "function" && object.stream.length === 0 && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
  }
}
Object.defineProperties(Blob.prototype, {
  size: {enumerable: true},
  type: {enumerable: true},
  slice: {enumerable: true}
});
var fetchBlob = Blob;
class FetchBaseError extends Error {
  constructor(message, type) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.type = type;
  }
  get name() {
    return this.constructor.name;
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
}
class FetchError extends FetchBaseError {
  constructor(message, type, systemError) {
    super(message, type);
    if (systemError) {
      this.code = this.errno = systemError.code;
      this.erroredSysCall = systemError.syscall;
    }
  }
}
const NAME = Symbol.toStringTag;
const isURLSearchParameters = (object) => {
  return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
};
const isBlob = (object) => {
  return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
};
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
const isAbortSignal = (object) => {
  return typeof object === "object" && object[NAME] === "AbortSignal";
};
const carriage = "\r\n";
const dashes = "-".repeat(2);
const carriageLength = Buffer.byteLength(carriage);
const getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
const getBoundary = () => randomBytes(8).toString("hex");
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    if (isBlob(value)) {
      length += value.size;
    } else {
      length += Buffer.byteLength(String(value));
    }
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
const INTERNALS$2 = Symbol("Body internals");
class Body {
  constructor(body, {
    size = 0
  } = {}) {
    let boundary = null;
    if (body === null) {
      body = null;
    } else if (isURLSearchParameters(body)) {
      body = Buffer.from(body.toString());
    } else if (isBlob(body))
      ;
    else if (Buffer.isBuffer(body))
      ;
    else if (types.isAnyArrayBuffer(body)) {
      body = Buffer.from(body);
    } else if (ArrayBuffer.isView(body)) {
      body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    } else if (body instanceof Stream)
      ;
    else if (isFormData(body)) {
      boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
      body = Stream.Readable.from(formDataIterator(body, boundary));
    } else {
      body = Buffer.from(String(body));
    }
    this[INTERNALS$2] = {
      body,
      boundary,
      disturbed: false,
      error: null
    };
    this.size = size;
    if (body instanceof Stream) {
      body.on("error", (err) => {
        const error2 = err instanceof FetchBaseError ? err : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${err.message}`, "system", err);
        this[INTERNALS$2].error = error2;
      });
    }
  }
  get body() {
    return this[INTERNALS$2].body;
  }
  get bodyUsed() {
    return this[INTERNALS$2].disturbed;
  }
  async arrayBuffer() {
    const {buffer, byteOffset, byteLength} = await consumeBody(this);
    return buffer.slice(byteOffset, byteOffset + byteLength);
  }
  async blob() {
    const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
    const buf = await this.buffer();
    return new fetchBlob([buf], {
      type: ct
    });
  }
  async json() {
    const buffer = await consumeBody(this);
    return JSON.parse(buffer.toString());
  }
  async text() {
    const buffer = await consumeBody(this);
    return buffer.toString();
  }
  buffer() {
    return consumeBody(this);
  }
}
Object.defineProperties(Body.prototype, {
  body: {enumerable: true},
  bodyUsed: {enumerable: true},
  arrayBuffer: {enumerable: true},
  blob: {enumerable: true},
  json: {enumerable: true},
  text: {enumerable: true}
});
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let {body} = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = body.stream();
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof Stream)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const err = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(err);
        throw err;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    if (error2 instanceof FetchBaseError) {
      throw error2;
    } else {
      throw new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    }
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c2) => typeof c2 === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
const clone = (instance, highWaterMark) => {
  let p1;
  let p2;
  let {body} = instance;
  if (instance.bodyUsed) {
    throw new Error("cannot clone body after it is used");
  }
  if (body instanceof Stream && typeof body.getBoundary !== "function") {
    p1 = new PassThrough({highWaterMark});
    p2 = new PassThrough({highWaterMark});
    body.pipe(p1);
    body.pipe(p2);
    instance[INTERNALS$2].body = p1;
    body = p2;
  }
  return body;
};
const extractContentType = (body, request) => {
  if (body === null) {
    return null;
  }
  if (typeof body === "string") {
    return "text/plain;charset=UTF-8";
  }
  if (isURLSearchParameters(body)) {
    return "application/x-www-form-urlencoded;charset=UTF-8";
  }
  if (isBlob(body)) {
    return body.type || null;
  }
  if (Buffer.isBuffer(body) || types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
    return null;
  }
  if (body && typeof body.getBoundary === "function") {
    return `multipart/form-data;boundary=${body.getBoundary()}`;
  }
  if (isFormData(body)) {
    return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
  }
  if (body instanceof Stream) {
    return null;
  }
  return "text/plain;charset=UTF-8";
};
const getTotalBytes = (request) => {
  const {body} = request;
  if (body === null) {
    return 0;
  }
  if (isBlob(body)) {
    return body.size;
  }
  if (Buffer.isBuffer(body)) {
    return body.length;
  }
  if (body && typeof body.getLengthSync === "function") {
    return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
  }
  if (isFormData(body)) {
    return getFormDataLength(request[INTERNALS$2].boundary);
  }
  return null;
};
const writeToStream = (dest, {body}) => {
  if (body === null) {
    dest.end();
  } else if (isBlob(body)) {
    body.stream().pipe(dest);
  } else if (Buffer.isBuffer(body)) {
    dest.write(body);
    dest.end();
  } else {
    body.pipe(dest);
  }
};
const validateHeaderName = typeof http.validateHeaderName === "function" ? http.validateHeaderName : (name) => {
  if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
    const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
    Object.defineProperty(err, "code", {value: "ERR_INVALID_HTTP_TOKEN"});
    throw err;
  }
};
const validateHeaderValue = typeof http.validateHeaderValue === "function" ? http.validateHeaderValue : (name, value) => {
  if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
    const err = new TypeError(`Invalid character in header content ["${name}"]`);
    Object.defineProperty(err, "code", {value: "ERR_INVALID_CHAR"});
    throw err;
  }
};
class Headers extends URLSearchParams {
  constructor(init2) {
    let result = [];
    if (init2 instanceof Headers) {
      const raw = init2.raw();
      for (const [name, values] of Object.entries(raw)) {
        result.push(...values.map((value) => [name, value]));
      }
    } else if (init2 == null)
      ;
    else if (typeof init2 === "object" && !types.isBoxedPrimitive(init2)) {
      const method = init2[Symbol.iterator];
      if (method == null) {
        result.push(...Object.entries(init2));
      } else {
        if (typeof method !== "function") {
          throw new TypeError("Header pairs must be iterable");
        }
        result = [...init2].map((pair) => {
          if (typeof pair !== "object" || types.isBoxedPrimitive(pair)) {
            throw new TypeError("Each header pair must be an iterable object");
          }
          return [...pair];
        }).map((pair) => {
          if (pair.length !== 2) {
            throw new TypeError("Each header pair must be a name/value tuple");
          }
          return [...pair];
        });
      }
    } else {
      throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
    }
    result = result.length > 0 ? result.map(([name, value]) => {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return [String(name).toLowerCase(), String(value)];
    }) : void 0;
    super(result);
    return new Proxy(this, {
      get(target, p2, receiver) {
        switch (p2) {
          case "append":
          case "set":
            return (name, value) => {
              validateHeaderName(name);
              validateHeaderValue(name, String(value));
              return URLSearchParams.prototype[p2].call(receiver, String(name).toLowerCase(), String(value));
            };
          case "delete":
          case "has":
          case "getAll":
            return (name) => {
              validateHeaderName(name);
              return URLSearchParams.prototype[p2].call(receiver, String(name).toLowerCase());
            };
          case "keys":
            return () => {
              target.sort();
              return new Set(URLSearchParams.prototype.keys.call(target)).keys();
            };
          default:
            return Reflect.get(target, p2, receiver);
        }
      }
    });
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  toString() {
    return Object.prototype.toString.call(this);
  }
  get(name) {
    const values = this.getAll(name);
    if (values.length === 0) {
      return null;
    }
    let value = values.join(", ");
    if (/^content-encoding$/i.test(name)) {
      value = value.toLowerCase();
    }
    return value;
  }
  forEach(callback) {
    for (const name of this.keys()) {
      callback(this.get(name), name);
    }
  }
  *values() {
    for (const name of this.keys()) {
      yield this.get(name);
    }
  }
  *entries() {
    for (const name of this.keys()) {
      yield [name, this.get(name)];
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  raw() {
    return [...this.keys()].reduce((result, key) => {
      result[key] = this.getAll(key);
      return result;
    }, {});
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this.keys()].reduce((result, key) => {
      const values = this.getAll(key);
      if (key === "host") {
        result[key] = values[0];
      } else {
        result[key] = values.length > 1 ? values : values[0];
      }
      return result;
    }, {});
  }
}
Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
  result[property] = {enumerable: true};
  return result;
}, {}));
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch (e2) {
      return false;
    }
  }));
}
const redirectStatus = new Set([301, 302, 303, 307, 308]);
const isRedirect = (code) => {
  return redirectStatus.has(code);
};
const INTERNALS$1 = Symbol("Response internals");
class Response extends Body {
  constructor(body = null, options = {}) {
    super(body, options);
    const status = options.status || 200;
    const headers = new Headers(options.headers);
    if (body !== null && !headers.has("Content-Type")) {
      const contentType = extractContentType(body);
      if (contentType) {
        headers.append("Content-Type", contentType);
      }
    }
    this[INTERNALS$1] = {
      url: options.url,
      status,
      statusText: options.statusText || "",
      headers,
      counter: options.counter,
      highWaterMark: options.highWaterMark
    };
  }
  get url() {
    return this[INTERNALS$1].url || "";
  }
  get status() {
    return this[INTERNALS$1].status;
  }
  get ok() {
    return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
  }
  get redirected() {
    return this[INTERNALS$1].counter > 0;
  }
  get statusText() {
    return this[INTERNALS$1].statusText;
  }
  get headers() {
    return this[INTERNALS$1].headers;
  }
  get highWaterMark() {
    return this[INTERNALS$1].highWaterMark;
  }
  clone() {
    return new Response(clone(this, this.highWaterMark), {
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      ok: this.ok,
      redirected: this.redirected,
      size: this.size
    });
  }
  static redirect(url, status = 302) {
    if (!isRedirect(status)) {
      throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
    }
    return new Response(null, {
      headers: {
        location: new URL(url).toString()
      },
      status
    });
  }
  get [Symbol.toStringTag]() {
    return "Response";
  }
}
Object.defineProperties(Response.prototype, {
  url: {enumerable: true},
  status: {enumerable: true},
  ok: {enumerable: true},
  redirected: {enumerable: true},
  statusText: {enumerable: true},
  headers: {enumerable: true},
  clone: {enumerable: true}
});
const getSearch = (parsedURL) => {
  if (parsedURL.search) {
    return parsedURL.search;
  }
  const lastOffset = parsedURL.href.length - 1;
  const hash = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
  return parsedURL.href[lastOffset - hash.length] === "?" ? "?" : "";
};
const INTERNALS = Symbol("Request internals");
const isRequest = (object) => {
  return typeof object === "object" && typeof object[INTERNALS] === "object";
};
class Request extends Body {
  constructor(input, init2 = {}) {
    let parsedURL;
    if (isRequest(input)) {
      parsedURL = new URL(input.url);
    } else {
      parsedURL = new URL(input);
      input = {};
    }
    let method = init2.method || input.method || "GET";
    method = method.toUpperCase();
    if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
      throw new TypeError("Request with GET/HEAD method cannot have body");
    }
    const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
    super(inputBody, {
      size: init2.size || input.size || 0
    });
    const headers = new Headers(init2.headers || input.headers || {});
    if (inputBody !== null && !headers.has("Content-Type")) {
      const contentType = extractContentType(inputBody, this);
      if (contentType) {
        headers.append("Content-Type", contentType);
      }
    }
    let signal = isRequest(input) ? input.signal : null;
    if ("signal" in init2) {
      signal = init2.signal;
    }
    if (signal !== null && !isAbortSignal(signal)) {
      throw new TypeError("Expected signal to be an instanceof AbortSignal");
    }
    this[INTERNALS] = {
      method,
      redirect: init2.redirect || input.redirect || "follow",
      headers,
      parsedURL,
      signal
    };
    this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
    this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
    this.counter = init2.counter || input.counter || 0;
    this.agent = init2.agent || input.agent;
    this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
    this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
  }
  get method() {
    return this[INTERNALS].method;
  }
  get url() {
    return format(this[INTERNALS].parsedURL);
  }
  get headers() {
    return this[INTERNALS].headers;
  }
  get redirect() {
    return this[INTERNALS].redirect;
  }
  get signal() {
    return this[INTERNALS].signal;
  }
  clone() {
    return new Request(this);
  }
  get [Symbol.toStringTag]() {
    return "Request";
  }
}
Object.defineProperties(Request.prototype, {
  method: {enumerable: true},
  url: {enumerable: true},
  headers: {enumerable: true},
  redirect: {enumerable: true},
  clone: {enumerable: true},
  signal: {enumerable: true}
});
const getNodeRequestOptions = (request) => {
  const {parsedURL} = request[INTERNALS];
  const headers = new Headers(request[INTERNALS].headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "*/*");
  }
  let contentLengthValue = null;
  if (request.body === null && /^(post|put)$/i.test(request.method)) {
    contentLengthValue = "0";
  }
  if (request.body !== null) {
    const totalBytes = getTotalBytes(request);
    if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
      contentLengthValue = String(totalBytes);
    }
  }
  if (contentLengthValue) {
    headers.set("Content-Length", contentLengthValue);
  }
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "node-fetch");
  }
  if (request.compress && !headers.has("Accept-Encoding")) {
    headers.set("Accept-Encoding", "gzip,deflate,br");
  }
  let {agent} = request;
  if (typeof agent === "function") {
    agent = agent(parsedURL);
  }
  if (!headers.has("Connection") && !agent) {
    headers.set("Connection", "close");
  }
  const search = getSearch(parsedURL);
  const requestOptions = {
    path: parsedURL.pathname + search,
    pathname: parsedURL.pathname,
    hostname: parsedURL.hostname,
    protocol: parsedURL.protocol,
    port: parsedURL.port,
    hash: parsedURL.hash,
    search: parsedURL.search,
    query: parsedURL.query,
    href: parsedURL.href,
    method: request.method,
    headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
    insecureHTTPParser: request.insecureHTTPParser,
    agent
  };
  return requestOptions;
};
class AbortError extends FetchBaseError {
  constructor(message, type = "aborted") {
    super(message, type);
  }
}
const supportedSchemas = new Set(["data:", "http:", "https:"]);
async function fetch$1(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options.protocol === "data:") {
      const data = src(request.url);
      const response2 = new Response(data, {headers: {"Content-Type": data.typeFull}});
      resolve2(response2);
      return;
    }
    const send = (options.protocol === "https:" ? https : http).request;
    const {signal} = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof Stream.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (err) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, "system", err));
      finalize();
    });
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              try {
                headers.set("Location", locationURL);
              } catch (error2) {
                reject(error2);
              }
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof Stream.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch$1(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
        }
      }
      response_.once("end", () => {
        if (signal) {
          signal.removeEventListener("abort", abortAndFinalize);
        }
      });
      let body = pipeline(response_, new PassThrough(), (error2) => {
        reject(error2);
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: zlib.Z_SYNC_FLUSH,
        finishFlush: zlib.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = pipeline(body, zlib.createGunzip(zlibOptions), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = pipeline(response_, new PassThrough(), (error2) => {
          reject(error2);
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = pipeline(body, zlib.createInflate(), (error2) => {
              reject(error2);
            });
          } else {
            body = pipeline(body, zlib.createInflateRaw(), (error2) => {
              reject(error2);
            });
          }
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = pipeline(body, zlib.createBrotliDecompress(), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
function noop$1() {
}
function safe_not_equal$1(a2, b2) {
  return a2 != a2 ? b2 == b2 : a2 !== b2 || (a2 && typeof a2 === "object" || typeof a2 === "function");
}
const subscriber_queue$1 = [];
function writable$1(value, start = noop$1) {
  let stop;
  const subscribers = [];
  function set(new_value) {
    if (safe_not_equal$1(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue$1.length;
        for (let i2 = 0; i2 < subscribers.length; i2 += 1) {
          const s2 = subscribers[i2];
          s2[1]();
          subscriber_queue$1.push(s2, value);
        }
        if (run_queue) {
          for (let i2 = 0; i2 < subscriber_queue$1.length; i2 += 2) {
            subscriber_queue$1[i2][0](subscriber_queue$1[i2 + 1]);
          }
          subscriber_queue$1.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      stop = start(set) || noop$1;
    }
    run2(value);
    return () => {
      const index2 = subscribers.indexOf(subscriber);
      if (index2 !== -1) {
        subscribers.splice(index2, 1);
      }
      if (subscribers.length === 0) {
        stop();
        stop = null;
      }
    };
  }
  return {set, update, subscribe: subscribe2};
}
function normalize(loaded) {
  if (loaded.error) {
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    const status = loaded.status;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return {status: 500, error: error2};
    }
    return {status, error: error2};
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
const s$1 = JSON.stringify;
async function get_response({request, options, $session, route, status = 200, error: error2}) {
  const dependencies = {};
  const serialized_session = try_serialize($session, (error3) => {
    throw new Error(`Failed to serialize session data: ${error3.message}`);
  });
  const serialized_data = [];
  const match = route && route.pattern.exec(request.path);
  const params = route && route.params(match);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  let uses_credentials = false;
  const fetcher = async (resource, opts = {}) => {
    let url;
    if (typeof resource === "string") {
      url = resource;
    } else {
      url = resource.url;
      opts = {
        method: resource.method,
        headers: resource.headers,
        body: resource.body,
        mode: resource.mode,
        credentials: resource.credentials,
        cache: resource.cache,
        redirect: resource.redirect,
        referrer: resource.referrer,
        integrity: resource.integrity,
        ...opts
      };
    }
    if (options.local && url.startsWith(options.paths.assets)) {
      url = url.replace(options.paths.assets, "");
    }
    const parsed = parse$1(url);
    if (opts.credentials !== "omit") {
      uses_credentials = true;
    }
    let response;
    if (parsed.protocol) {
      response = await fetch$1(parsed.href, opts);
    } else {
      const resolved = resolve(request.path, parsed.pathname);
      const filename = resolved.slice(1);
      const filename_html = `${filename}/index.html`;
      const asset = options.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
      if (asset) {
        if (options.get_static_file) {
          response = new Response(options.get_static_file(asset.file), {
            headers: {
              "content-type": asset.type
            }
          });
        } else {
          response = await fetch$1(`http://${page2.host}/${asset.file}`, opts);
        }
      }
      if (!response) {
        const rendered2 = await ssr({
          host: request.host,
          method: opts.method || "GET",
          headers: opts.headers || {},
          path: resolved,
          body: opts.body,
          query: new URLSearchParams$1(parsed.query || "")
        }, {
          ...options,
          fetched: url,
          initiator: route
        });
        if (rendered2) {
          dependencies[resolved] = rendered2;
          response = new Response(rendered2.body, {
            status: rendered2.status,
            headers: rendered2.headers
          });
        }
      }
    }
    if (response) {
      const headers2 = {};
      response.headers.forEach((value, key) => {
        if (key !== "etag")
          headers2[key] = value;
      });
      const inline = {
        url,
        payload: {
          status: response.status,
          statusText: response.statusText,
          headers: headers2,
          body: null
        }
      };
      const proxy = new Proxy(response, {
        get(response2, key, receiver) {
          if (key === "text") {
            return async () => {
              const text = await response2.text();
              inline.payload.body = text;
              serialized_data.push(inline);
              return text;
            };
          }
          if (key === "json") {
            return async () => {
              const json = await response2.json();
              inline.payload.body = s$1(json);
              serialized_data.push(inline);
              return json;
            };
          }
          return Reflect.get(response2, key, receiver);
        }
      });
      return proxy;
    }
    return new Response("Not found", {
      status: 404
    });
  };
  const component_promises = error2 ? [options.manifest.layout()] : [options.manifest.layout(), ...route.parts.map((part) => part.load())];
  const components2 = [];
  const props_promises = [];
  let context = {};
  let maxage;
  if (options.only_render_prerenderable_pages) {
    if (error2)
      return;
    const mod = await component_promises[component_promises.length - 1];
    if (!mod.prerender)
      return;
  }
  for (let i2 = 0; i2 < component_promises.length; i2 += 1) {
    let loaded;
    try {
      const mod = await component_promises[i2];
      components2[i2] = mod.default;
      if (mod.preload) {
        throw new Error("preload has been deprecated in favour of load. Please consult the documentation: https://kit.svelte.dev/docs#load");
      }
      if (mod.load) {
        loaded = await mod.load.call(null, {
          page: page2,
          get session() {
            uses_credentials = true;
            return $session;
          },
          fetch: fetcher,
          context: {...context}
        });
        if (!loaded)
          return;
      }
    } catch (e2) {
      if (error2)
        throw e2 instanceof Error ? e2 : new Error(e2);
      loaded = {
        error: e2 instanceof Error ? e2 : {name: "Error", message: e2.toString()},
        status: 500
      };
    }
    if (loaded) {
      loaded = normalize(loaded);
      if (loaded.error) {
        return await get_response({
          request,
          options,
          $session,
          route,
          status: loaded.status,
          error: loaded.error
        });
      }
      if (loaded.redirect) {
        return {
          status: loaded.status,
          headers: {
            location: loaded.redirect
          }
        };
      }
      if (loaded.context) {
        context = {
          ...context,
          ...loaded.context
        };
      }
      maxage = loaded.maxage || 0;
      props_promises[i2] = loaded.props;
    }
  }
  const session = writable$1($session);
  let session_tracking_active = false;
  const unsubscribe = session.subscribe(() => {
    if (session_tracking_active)
      uses_credentials = true;
  });
  session_tracking_active = true;
  if (error2) {
    if (options.dev) {
      error2.stack = await options.get_stack(error2);
    } else {
      error2.stack = String(error2);
    }
  }
  const props = {
    status,
    error: error2,
    stores: {
      page: writable$1(null),
      navigating: writable$1(null),
      session
    },
    page: page2,
    components: components2
  };
  for (let i2 = 0; i2 < props_promises.length; i2 += 1) {
    props[`props_${i2}`] = await props_promises[i2];
  }
  let rendered;
  try {
    rendered = options.root.render(props);
  } catch (e2) {
    if (error2)
      throw e2 instanceof Error ? e2 : new Error(e2);
    return await get_response({
      request,
      options,
      $session,
      route,
      status: 500,
      error: e2 instanceof Error ? e2 : {name: "Error", message: e2.toString()}
    });
  }
  unsubscribe();
  const js_deps = route ? route.js : [];
  const css_deps = route ? route.css : [];
  const style = route ? route.style : "";
  const prefix = `${options.paths.assets}/${options.app_dir}`;
  const links = options.amp ? `<style amp-custom>${style || (await Promise.all(css_deps.map((dep) => options.get_amp_css(dep)))).join("\n")}</style>` : [
    ...js_deps.map((dep) => `<link rel="modulepreload" href="${prefix}/${dep}">`),
    ...css_deps.map((dep) => `<link rel="stylesheet" href="${prefix}/${dep}">`)
  ].join("\n			");
  const init2 = options.amp ? `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"></script>` : `
		<script type="module">
			import { start } from ${s$1(options.entry)};
			start({
				target: ${options.target ? `document.querySelector(${s$1(options.target)})` : "document.body"},
				paths: ${s$1(options.paths)},
				status: ${status},
				error: ${serialize_error(error2)},
				session: ${serialized_session},
				nodes: [
					${(route ? route.parts : []).map((part) => `import(${s$1(options.get_component_path(part.id))})`).join(",\n					")}
				],
				page: {
					host: ${s$1(request.host || "location.host")},
					path: ${s$1(request.path)},
					query: new URLSearchParams(${s$1(request.query.toString())}),
					params: ${s$1(params)}
				}
			});
		</script>`;
  const head = [
    rendered.head,
    style && !options.amp ? `<style data-svelte>${style}</style>` : "",
    links,
    init2
  ].join("\n\n");
  const body = options.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({url, payload}) => `<script type="svelte-data" url="${url}">${s$1(payload)}</script>`).join("\n\n			")}
		`.replace(/^\t{2}/gm, "");
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${uses_credentials ? "private" : "public"}, max-age=${maxage}`;
  }
  return {
    status,
    headers,
    body: options.template({head, body}),
    dependencies
  };
}
async function render_page(request, route, options) {
  if (options.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const $session = await options.hooks.getSession({context: request.context});
  const response = await get_response({
    request,
    options,
    $session,
    route,
    status: route ? 200 : 404,
    error: route ? null : new Error(`Not found: ${request.path}`)
  });
  if (response) {
    return response;
  }
  if (options.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${options.fetched}`
    };
  }
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(err);
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const {name, message, stack} = error2;
    serialized = try_serialize({name, message, stack});
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
async function render_route(request, route) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (handler) {
    const match = route.pattern.exec(request.path);
    const params = route.params(match);
    const response = await handler({...request, params});
    if (response) {
      if (typeof response !== "object" || response.body == null) {
        return {
          status: 500,
          body: `Invalid response from route ${request.path}; ${response.body == null ? "body is missing" : `expected an object, got ${typeof response}`}`,
          headers: {}
        };
      }
      let {status = 200, body, headers = {}} = response;
      headers = lowercase_keys(headers);
      if (typeof body === "object" && !("content-type" in headers) || headers["content-type"] === "application/json") {
        headers = {...headers, "content-type": "application/json"};
        body = JSON.stringify(body);
      }
      return {status, body, headers};
    }
  }
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function md5(body) {
  return createHash("md5").update(body).digest("hex");
}
async function ssr(incoming, options) {
  if (incoming.path.endsWith("/") && incoming.path !== "/") {
    const q2 = incoming.query.toString();
    return {
      status: 301,
      headers: {
        location: incoming.path.slice(0, -1) + (q2 ? `?${q2}` : "")
      }
    };
  }
  const context = await options.hooks.getContext(incoming) || {};
  try {
    return await options.hooks.handle({
      ...incoming,
      params: null,
      context
    }, async (request) => {
      for (const route of options.manifest.routes) {
        if (!route.pattern.test(request.path))
          continue;
        const response = route.type === "endpoint" ? await render_route(request, route) : await render_page(request, route, options);
        if (response) {
          if (response.status === 200) {
            if (!/(no-store|immutable)/.test(response.headers["cache-control"])) {
              const etag = `"${md5(response.body)}"`;
              if (request.headers["if-none-match"] === etag) {
                return {
                  status: 304,
                  headers: {},
                  body: null
                };
              }
              response.headers["etag"] = etag;
            }
          }
          return response;
        }
      }
      return await render_page(request, null, options);
    });
  } catch (e2) {
    if (e2 && e2.stack) {
      e2.stack = await options.get_stack(e2);
    }
    console.error(e2 && e2.stack || e2);
    return {
      status: 500,
      headers: {},
      body: options.dev ? e2.stack : e2.message
    };
  }
}
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function safe_not_equal(a2, b2) {
  return a2 != a2 ? b2 == b2 : a2 !== b2 || (a2 && typeof a2 === "object" || typeof a2 === "function");
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function null_to_empty(value) {
  return value == null ? "" : value;
}
function set_store_value(store, ret, value = ret) {
  store.set(value);
  return ret;
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
  get_current_component().$$.after_update.push(fn);
}
function onDestroy(fn) {
  get_current_component().$$.on_destroy.push(fn);
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function getContext(key) {
  return get_current_component().$$.context.get(key);
}
const escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i2 = 0; i2 < items.length; i2 += 1) {
    str += fn(items[i2], i2);
  }
  return str;
}
const missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
let on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({$$});
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, options = {}) => {
      on_destroy = [];
      const result = {title: "", head: "", css: new Set()};
      const html = $$render(result, props, {}, options);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function add_classes(classes) {
  return classes ? ` class="${classes}"` : "";
}
const Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {status} = $$props;
  let {error: error2} = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  return `<h1>${escape(status)}</h1>

<p>${escape(error2.message)}</p>


${error2.stack ? `<pre>${escape(error2.stack)}</pre>` : ``}`;
});
var error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Error$1
});
var root_svelte = "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}";
const css$5 = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\timport ErrorComponent from \\"../components/error.svelte\\";\\n\\n\\t// error handling\\n\\texport let status = undefined;\\n\\texport let error = undefined;\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\n\\tconst Layout = components[0];\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title;\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n</script>\\n\\n<Layout {...(props_0 || {})}>\\n\\t{#if error}\\n\\t\\t<ErrorComponent {status} {error}/>\\n\\t{:else}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}/>\\n\\t{/if}\\n</Layout>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\tNavigated to {title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AA0DC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
const Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {status = void 0} = $$props;
  let {error: error2 = void 0} = $$props;
  let {stores} = $$props;
  let {page: page2} = $$props;
  let {components: components2} = $$props;
  let {props_0 = null} = $$props;
  let {props_1 = null} = $$props;
  const Layout = components2[0];
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  let mounted = false;
  let navigated = false;
  let title = null;
  onMount(() => {
    const unsubscribe = stores.page.subscribe(() => {
      if (mounted) {
        navigated = true;
        title = document.title;
      }
    });
    mounted = true;
    return unsubscribe;
  });
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  if ($$props.components === void 0 && $$bindings.components && components2 !== void 0)
    $$bindings.components(components2);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  $$result.css.add(css$5);
  {
    stores.page.set(page2);
  }
  return `


${validate_component(Layout, "Layout").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${error2 ? `${validate_component(Error$1, "ErrorComponent").$$render($$result, {status, error: error2}, {}, {})}` : `${validate_component(components2[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {})}`}`
  })}

${mounted ? `<div id="${"svelte-announcer"}" aria-live="${"assertive"}" aria-atomic="${"true"}" class="${"svelte-1j55zn5"}">${navigated ? `Navigated to ${escape(title)}` : ``}</div>` : ``}`;
});
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
const template = ({head, body}) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.ico" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
function init({paths}) {
}
const d$1 = decodeURIComponent;
const empty = () => ({});
const components = [
  () => Promise.resolve().then(function() {
    return index;
  }),
  () => Promise.resolve().then(function() {
    return _id_;
  }),
  () => Promise.resolve().then(function() {
    return sell;
  })
];
const client_component_lookup = {".svelte/build/runtime/internal/start.js": "start-4beaef89.js", "src/routes/index.svelte": "pages/index.svelte-5fe87a8b.js", "src/routes/products/[id].svelte": "pages/products/[id].svelte-114c3b84.js", "src/routes/sell.svelte": "pages/sell.svelte-9c3c921a.js"};
const manifest = {
  assets: [{file: "favicon.ico", size: 1150, type: "image/vnd.microsoft.icon"}, {file: "radnikanext-medium-webfont.woff2", size: 20012, type: "font/woff2"}, {file: "radnikanext-medium-webfont.woff2:Zone.Identifier", size: 94, type: null}, {file: "robots.txt", size: 67, type: "text/plain"}],
  layout: () => Promise.resolve().then(function() {
    return $layout$1;
  }),
  error: () => Promise.resolve().then(function() {
    return error;
  }),
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      parts: [{id: "src/routes/index.svelte", load: components[0]}],
      css: ["assets/start-1508e355.css"],
      js: ["start-4beaef89.js", "chunks/index-f8cae157.js", "chunks/urql-svelte-300a3fd3.js", "pages/index.svelte-5fe87a8b.js"]
    },
    {
      type: "page",
      pattern: /^\/products\/([^/]+?)\/?$/,
      params: (m2) => ({id: d$1(m2[1])}),
      parts: [{id: "src/routes/products/[id].svelte", load: components[1]}],
      css: ["assets/start-1508e355.css", "assets/pages/products/[id].svelte-9b797c0d.css"],
      js: ["start-4beaef89.js", "chunks/index-f8cae157.js", "chunks/urql-svelte-300a3fd3.js", "pages/products/[id].svelte-114c3b84.js"]
    },
    {
      type: "page",
      pattern: /^\/sell\/?$/,
      params: empty,
      parts: [{id: "src/routes/sell.svelte", load: components[2]}],
      css: ["assets/start-1508e355.css"],
      js: ["start-4beaef89.js", "chunks/index-f8cae157.js", "chunks/urql-svelte-300a3fd3.js", "pages/sell.svelte-9c3c921a.js"]
    }
  ]
};
const get_hooks = (hooks2) => ({
  getContext: hooks2.getContext || (() => ({})),
  getSession: hooks2.getSession || (() => ({})),
  handle: hooks2.handle || ((request, render2) => render2(request))
});
const hooks = get_hooks(user_hooks);
function render(request, {
  paths = {base: "", assets: "/."},
  local = false,
  only_render_prerenderable_pages = false,
  get_static_file
} = {}) {
  return ssr({
    ...request,
    host: request.headers["host"]
  }, {
    paths,
    local,
    template,
    manifest,
    target: "#svelte",
    entry: "/./_app/start-4beaef89.js",
    root: Root,
    hooks,
    dev: false,
    amp: false,
    only_render_prerenderable_pages,
    app_dir: "_app",
    get_component_path: (id) => "/./_app/" + client_component_lookup[id],
    get_stack: (error2) => error2.stack,
    get_static_file,
    get_amp_css: (dep) => amp_css_lookup[dep]
  });
}
const prerender$2 = true;
function load$1() {
  return {redirect: "/products/1"};
}
const Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ``;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Routes,
  prerender: prerender$2,
  load: load$1
});
const prodEndpoint = `https://1565e285cd49.ngrok.io/api/graphql`;
const perPage$1 = 4;
var ErrorMessage_svelte = ".error.svelte-vk4xvw.svelte-vk4xvw{padding:2rem;background:#fff;margin:2rem 0;border:1px solid rgba(0,0,0,.05);border-left:5px solid red}.error.svelte-vk4xvw p.svelte-vk4xvw{margin:0;font-weight:100}.error.svelte-vk4xvw strong.svelte-vk4xvw{margin-right:1rem}";
const css$4 = {
  code: ".error.svelte-vk4xvw.svelte-vk4xvw{padding:2rem;background:white;margin:2rem 0;border:1px solid rgba(0, 0, 0, 0.05);border-left:5px solid red}.error.svelte-vk4xvw p.svelte-vk4xvw{margin:0;font-weight:100}.error.svelte-vk4xvw strong.svelte-vk4xvw{margin-right:1rem}",
  map: '{"version":3,"file":"ErrorMessage.svelte","sources":["ErrorMessage.svelte"],"sourcesContent":["<script lang=\\"ts\\">export let error;\\n</script>\\n\\n{#if error.networkError && error.networkError.result && error.networkError.result.errors.length}\\n  {#each error.networkError.result.errors as error}\\n    <div class=\\"error\\">\\n      <p data-test=\\"graphql-error\\">\\n        <strong>Shoot!</strong>\\n        {error.message.replace(\\"GraphQL error: \\", \\"\\")}\\n      </p>\\n    </div>\\n  {/each}\\n{/if}\\n\\n<style lang=\\"scss\\">.error {\\n  padding: 2rem;\\n  background: white;\\n  margin: 2rem 0;\\n  border: 1px solid rgba(0, 0, 0, 0.05);\\n  border-left: 5px solid red;\\n}\\n.error p {\\n  margin: 0;\\n  font-weight: 100;\\n}\\n.error strong {\\n  margin-right: 1rem;\\n}</style>\\n"],"names":[],"mappings":"AAcmB,MAAM,4BAAC,CAAC,AACzB,OAAO,CAAE,IAAI,CACb,UAAU,CAAE,KAAK,CACjB,MAAM,CAAE,IAAI,CAAC,CAAC,CACd,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CACrC,WAAW,CAAE,GAAG,CAAC,KAAK,CAAC,GAAG,AAC5B,CAAC,AACD,oBAAM,CAAC,CAAC,cAAC,CAAC,AACR,MAAM,CAAE,CAAC,CACT,WAAW,CAAE,GAAG,AAClB,CAAC,AACD,oBAAM,CAAC,MAAM,cAAC,CAAC,AACb,YAAY,CAAE,IAAI,AACpB,CAAC"}'
};
const ErrorMessage = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {error: error2} = $$props;
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  $$result.css.add(css$4);
  return `${error2.networkError && error2.networkError.result && error2.networkError.result.errors.length ? `${each(error2.networkError.result.errors, (error3) => `<div class="${"error svelte-vk4xvw"}"><p data-test="${"graphql-error"}" class="${"svelte-vk4xvw"}"><strong class="${"svelte-vk4xvw"}">Shoot!</strong>
        ${escape(error3.message.replace("GraphQL error: ", ""))}</p>
    </div>`)}` : ``}`;
});
function l$2(a2, b2) {
  b2.tag = a2;
  return b2;
}
function m$2() {
}
function p$2(a2) {
  return function(b2) {
    var c2 = a2.length;
    let d2 = false, e2 = false, f2 = false, g2 = 0;
    b2(l$2(0, [
      function(h2) {
        if (h2) {
          d2 = true;
        } else if (e2) {
          f2 = true;
        } else {
          for (e2 = f2 = true; f2 && !d2; ) {
            g2 < c2 ? (h2 = a2[g2], g2 = g2 + 1 | 0, f2 = false, b2(l$2(1, [h2]))) : (d2 = true, b2(0));
          }
          e2 = false;
        }
      }
    ]));
  };
}
function r$3() {
}
function t$3(a2) {
  a2(0);
}
function u$3(a2) {
  let b2 = false;
  a2(l$2(0, [
    function(c2) {
      c2 ? b2 = true : b2 || a2(0);
    }
  ]));
}
function x$3(a2) {
  if (a2 === null || a2[0] !== v$3) {
    return a2;
  }
  if ((a2 = a2[1]) !== 0) {
    return [v$3, a2 - 1 | 0];
  }
}
function z$3(a2) {
  return function(b2) {
    return function(c2) {
      function d2(b3) {
        typeof b3 == "number" ? k2 && (k2 = false, (b3 = e2.shift()) !== void 0 ? (b3 = a2(x$3(b3)), k2 = true, b3(d2)) : q2 ? c2(0) : g2 || (g2 = true, f2(0))) : b3.tag ? k2 && (c2(b3), n2 ? n2 = false : h2(0)) : (h2 = b3 = b3[0], n2 = false, b3(0));
      }
      let e2 = [], f2 = m$2, g2 = false, h2 = m$2, k2 = false, n2 = false, q2 = false;
      b2(function(b3) {
        typeof b3 == "number" ? q2 || (q2 = true, k2 || e2.length !== 0 || c2(0)) : b3.tag ? q2 || (b3 = b3[0], g2 = false, k2 ? e2.push(b3) : (b3 = a2(b3), k2 = true, b3(d2))) : f2 = b3[0];
      });
      c2(l$2(0, [
        function(c3) {
          if (c3) {
            if (q2 || (q2 = true, f2(1)), k2) {
              return k2 = false, h2(1);
            }
          } else {
            q2 || g2 || (g2 = true, f2(0)), k2 && !n2 && (n2 = true, h2(0));
          }
        }
      ]));
    };
  };
}
function B$2(a2) {
  return a2;
}
function C$1(a2) {
  return a2(0);
}
function D$1(a2) {
  return function(b2) {
    return function(c2) {
      let e2 = m$2, f2 = false, g2 = [], h2 = false;
      b2(function(b3) {
        typeof b3 == "number" ? h2 || (h2 = true, g2.length === 0 && c2(0)) : b3.tag ? h2 || (f2 = false, function(a3) {
          function b4(a4) {
            typeof a4 == "number" ? g2.length !== 0 && (g2 = g2.filter(d2), a4 = g2.length === 0, h2 && a4 ? c2(0) : !f2 && a4 && (f2 = true, e2(0))) : a4.tag ? g2.length !== 0 && (c2(l$2(1, [a4[0]])), k2(0)) : (k2 = a4 = a4[0], g2 = g2.concat(a4), a4(0));
          }
          function d2(a4) {
            return a4 !== k2;
          }
          let k2 = m$2;
          a3.length === 1 ? a3(b4) : a3.bind(null, b4);
        }(a2(b3[0])), f2 || (f2 = true, e2(0))) : e2 = b3[0];
      });
      c2(l$2(0, [
        function(a3) {
          a3 ? (h2 || (h2 = true, e2(a3)), g2.forEach(function(c3) {
            return c3(a3);
          }), g2 = []) : (f2 || h2 ? f2 = false : (f2 = true, e2(0)), g2.forEach(C$1));
        }
      ]));
    };
  };
}
function E$2(a2) {
  return a2;
}
function H$1(a2) {
  return function(b2) {
    return function(c2) {
      let d2 = false;
      return b2(function(e2) {
        if (typeof e2 == "number") {
          d2 || (d2 = true, c2(e2));
        } else if (e2.tag) {
          d2 || (a2(e2[0]), c2(e2));
        } else {
          var g2 = e2[0];
          c2(l$2(0, [
            function(a3) {
              if (!d2) {
                return a3 && (d2 = true), g2(a3);
              }
            }
          ]));
        }
      });
    };
  };
}
function J$1(a2) {
  a2(0);
}
function K(a2) {
  return function(b2) {
    return function(c2) {
      function d2(a3) {
        h2 && (typeof a3 == "number" ? (h2 = false, n2 ? c2(a3) : f2 || (f2 = true, e2(0))) : a3.tag ? (c2(a3), k2 ? k2 = false : g2(0)) : (g2 = a3 = a3[0], k2 = false, a3(0)));
      }
      let e2 = m$2, f2 = false, g2 = m$2, h2 = false, k2 = false, n2 = false;
      b2(function(b3) {
        typeof b3 == "number" ? n2 || (n2 = true, h2 || c2(0)) : b3.tag ? n2 || (h2 && (g2(1), g2 = m$2), f2 ? f2 = false : (f2 = true, e2(0)), b3 = a2(b3[0]), h2 = true, b3(d2)) : e2 = b3[0];
      });
      c2(l$2(0, [
        function(a3) {
          if (a3) {
            if (n2 || (n2 = true, e2(1)), h2) {
              return h2 = false, g2(1);
            }
          } else {
            n2 || f2 || (f2 = true, e2(0)), h2 && !k2 && (k2 = true, g2(0));
          }
        }
      ]));
    };
  };
}
function M$2(a2) {
  return function(b2) {
    return function(c2) {
      let d2 = [], e2 = m$2;
      return b2(function(b3) {
        typeof b3 == "number" ? p$2(d2)(c2) : b3.tag ? (d2.length >= a2 && 0 < a2 && d2.shift(), d2.push(b3[0]), e2(0)) : (b3 = b3[0], 0 >= a2 ? (b3(1), u$3(c2)) : (e2 = b3, b3(0)));
      });
    };
  };
}
function N$1(a2) {
  return function(b2) {
    let c2 = m$2, d2 = false;
    b2(function(e2) {
      typeof e2 == "number" ? d2 = true : e2.tag ? d2 || (a2(e2[0]), c2(0)) : (c2 = e2 = e2[0], e2(0));
    });
    return {
      unsubscribe: function() {
        if (!d2) {
          return d2 = true, c2(1);
        }
      }
    };
  };
}
function O$1() {
}
function concat$1(a2) {
  return z$3(B$2)(p$2(a2));
}
function filter$1(a2) {
  return function(b2) {
    return function(c2) {
      let d2 = m$2;
      return b2(function(b3) {
        typeof b3 == "number" ? c2(b3) : b3.tag ? a2(b3[0]) ? c2(b3) : d2(0) : (d2 = b3[0], c2(b3));
      });
    };
  };
}
function fromValue$1(a2) {
  return function(b2) {
    let c2 = false;
    b2(l$2(0, [
      function(d2) {
        d2 ? c2 = true : c2 || (c2 = true, b2(l$2(1, [a2])), b2(0));
      }
    ]));
  };
}
function make$1(a2) {
  return function(b2) {
    let c2 = r$3, d2 = false;
    c2 = a2({
      next: function(a3) {
        d2 || b2(l$2(1, [a3]));
      },
      complete: function() {
        d2 || (d2 = true, b2(0));
      }
    });
    b2(l$2(0, [
      function(a3) {
        if (a3 && !d2) {
          return d2 = true, c2();
        }
      }
    ]));
  };
}
function makeSubject$1() {
  let a2 = [], b2 = false;
  return {
    source: function(c2) {
      function b3(a3) {
        return a3 !== c2;
      }
      a2 = a2.concat(c2);
      c2(l$2(0, [
        function(c3) {
          c3 && (a2 = a2.filter(b3));
        }
      ]));
    },
    next: function(c2) {
      b2 || a2.forEach(function(a3) {
        a3(l$2(1, [c2]));
      });
    },
    complete: function() {
      b2 || (b2 = true, a2.forEach(t$3));
    }
  };
}
function map$1(a2) {
  return function(b2) {
    return function(c2) {
      return b2(function(b3) {
        b3 = typeof b3 == "number" ? 0 : b3.tag ? l$2(1, [a2(b3[0])]) : l$2(0, [b3[0]]);
        c2(b3);
      });
    };
  };
}
function merge$1(a2) {
  return D$1(E$2)(p$2(a2));
}
function onEnd$1(a2) {
  return function(b2) {
    return function(c2) {
      let d2 = false;
      return b2(function(b3) {
        if (typeof b3 == "number") {
          if (d2) {
            return;
          }
          d2 = true;
          c2(b3);
          return a2();
        }
        if (b3.tag) {
          d2 || c2(b3);
        } else {
          var e2 = b3[0];
          c2(l$2(0, [
            function(c3) {
              if (!d2) {
                return c3 ? (d2 = true, e2(c3), a2()) : e2(c3);
              }
            }
          ]));
        }
      });
    };
  };
}
function onStart$1(a2) {
  return function(b2) {
    return function(c2) {
      return b2(function(b3) {
        typeof b3 == "number" ? c2(b3) : b3.tag ? c2(b3) : (c2(b3), a2());
      });
    };
  };
}
function publish$1(a2) {
  return N$1(O$1)(a2);
}
function scan$1(a2, b2) {
  return function(a3, b3) {
    return function(c2) {
      return function(d2) {
        let e2 = b3;
        return c2(function(c3) {
          typeof c3 == "number" ? c3 = 0 : c3.tag ? (e2 = a3(e2, c3[0]), c3 = l$2(1, [e2])) : c3 = l$2(0, [c3[0]]);
          d2(c3);
        });
      };
    };
  }(a2, b2);
}
function share$1(a2) {
  function b2(a3) {
    typeof a3 == "number" ? (c2.forEach(J$1), c2 = []) : a3.tag ? (e2 = false, c2.forEach(function(b3) {
      b3(a3);
    })) : d2 = a3[0];
  }
  let c2 = [], d2 = m$2, e2 = false;
  return function(f2) {
    function g2(a3) {
      return a3 !== f2;
    }
    c2 = c2.concat(f2);
    c2.length === 1 && a2(b2);
    f2(l$2(0, [
      function(a3) {
        if (a3) {
          if (c2 = c2.filter(g2), c2.length === 0) {
            return d2(1);
          }
        } else {
          e2 || (e2 = true, d2(a3));
        }
      }
    ]));
  };
}
function take$1(a2) {
  return function(b2) {
    return function(c2) {
      let d2 = false, e2 = 0, f2 = m$2;
      b2(function(b3) {
        typeof b3 == "number" ? d2 || (d2 = true, c2(0)) : b3.tag ? e2 < a2 && !d2 && (e2 = e2 + 1 | 0, c2(b3), !d2 && e2 >= a2 && (d2 = true, c2(0), f2(1))) : (b3 = b3[0], 0 >= a2 ? (d2 = true, c2(0), b3(1)) : f2 = b3);
      });
      c2(l$2(0, [
        function(b3) {
          if (!d2) {
            if (b3) {
              return d2 = true, f2(1);
            }
            if (e2 < a2) {
              return f2(0);
            }
          }
        }
      ]));
    };
  };
}
function takeUntil$1(a2) {
  return function(b2) {
    return function(c2) {
      function d2(a3) {
        typeof a3 != "number" && (a3.tag ? (e2 = true, f2(1), c2(0)) : (g2 = a3 = a3[0], a3(0)));
      }
      let e2 = false, f2 = m$2, g2 = m$2;
      b2(function(b3) {
        typeof b3 == "number" ? e2 || (e2 = true, g2(1), c2(0)) : b3.tag ? e2 || c2(b3) : (f2 = b3[0], a2(d2));
      });
      c2(l$2(0, [
        function(a3) {
          if (!e2) {
            return a3 ? (e2 = true, f2(1), g2(1)) : f2(0);
          }
        }
      ]));
    };
  };
}
function toPromise$1(a2) {
  return new Promise(function(b2) {
    M$2(1)(a2)(function(a3) {
      if (typeof a3 != "number") {
        if (a3.tag) {
          b2(a3[0]);
        } else {
          a3[0](0);
        }
      }
    });
  });
}
var v$3 = [];
typeof Symbol == "function" ? Symbol.observable || (Symbol.observable = Symbol("observable")) : "@@observable";
function _typeof$2(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof$2 = function _typeof2(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof$2 = function _typeof2(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof$2(obj);
}
function isObjectLike(value) {
  return _typeof$2(value) == "object" && value !== null;
}
var SYMBOL_TO_STRING_TAG = typeof Symbol === "function" && Symbol.toStringTag != null ? Symbol.toStringTag : "@@toStringTag";
function getLocation(source, position) {
  var lineRegexp = /\r\n|[\n\r]/g;
  var line = 1;
  var column = position + 1;
  var match;
  while ((match = lineRegexp.exec(source.body)) && match.index < position) {
    line += 1;
    column = position + 1 - (match.index + match[0].length);
  }
  return {
    line,
    column
  };
}
function printLocation(location) {
  return printSourceLocation(location.source, getLocation(location.source, location.start));
}
function printSourceLocation(source, sourceLocation) {
  var firstLineColumnOffset = source.locationOffset.column - 1;
  var body = whitespace(firstLineColumnOffset) + source.body;
  var lineIndex = sourceLocation.line - 1;
  var lineOffset = source.locationOffset.line - 1;
  var lineNum = sourceLocation.line + lineOffset;
  var columnOffset = sourceLocation.line === 1 ? firstLineColumnOffset : 0;
  var columnNum = sourceLocation.column + columnOffset;
  var locationStr = "".concat(source.name, ":").concat(lineNum, ":").concat(columnNum, "\n");
  var lines = body.split(/\r\n|[\n\r]/g);
  var locationLine = lines[lineIndex];
  if (locationLine.length > 120) {
    var subLineIndex = Math.floor(columnNum / 80);
    var subLineColumnNum = columnNum % 80;
    var subLines = [];
    for (var i2 = 0; i2 < locationLine.length; i2 += 80) {
      subLines.push(locationLine.slice(i2, i2 + 80));
    }
    return locationStr + printPrefixedLines([["".concat(lineNum), subLines[0]]].concat(subLines.slice(1, subLineIndex + 1).map(function(subLine) {
      return ["", subLine];
    }), [[" ", whitespace(subLineColumnNum - 1) + "^"], ["", subLines[subLineIndex + 1]]]));
  }
  return locationStr + printPrefixedLines([
    ["".concat(lineNum - 1), lines[lineIndex - 1]],
    ["".concat(lineNum), locationLine],
    ["", whitespace(columnNum - 1) + "^"],
    ["".concat(lineNum + 1), lines[lineIndex + 1]]
  ]);
}
function printPrefixedLines(lines) {
  var existingLines = lines.filter(function(_ref3) {
    _ref3[0];
    var line = _ref3[1];
    return line !== void 0;
  });
  var padLen = Math.max.apply(Math, existingLines.map(function(_ref22) {
    var prefix = _ref22[0];
    return prefix.length;
  }));
  return existingLines.map(function(_ref3) {
    var prefix = _ref3[0], line = _ref3[1];
    return leftPad(padLen, prefix) + (line ? " | " + line : " |");
  }).join("\n");
}
function whitespace(len) {
  return Array(len + 1).join(" ");
}
function leftPad(len, str) {
  return whitespace(len - str.length) + str;
}
function _typeof$1(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof$1 = function _typeof2(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof$1 = function _typeof2(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof$1(obj);
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties$1(target, props) {
  for (var i2 = 0; i2 < props.length; i2++) {
    var descriptor = props[i2];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor)
      descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _createClass$1(Constructor, protoProps, staticProps) {
  if (protoProps)
    _defineProperties$1(Constructor.prototype, protoProps);
  if (staticProps)
    _defineProperties$1(Constructor, staticProps);
  return Constructor;
}
function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {value: subClass, writable: true, configurable: true}});
  if (superClass)
    _setPrototypeOf(subClass, superClass);
}
function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();
  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived), result;
    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }
    return _possibleConstructorReturn(this, result);
  };
}
function _possibleConstructorReturn(self, call) {
  if (call && (_typeof$1(call) === "object" || typeof call === "function")) {
    return call;
  }
  return _assertThisInitialized(self);
}
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}
function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : void 0;
  _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
    if (Class2 === null || !_isNativeFunction(Class2))
      return Class2;
    if (typeof Class2 !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (typeof _cache !== "undefined") {
      if (_cache.has(Class2))
        return _cache.get(Class2);
      _cache.set(Class2, Wrapper);
    }
    function Wrapper() {
      return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
    }
    Wrapper.prototype = Object.create(Class2.prototype, {constructor: {value: Wrapper, enumerable: false, writable: true, configurable: true}});
    return _setPrototypeOf(Wrapper, Class2);
  };
  return _wrapNativeSuper(Class);
}
function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct2(Parent2, args2, Class2) {
      var a2 = [null];
      a2.push.apply(a2, args2);
      var Constructor = Function.bind.apply(Parent2, a2);
      var instance = new Constructor();
      if (Class2)
        _setPrototypeOf(instance, Class2.prototype);
      return instance;
    };
  }
  return _construct.apply(null, arguments);
}
function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct)
    return false;
  if (Reflect.construct.sham)
    return false;
  if (typeof Proxy === "function")
    return true;
  try {
    Date.prototype.toString.call(Reflect.construct(Date, [], function() {
    }));
    return true;
  } catch (e2) {
    return false;
  }
}
function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
function _setPrototypeOf(o2, p2) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o3, p3) {
    o3.__proto__ = p3;
    return o3;
  };
  return _setPrototypeOf(o2, p2);
}
function _getPrototypeOf(o2) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf2(o3) {
    return o3.__proto__ || Object.getPrototypeOf(o3);
  };
  return _getPrototypeOf(o2);
}
var GraphQLError = /* @__PURE__ */ function(_Error) {
  _inherits(GraphQLError2, _Error);
  var _super = _createSuper(GraphQLError2);
  function GraphQLError2(message, nodes, source, positions, path, originalError, extensions) {
    var _locations2, _source2, _positions2, _extensions2;
    var _this;
    _classCallCheck(this, GraphQLError2);
    _this = _super.call(this, message);
    var _nodes = Array.isArray(nodes) ? nodes.length !== 0 ? nodes : void 0 : nodes ? [nodes] : void 0;
    var _source = source;
    if (!_source && _nodes) {
      var _nodes$0$loc;
      _source = (_nodes$0$loc = _nodes[0].loc) === null || _nodes$0$loc === void 0 ? void 0 : _nodes$0$loc.source;
    }
    var _positions = positions;
    if (!_positions && _nodes) {
      _positions = _nodes.reduce(function(list, node) {
        if (node.loc) {
          list.push(node.loc.start);
        }
        return list;
      }, []);
    }
    if (_positions && _positions.length === 0) {
      _positions = void 0;
    }
    var _locations;
    if (positions && source) {
      _locations = positions.map(function(pos) {
        return getLocation(source, pos);
      });
    } else if (_nodes) {
      _locations = _nodes.reduce(function(list, node) {
        if (node.loc) {
          list.push(getLocation(node.loc.source, node.loc.start));
        }
        return list;
      }, []);
    }
    var _extensions = extensions;
    if (_extensions == null && originalError != null) {
      var originalExtensions = originalError.extensions;
      if (isObjectLike(originalExtensions)) {
        _extensions = originalExtensions;
      }
    }
    Object.defineProperties(_assertThisInitialized(_this), {
      name: {
        value: "GraphQLError"
      },
      message: {
        value: message,
        enumerable: true,
        writable: true
      },
      locations: {
        value: (_locations2 = _locations) !== null && _locations2 !== void 0 ? _locations2 : void 0,
        enumerable: _locations != null
      },
      path: {
        value: path !== null && path !== void 0 ? path : void 0,
        enumerable: path != null
      },
      nodes: {
        value: _nodes !== null && _nodes !== void 0 ? _nodes : void 0
      },
      source: {
        value: (_source2 = _source) !== null && _source2 !== void 0 ? _source2 : void 0
      },
      positions: {
        value: (_positions2 = _positions) !== null && _positions2 !== void 0 ? _positions2 : void 0
      },
      originalError: {
        value: originalError
      },
      extensions: {
        value: (_extensions2 = _extensions) !== null && _extensions2 !== void 0 ? _extensions2 : void 0,
        enumerable: _extensions != null
      }
    });
    if (originalError !== null && originalError !== void 0 && originalError.stack) {
      Object.defineProperty(_assertThisInitialized(_this), "stack", {
        value: originalError.stack,
        writable: true,
        configurable: true
      });
      return _possibleConstructorReturn(_this);
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(_assertThisInitialized(_this), GraphQLError2);
    } else {
      Object.defineProperty(_assertThisInitialized(_this), "stack", {
        value: Error().stack,
        writable: true,
        configurable: true
      });
    }
    return _this;
  }
  _createClass$1(GraphQLError2, [{
    key: "toString",
    value: function toString() {
      return printError(this);
    }
  }, {
    key: SYMBOL_TO_STRING_TAG,
    get: function get() {
      return "Object";
    }
  }]);
  return GraphQLError2;
}(/* @__PURE__ */ _wrapNativeSuper(Error));
function printError(error2) {
  var output = error2.message;
  if (error2.nodes) {
    for (var _i2 = 0, _error$nodes2 = error2.nodes; _i2 < _error$nodes2.length; _i2++) {
      var node = _error$nodes2[_i2];
      if (node.loc) {
        output += "\n\n" + printLocation(node.loc);
      }
    }
  } else if (error2.source && error2.locations) {
    for (var _i4 = 0, _error$locations2 = error2.locations; _i4 < _error$locations2.length; _i4++) {
      var location = _error$locations2[_i4];
      output += "\n\n" + printSourceLocation(error2.source, location);
    }
  }
  return output;
}
var Kind = Object.freeze({
  NAME: "Name",
  DOCUMENT: "Document",
  OPERATION_DEFINITION: "OperationDefinition",
  VARIABLE_DEFINITION: "VariableDefinition",
  SELECTION_SET: "SelectionSet",
  FIELD: "Field",
  ARGUMENT: "Argument",
  FRAGMENT_SPREAD: "FragmentSpread",
  INLINE_FRAGMENT: "InlineFragment",
  FRAGMENT_DEFINITION: "FragmentDefinition",
  VARIABLE: "Variable",
  INT: "IntValue",
  FLOAT: "FloatValue",
  STRING: "StringValue",
  BOOLEAN: "BooleanValue",
  NULL: "NullValue",
  ENUM: "EnumValue",
  LIST: "ListValue",
  OBJECT: "ObjectValue",
  OBJECT_FIELD: "ObjectField",
  DIRECTIVE: "Directive",
  NAMED_TYPE: "NamedType",
  LIST_TYPE: "ListType",
  NON_NULL_TYPE: "NonNullType",
  SCHEMA_DEFINITION: "SchemaDefinition",
  OPERATION_TYPE_DEFINITION: "OperationTypeDefinition",
  SCALAR_TYPE_DEFINITION: "ScalarTypeDefinition",
  OBJECT_TYPE_DEFINITION: "ObjectTypeDefinition",
  FIELD_DEFINITION: "FieldDefinition",
  INPUT_VALUE_DEFINITION: "InputValueDefinition",
  INTERFACE_TYPE_DEFINITION: "InterfaceTypeDefinition",
  UNION_TYPE_DEFINITION: "UnionTypeDefinition",
  ENUM_TYPE_DEFINITION: "EnumTypeDefinition",
  ENUM_VALUE_DEFINITION: "EnumValueDefinition",
  INPUT_OBJECT_TYPE_DEFINITION: "InputObjectTypeDefinition",
  DIRECTIVE_DEFINITION: "DirectiveDefinition",
  SCHEMA_EXTENSION: "SchemaExtension",
  SCALAR_TYPE_EXTENSION: "ScalarTypeExtension",
  OBJECT_TYPE_EXTENSION: "ObjectTypeExtension",
  INTERFACE_TYPE_EXTENSION: "InterfaceTypeExtension",
  UNION_TYPE_EXTENSION: "UnionTypeExtension",
  ENUM_TYPE_EXTENSION: "EnumTypeExtension",
  INPUT_OBJECT_TYPE_EXTENSION: "InputObjectTypeExtension"
});
function syntaxError(source, position, description) {
  return new GraphQLError("Syntax Error: ".concat(description), void 0, source, [position]);
}
function invariant(condition, message) {
  var booleanCondition = Boolean(condition);
  if (!booleanCondition) {
    throw new Error(message != null ? message : "Unexpected invariant triggered.");
  }
}
var nodejsCustomInspectSymbol = typeof Symbol === "function" && typeof Symbol.for === "function" ? Symbol.for("nodejs.util.inspect.custom") : void 0;
function defineInspect(classObject) {
  var fn = classObject.prototype.toJSON;
  typeof fn === "function" || invariant(0);
  classObject.prototype.inspect = fn;
  if (nodejsCustomInspectSymbol) {
    classObject.prototype[nodejsCustomInspectSymbol] = fn;
  }
}
var Location = /* @__PURE__ */ function() {
  function Location2(startToken, endToken, source) {
    this.start = startToken.start;
    this.end = endToken.end;
    this.startToken = startToken;
    this.endToken = endToken;
    this.source = source;
  }
  var _proto = Location2.prototype;
  _proto.toJSON = function toJSON() {
    return {
      start: this.start,
      end: this.end
    };
  };
  return Location2;
}();
defineInspect(Location);
var Token = /* @__PURE__ */ function() {
  function Token2(kind, start, end, line, column, prev, value) {
    this.kind = kind;
    this.start = start;
    this.end = end;
    this.line = line;
    this.column = column;
    this.value = value;
    this.prev = prev;
    this.next = null;
  }
  var _proto2 = Token2.prototype;
  _proto2.toJSON = function toJSON() {
    return {
      kind: this.kind,
      value: this.value,
      line: this.line,
      column: this.column
    };
  };
  return Token2;
}();
defineInspect(Token);
function isNode(maybeNode) {
  return maybeNode != null && typeof maybeNode.kind === "string";
}
var TokenKind = Object.freeze({
  SOF: "<SOF>",
  EOF: "<EOF>",
  BANG: "!",
  DOLLAR: "$",
  AMP: "&",
  PAREN_L: "(",
  PAREN_R: ")",
  SPREAD: "...",
  COLON: ":",
  EQUALS: "=",
  AT: "@",
  BRACKET_L: "[",
  BRACKET_R: "]",
  BRACE_L: "{",
  PIPE: "|",
  BRACE_R: "}",
  NAME: "Name",
  INT: "Int",
  FLOAT: "Float",
  STRING: "String",
  BLOCK_STRING: "BlockString",
  COMMENT: "Comment"
});
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof2(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function _typeof2(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
var MAX_ARRAY_LENGTH = 10;
var MAX_RECURSIVE_DEPTH = 2;
function inspect(value) {
  return formatValue(value, []);
}
function formatValue(value, seenValues) {
  switch (_typeof(value)) {
    case "string":
      return JSON.stringify(value);
    case "function":
      return value.name ? "[function ".concat(value.name, "]") : "[function]";
    case "object":
      if (value === null) {
        return "null";
      }
      return formatObjectValue(value, seenValues);
    default:
      return String(value);
  }
}
function formatObjectValue(value, previouslySeenValues) {
  if (previouslySeenValues.indexOf(value) !== -1) {
    return "[Circular]";
  }
  var seenValues = [].concat(previouslySeenValues, [value]);
  var customInspectFn = getCustomFn(value);
  if (customInspectFn !== void 0) {
    var customValue = customInspectFn.call(value);
    if (customValue !== value) {
      return typeof customValue === "string" ? customValue : formatValue(customValue, seenValues);
    }
  } else if (Array.isArray(value)) {
    return formatArray(value, seenValues);
  }
  return formatObject(value, seenValues);
}
function formatObject(object, seenValues) {
  var keys = Object.keys(object);
  if (keys.length === 0) {
    return "{}";
  }
  if (seenValues.length > MAX_RECURSIVE_DEPTH) {
    return "[" + getObjectTag(object) + "]";
  }
  var properties = keys.map(function(key) {
    var value = formatValue(object[key], seenValues);
    return key + ": " + value;
  });
  return "{ " + properties.join(", ") + " }";
}
function formatArray(array, seenValues) {
  if (array.length === 0) {
    return "[]";
  }
  if (seenValues.length > MAX_RECURSIVE_DEPTH) {
    return "[Array]";
  }
  var len = Math.min(MAX_ARRAY_LENGTH, array.length);
  var remaining = array.length - len;
  var items = [];
  for (var i2 = 0; i2 < len; ++i2) {
    items.push(formatValue(array[i2], seenValues));
  }
  if (remaining === 1) {
    items.push("... 1 more item");
  } else if (remaining > 1) {
    items.push("... ".concat(remaining, " more items"));
  }
  return "[" + items.join(", ") + "]";
}
function getCustomFn(object) {
  var customInspectFn = object[String(nodejsCustomInspectSymbol)];
  if (typeof customInspectFn === "function") {
    return customInspectFn;
  }
  if (typeof object.inspect === "function") {
    return object.inspect;
  }
}
function getObjectTag(object) {
  var tag = Object.prototype.toString.call(object).replace(/^\[object /, "").replace(/]$/, "");
  if (tag === "Object" && typeof object.constructor === "function") {
    var name = object.constructor.name;
    if (typeof name === "string" && name !== "") {
      return name;
    }
  }
  return tag;
}
function devAssert(condition, message) {
  var booleanCondition = Boolean(condition);
  if (!booleanCondition) {
    throw new Error(message);
  }
}
var instanceOf = function instanceOf2(value, constructor) {
  return value instanceof constructor;
};
function _defineProperties(target, props) {
  for (var i2 = 0; i2 < props.length; i2++) {
    var descriptor = props[i2];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor)
      descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps)
    _defineProperties(Constructor.prototype, protoProps);
  if (staticProps)
    _defineProperties(Constructor, staticProps);
  return Constructor;
}
var Source = /* @__PURE__ */ function() {
  function Source2(body) {
    var name = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "GraphQL request";
    var locationOffset = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {
      line: 1,
      column: 1
    };
    typeof body === "string" || devAssert(0, "Body must be a string. Received: ".concat(inspect(body), "."));
    this.body = body;
    this.name = name;
    this.locationOffset = locationOffset;
    this.locationOffset.line > 0 || devAssert(0, "line in locationOffset is 1-indexed and must be positive.");
    this.locationOffset.column > 0 || devAssert(0, "column in locationOffset is 1-indexed and must be positive.");
  }
  _createClass(Source2, [{
    key: SYMBOL_TO_STRING_TAG,
    get: function get() {
      return "Source";
    }
  }]);
  return Source2;
}();
function isSource(source) {
  return instanceOf(source, Source);
}
var DirectiveLocation = Object.freeze({
  QUERY: "QUERY",
  MUTATION: "MUTATION",
  SUBSCRIPTION: "SUBSCRIPTION",
  FIELD: "FIELD",
  FRAGMENT_DEFINITION: "FRAGMENT_DEFINITION",
  FRAGMENT_SPREAD: "FRAGMENT_SPREAD",
  INLINE_FRAGMENT: "INLINE_FRAGMENT",
  VARIABLE_DEFINITION: "VARIABLE_DEFINITION",
  SCHEMA: "SCHEMA",
  SCALAR: "SCALAR",
  OBJECT: "OBJECT",
  FIELD_DEFINITION: "FIELD_DEFINITION",
  ARGUMENT_DEFINITION: "ARGUMENT_DEFINITION",
  INTERFACE: "INTERFACE",
  UNION: "UNION",
  ENUM: "ENUM",
  ENUM_VALUE: "ENUM_VALUE",
  INPUT_OBJECT: "INPUT_OBJECT",
  INPUT_FIELD_DEFINITION: "INPUT_FIELD_DEFINITION"
});
function dedentBlockStringValue(rawString) {
  var lines = rawString.split(/\r\n|[\n\r]/g);
  var commonIndent = getBlockStringIndentation(rawString);
  if (commonIndent !== 0) {
    for (var i2 = 1; i2 < lines.length; i2++) {
      lines[i2] = lines[i2].slice(commonIndent);
    }
  }
  var startLine = 0;
  while (startLine < lines.length && isBlank(lines[startLine])) {
    ++startLine;
  }
  var endLine = lines.length;
  while (endLine > startLine && isBlank(lines[endLine - 1])) {
    --endLine;
  }
  return lines.slice(startLine, endLine).join("\n");
}
function isBlank(str) {
  for (var i2 = 0; i2 < str.length; ++i2) {
    if (str[i2] !== " " && str[i2] !== "	") {
      return false;
    }
  }
  return true;
}
function getBlockStringIndentation(value) {
  var _commonIndent;
  var isFirstLine = true;
  var isEmptyLine = true;
  var indent2 = 0;
  var commonIndent = null;
  for (var i2 = 0; i2 < value.length; ++i2) {
    switch (value.charCodeAt(i2)) {
      case 13:
        if (value.charCodeAt(i2 + 1) === 10) {
          ++i2;
        }
      case 10:
        isFirstLine = false;
        isEmptyLine = true;
        indent2 = 0;
        break;
      case 9:
      case 32:
        ++indent2;
        break;
      default:
        if (isEmptyLine && !isFirstLine && (commonIndent === null || indent2 < commonIndent)) {
          commonIndent = indent2;
        }
        isEmptyLine = false;
    }
  }
  return (_commonIndent = commonIndent) !== null && _commonIndent !== void 0 ? _commonIndent : 0;
}
function printBlockString(value) {
  var indentation = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "";
  var preferMultipleLines = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
  var isSingleLine = value.indexOf("\n") === -1;
  var hasLeadingSpace = value[0] === " " || value[0] === "	";
  var hasTrailingQuote = value[value.length - 1] === '"';
  var hasTrailingSlash = value[value.length - 1] === "\\";
  var printAsMultipleLines = !isSingleLine || hasTrailingQuote || hasTrailingSlash || preferMultipleLines;
  var result = "";
  if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) {
    result += "\n" + indentation;
  }
  result += indentation ? value.replace(/\n/g, "\n" + indentation) : value;
  if (printAsMultipleLines) {
    result += "\n";
  }
  return '"""' + result.replace(/"""/g, '\\"""') + '"""';
}
var Lexer = /* @__PURE__ */ function() {
  function Lexer2(source) {
    var startOfFileToken = new Token(TokenKind.SOF, 0, 0, 0, 0, null);
    this.source = source;
    this.lastToken = startOfFileToken;
    this.token = startOfFileToken;
    this.line = 1;
    this.lineStart = 0;
  }
  var _proto = Lexer2.prototype;
  _proto.advance = function advance() {
    this.lastToken = this.token;
    var token = this.token = this.lookahead();
    return token;
  };
  _proto.lookahead = function lookahead() {
    var token = this.token;
    if (token.kind !== TokenKind.EOF) {
      do {
        var _token$next;
        token = (_token$next = token.next) !== null && _token$next !== void 0 ? _token$next : token.next = readToken(this, token);
      } while (token.kind === TokenKind.COMMENT);
    }
    return token;
  };
  return Lexer2;
}();
function isPunctuatorTokenKind(kind) {
  return kind === TokenKind.BANG || kind === TokenKind.DOLLAR || kind === TokenKind.AMP || kind === TokenKind.PAREN_L || kind === TokenKind.PAREN_R || kind === TokenKind.SPREAD || kind === TokenKind.COLON || kind === TokenKind.EQUALS || kind === TokenKind.AT || kind === TokenKind.BRACKET_L || kind === TokenKind.BRACKET_R || kind === TokenKind.BRACE_L || kind === TokenKind.PIPE || kind === TokenKind.BRACE_R;
}
function printCharCode(code) {
  return isNaN(code) ? TokenKind.EOF : code < 127 ? JSON.stringify(String.fromCharCode(code)) : '"\\u'.concat(("00" + code.toString(16).toUpperCase()).slice(-4), '"');
}
function readToken(lexer, prev) {
  var source = lexer.source;
  var body = source.body;
  var bodyLength = body.length;
  var pos = prev.end;
  while (pos < bodyLength) {
    var code = body.charCodeAt(pos);
    var _line = lexer.line;
    var _col = 1 + pos - lexer.lineStart;
    switch (code) {
      case 65279:
      case 9:
      case 32:
      case 44:
        ++pos;
        continue;
      case 10:
        ++pos;
        ++lexer.line;
        lexer.lineStart = pos;
        continue;
      case 13:
        if (body.charCodeAt(pos + 1) === 10) {
          pos += 2;
        } else {
          ++pos;
        }
        ++lexer.line;
        lexer.lineStart = pos;
        continue;
      case 33:
        return new Token(TokenKind.BANG, pos, pos + 1, _line, _col, prev);
      case 35:
        return readComment(source, pos, _line, _col, prev);
      case 36:
        return new Token(TokenKind.DOLLAR, pos, pos + 1, _line, _col, prev);
      case 38:
        return new Token(TokenKind.AMP, pos, pos + 1, _line, _col, prev);
      case 40:
        return new Token(TokenKind.PAREN_L, pos, pos + 1, _line, _col, prev);
      case 41:
        return new Token(TokenKind.PAREN_R, pos, pos + 1, _line, _col, prev);
      case 46:
        if (body.charCodeAt(pos + 1) === 46 && body.charCodeAt(pos + 2) === 46) {
          return new Token(TokenKind.SPREAD, pos, pos + 3, _line, _col, prev);
        }
        break;
      case 58:
        return new Token(TokenKind.COLON, pos, pos + 1, _line, _col, prev);
      case 61:
        return new Token(TokenKind.EQUALS, pos, pos + 1, _line, _col, prev);
      case 64:
        return new Token(TokenKind.AT, pos, pos + 1, _line, _col, prev);
      case 91:
        return new Token(TokenKind.BRACKET_L, pos, pos + 1, _line, _col, prev);
      case 93:
        return new Token(TokenKind.BRACKET_R, pos, pos + 1, _line, _col, prev);
      case 123:
        return new Token(TokenKind.BRACE_L, pos, pos + 1, _line, _col, prev);
      case 124:
        return new Token(TokenKind.PIPE, pos, pos + 1, _line, _col, prev);
      case 125:
        return new Token(TokenKind.BRACE_R, pos, pos + 1, _line, _col, prev);
      case 34:
        if (body.charCodeAt(pos + 1) === 34 && body.charCodeAt(pos + 2) === 34) {
          return readBlockString(source, pos, _line, _col, prev, lexer);
        }
        return readString(source, pos, _line, _col, prev);
      case 45:
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        return readNumber(source, pos, code, _line, _col, prev);
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 95:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
      case 120:
      case 121:
      case 122:
        return readName(source, pos, _line, _col, prev);
    }
    throw syntaxError(source, pos, unexpectedCharacterMessage(code));
  }
  var line = lexer.line;
  var col = 1 + pos - lexer.lineStart;
  return new Token(TokenKind.EOF, bodyLength, bodyLength, line, col, prev);
}
function unexpectedCharacterMessage(code) {
  if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
    return "Cannot contain the invalid character ".concat(printCharCode(code), ".");
  }
  if (code === 39) {
    return `Unexpected single quote character ('), did you mean to use a double quote (")?`;
  }
  return "Cannot parse the unexpected character ".concat(printCharCode(code), ".");
}
function readComment(source, start, line, col, prev) {
  var body = source.body;
  var code;
  var position = start;
  do {
    code = body.charCodeAt(++position);
  } while (!isNaN(code) && (code > 31 || code === 9));
  return new Token(TokenKind.COMMENT, start, position, line, col, prev, body.slice(start + 1, position));
}
function readNumber(source, start, firstCode, line, col, prev) {
  var body = source.body;
  var code = firstCode;
  var position = start;
  var isFloat = false;
  if (code === 45) {
    code = body.charCodeAt(++position);
  }
  if (code === 48) {
    code = body.charCodeAt(++position);
    if (code >= 48 && code <= 57) {
      throw syntaxError(source, position, "Invalid number, unexpected digit after 0: ".concat(printCharCode(code), "."));
    }
  } else {
    position = readDigits(source, position, code);
    code = body.charCodeAt(position);
  }
  if (code === 46) {
    isFloat = true;
    code = body.charCodeAt(++position);
    position = readDigits(source, position, code);
    code = body.charCodeAt(position);
  }
  if (code === 69 || code === 101) {
    isFloat = true;
    code = body.charCodeAt(++position);
    if (code === 43 || code === 45) {
      code = body.charCodeAt(++position);
    }
    position = readDigits(source, position, code);
    code = body.charCodeAt(position);
  }
  if (code === 46 || isNameStart(code)) {
    throw syntaxError(source, position, "Invalid number, expected digit but got: ".concat(printCharCode(code), "."));
  }
  return new Token(isFloat ? TokenKind.FLOAT : TokenKind.INT, start, position, line, col, prev, body.slice(start, position));
}
function readDigits(source, start, firstCode) {
  var body = source.body;
  var position = start;
  var code = firstCode;
  if (code >= 48 && code <= 57) {
    do {
      code = body.charCodeAt(++position);
    } while (code >= 48 && code <= 57);
    return position;
  }
  throw syntaxError(source, position, "Invalid number, expected digit but got: ".concat(printCharCode(code), "."));
}
function readString(source, start, line, col, prev) {
  var body = source.body;
  var position = start + 1;
  var chunkStart = position;
  var code = 0;
  var value = "";
  while (position < body.length && !isNaN(code = body.charCodeAt(position)) && code !== 10 && code !== 13) {
    if (code === 34) {
      value += body.slice(chunkStart, position);
      return new Token(TokenKind.STRING, start, position + 1, line, col, prev, value);
    }
    if (code < 32 && code !== 9) {
      throw syntaxError(source, position, "Invalid character within String: ".concat(printCharCode(code), "."));
    }
    ++position;
    if (code === 92) {
      value += body.slice(chunkStart, position - 1);
      code = body.charCodeAt(position);
      switch (code) {
        case 34:
          value += '"';
          break;
        case 47:
          value += "/";
          break;
        case 92:
          value += "\\";
          break;
        case 98:
          value += "\b";
          break;
        case 102:
          value += "\f";
          break;
        case 110:
          value += "\n";
          break;
        case 114:
          value += "\r";
          break;
        case 116:
          value += "	";
          break;
        case 117: {
          var charCode = uniCharCode(body.charCodeAt(position + 1), body.charCodeAt(position + 2), body.charCodeAt(position + 3), body.charCodeAt(position + 4));
          if (charCode < 0) {
            var invalidSequence = body.slice(position + 1, position + 5);
            throw syntaxError(source, position, "Invalid character escape sequence: \\u".concat(invalidSequence, "."));
          }
          value += String.fromCharCode(charCode);
          position += 4;
          break;
        }
        default:
          throw syntaxError(source, position, "Invalid character escape sequence: \\".concat(String.fromCharCode(code), "."));
      }
      ++position;
      chunkStart = position;
    }
  }
  throw syntaxError(source, position, "Unterminated string.");
}
function readBlockString(source, start, line, col, prev, lexer) {
  var body = source.body;
  var position = start + 3;
  var chunkStart = position;
  var code = 0;
  var rawValue = "";
  while (position < body.length && !isNaN(code = body.charCodeAt(position))) {
    if (code === 34 && body.charCodeAt(position + 1) === 34 && body.charCodeAt(position + 2) === 34) {
      rawValue += body.slice(chunkStart, position);
      return new Token(TokenKind.BLOCK_STRING, start, position + 3, line, col, prev, dedentBlockStringValue(rawValue));
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      throw syntaxError(source, position, "Invalid character within String: ".concat(printCharCode(code), "."));
    }
    if (code === 10) {
      ++position;
      ++lexer.line;
      lexer.lineStart = position;
    } else if (code === 13) {
      if (body.charCodeAt(position + 1) === 10) {
        position += 2;
      } else {
        ++position;
      }
      ++lexer.line;
      lexer.lineStart = position;
    } else if (code === 92 && body.charCodeAt(position + 1) === 34 && body.charCodeAt(position + 2) === 34 && body.charCodeAt(position + 3) === 34) {
      rawValue += body.slice(chunkStart, position) + '"""';
      position += 4;
      chunkStart = position;
    } else {
      ++position;
    }
  }
  throw syntaxError(source, position, "Unterminated string.");
}
function uniCharCode(a2, b2, c2, d2) {
  return char2hex(a2) << 12 | char2hex(b2) << 8 | char2hex(c2) << 4 | char2hex(d2);
}
function char2hex(a2) {
  return a2 >= 48 && a2 <= 57 ? a2 - 48 : a2 >= 65 && a2 <= 70 ? a2 - 55 : a2 >= 97 && a2 <= 102 ? a2 - 87 : -1;
}
function readName(source, start, line, col, prev) {
  var body = source.body;
  var bodyLength = body.length;
  var position = start + 1;
  var code = 0;
  while (position !== bodyLength && !isNaN(code = body.charCodeAt(position)) && (code === 95 || code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122)) {
    ++position;
  }
  return new Token(TokenKind.NAME, start, position, line, col, prev, body.slice(start, position));
}
function isNameStart(code) {
  return code === 95 || code >= 65 && code <= 90 || code >= 97 && code <= 122;
}
function parse(source, options) {
  var parser = new Parser(source, options);
  return parser.parseDocument();
}
var Parser = /* @__PURE__ */ function() {
  function Parser2(source, options) {
    var sourceObj = isSource(source) ? source : new Source(source);
    this._lexer = new Lexer(sourceObj);
    this._options = options;
  }
  var _proto = Parser2.prototype;
  _proto.parseName = function parseName() {
    var token = this.expectToken(TokenKind.NAME);
    return {
      kind: Kind.NAME,
      value: token.value,
      loc: this.loc(token)
    };
  };
  _proto.parseDocument = function parseDocument() {
    var start = this._lexer.token;
    return {
      kind: Kind.DOCUMENT,
      definitions: this.many(TokenKind.SOF, this.parseDefinition, TokenKind.EOF),
      loc: this.loc(start)
    };
  };
  _proto.parseDefinition = function parseDefinition() {
    if (this.peek(TokenKind.NAME)) {
      switch (this._lexer.token.value) {
        case "query":
        case "mutation":
        case "subscription":
          return this.parseOperationDefinition();
        case "fragment":
          return this.parseFragmentDefinition();
        case "schema":
        case "scalar":
        case "type":
        case "interface":
        case "union":
        case "enum":
        case "input":
        case "directive":
          return this.parseTypeSystemDefinition();
        case "extend":
          return this.parseTypeSystemExtension();
      }
    } else if (this.peek(TokenKind.BRACE_L)) {
      return this.parseOperationDefinition();
    } else if (this.peekDescription()) {
      return this.parseTypeSystemDefinition();
    }
    throw this.unexpected();
  };
  _proto.parseOperationDefinition = function parseOperationDefinition() {
    var start = this._lexer.token;
    if (this.peek(TokenKind.BRACE_L)) {
      return {
        kind: Kind.OPERATION_DEFINITION,
        operation: "query",
        name: void 0,
        variableDefinitions: [],
        directives: [],
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start)
      };
    }
    var operation = this.parseOperationType();
    var name;
    if (this.peek(TokenKind.NAME)) {
      name = this.parseName();
    }
    return {
      kind: Kind.OPERATION_DEFINITION,
      operation,
      name,
      variableDefinitions: this.parseVariableDefinitions(),
      directives: this.parseDirectives(false),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start)
    };
  };
  _proto.parseOperationType = function parseOperationType() {
    var operationToken = this.expectToken(TokenKind.NAME);
    switch (operationToken.value) {
      case "query":
        return "query";
      case "mutation":
        return "mutation";
      case "subscription":
        return "subscription";
    }
    throw this.unexpected(operationToken);
  };
  _proto.parseVariableDefinitions = function parseVariableDefinitions() {
    return this.optionalMany(TokenKind.PAREN_L, this.parseVariableDefinition, TokenKind.PAREN_R);
  };
  _proto.parseVariableDefinition = function parseVariableDefinition() {
    var start = this._lexer.token;
    return {
      kind: Kind.VARIABLE_DEFINITION,
      variable: this.parseVariable(),
      type: (this.expectToken(TokenKind.COLON), this.parseTypeReference()),
      defaultValue: this.expectOptionalToken(TokenKind.EQUALS) ? this.parseValueLiteral(true) : void 0,
      directives: this.parseDirectives(true),
      loc: this.loc(start)
    };
  };
  _proto.parseVariable = function parseVariable() {
    var start = this._lexer.token;
    this.expectToken(TokenKind.DOLLAR);
    return {
      kind: Kind.VARIABLE,
      name: this.parseName(),
      loc: this.loc(start)
    };
  };
  _proto.parseSelectionSet = function parseSelectionSet() {
    var start = this._lexer.token;
    return {
      kind: Kind.SELECTION_SET,
      selections: this.many(TokenKind.BRACE_L, this.parseSelection, TokenKind.BRACE_R),
      loc: this.loc(start)
    };
  };
  _proto.parseSelection = function parseSelection() {
    return this.peek(TokenKind.SPREAD) ? this.parseFragment() : this.parseField();
  };
  _proto.parseField = function parseField() {
    var start = this._lexer.token;
    var nameOrAlias = this.parseName();
    var alias;
    var name;
    if (this.expectOptionalToken(TokenKind.COLON)) {
      alias = nameOrAlias;
      name = this.parseName();
    } else {
      name = nameOrAlias;
    }
    return {
      kind: Kind.FIELD,
      alias,
      name,
      arguments: this.parseArguments(false),
      directives: this.parseDirectives(false),
      selectionSet: this.peek(TokenKind.BRACE_L) ? this.parseSelectionSet() : void 0,
      loc: this.loc(start)
    };
  };
  _proto.parseArguments = function parseArguments(isConst) {
    var item = isConst ? this.parseConstArgument : this.parseArgument;
    return this.optionalMany(TokenKind.PAREN_L, item, TokenKind.PAREN_R);
  };
  _proto.parseArgument = function parseArgument() {
    var start = this._lexer.token;
    var name = this.parseName();
    this.expectToken(TokenKind.COLON);
    return {
      kind: Kind.ARGUMENT,
      name,
      value: this.parseValueLiteral(false),
      loc: this.loc(start)
    };
  };
  _proto.parseConstArgument = function parseConstArgument() {
    var start = this._lexer.token;
    return {
      kind: Kind.ARGUMENT,
      name: this.parseName(),
      value: (this.expectToken(TokenKind.COLON), this.parseValueLiteral(true)),
      loc: this.loc(start)
    };
  };
  _proto.parseFragment = function parseFragment() {
    var start = this._lexer.token;
    this.expectToken(TokenKind.SPREAD);
    var hasTypeCondition = this.expectOptionalKeyword("on");
    if (!hasTypeCondition && this.peek(TokenKind.NAME)) {
      return {
        kind: Kind.FRAGMENT_SPREAD,
        name: this.parseFragmentName(),
        directives: this.parseDirectives(false),
        loc: this.loc(start)
      };
    }
    return {
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: hasTypeCondition ? this.parseNamedType() : void 0,
      directives: this.parseDirectives(false),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start)
    };
  };
  _proto.parseFragmentDefinition = function parseFragmentDefinition() {
    var _this$_options;
    var start = this._lexer.token;
    this.expectKeyword("fragment");
    if (((_this$_options = this._options) === null || _this$_options === void 0 ? void 0 : _this$_options.experimentalFragmentVariables) === true) {
      return {
        kind: Kind.FRAGMENT_DEFINITION,
        name: this.parseFragmentName(),
        variableDefinitions: this.parseVariableDefinitions(),
        typeCondition: (this.expectKeyword("on"), this.parseNamedType()),
        directives: this.parseDirectives(false),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start)
      };
    }
    return {
      kind: Kind.FRAGMENT_DEFINITION,
      name: this.parseFragmentName(),
      typeCondition: (this.expectKeyword("on"), this.parseNamedType()),
      directives: this.parseDirectives(false),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start)
    };
  };
  _proto.parseFragmentName = function parseFragmentName() {
    if (this._lexer.token.value === "on") {
      throw this.unexpected();
    }
    return this.parseName();
  };
  _proto.parseValueLiteral = function parseValueLiteral(isConst) {
    var token = this._lexer.token;
    switch (token.kind) {
      case TokenKind.BRACKET_L:
        return this.parseList(isConst);
      case TokenKind.BRACE_L:
        return this.parseObject(isConst);
      case TokenKind.INT:
        this._lexer.advance();
        return {
          kind: Kind.INT,
          value: token.value,
          loc: this.loc(token)
        };
      case TokenKind.FLOAT:
        this._lexer.advance();
        return {
          kind: Kind.FLOAT,
          value: token.value,
          loc: this.loc(token)
        };
      case TokenKind.STRING:
      case TokenKind.BLOCK_STRING:
        return this.parseStringLiteral();
      case TokenKind.NAME:
        this._lexer.advance();
        switch (token.value) {
          case "true":
            return {
              kind: Kind.BOOLEAN,
              value: true,
              loc: this.loc(token)
            };
          case "false":
            return {
              kind: Kind.BOOLEAN,
              value: false,
              loc: this.loc(token)
            };
          case "null":
            return {
              kind: Kind.NULL,
              loc: this.loc(token)
            };
          default:
            return {
              kind: Kind.ENUM,
              value: token.value,
              loc: this.loc(token)
            };
        }
      case TokenKind.DOLLAR:
        if (!isConst) {
          return this.parseVariable();
        }
        break;
    }
    throw this.unexpected();
  };
  _proto.parseStringLiteral = function parseStringLiteral() {
    var token = this._lexer.token;
    this._lexer.advance();
    return {
      kind: Kind.STRING,
      value: token.value,
      block: token.kind === TokenKind.BLOCK_STRING,
      loc: this.loc(token)
    };
  };
  _proto.parseList = function parseList(isConst) {
    var _this = this;
    var start = this._lexer.token;
    var item = function item2() {
      return _this.parseValueLiteral(isConst);
    };
    return {
      kind: Kind.LIST,
      values: this.any(TokenKind.BRACKET_L, item, TokenKind.BRACKET_R),
      loc: this.loc(start)
    };
  };
  _proto.parseObject = function parseObject(isConst) {
    var _this2 = this;
    var start = this._lexer.token;
    var item = function item2() {
      return _this2.parseObjectField(isConst);
    };
    return {
      kind: Kind.OBJECT,
      fields: this.any(TokenKind.BRACE_L, item, TokenKind.BRACE_R),
      loc: this.loc(start)
    };
  };
  _proto.parseObjectField = function parseObjectField(isConst) {
    var start = this._lexer.token;
    var name = this.parseName();
    this.expectToken(TokenKind.COLON);
    return {
      kind: Kind.OBJECT_FIELD,
      name,
      value: this.parseValueLiteral(isConst),
      loc: this.loc(start)
    };
  };
  _proto.parseDirectives = function parseDirectives(isConst) {
    var directives = [];
    while (this.peek(TokenKind.AT)) {
      directives.push(this.parseDirective(isConst));
    }
    return directives;
  };
  _proto.parseDirective = function parseDirective(isConst) {
    var start = this._lexer.token;
    this.expectToken(TokenKind.AT);
    return {
      kind: Kind.DIRECTIVE,
      name: this.parseName(),
      arguments: this.parseArguments(isConst),
      loc: this.loc(start)
    };
  };
  _proto.parseTypeReference = function parseTypeReference() {
    var start = this._lexer.token;
    var type;
    if (this.expectOptionalToken(TokenKind.BRACKET_L)) {
      type = this.parseTypeReference();
      this.expectToken(TokenKind.BRACKET_R);
      type = {
        kind: Kind.LIST_TYPE,
        type,
        loc: this.loc(start)
      };
    } else {
      type = this.parseNamedType();
    }
    if (this.expectOptionalToken(TokenKind.BANG)) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type,
        loc: this.loc(start)
      };
    }
    return type;
  };
  _proto.parseNamedType = function parseNamedType() {
    var start = this._lexer.token;
    return {
      kind: Kind.NAMED_TYPE,
      name: this.parseName(),
      loc: this.loc(start)
    };
  };
  _proto.parseTypeSystemDefinition = function parseTypeSystemDefinition() {
    var keywordToken = this.peekDescription() ? this._lexer.lookahead() : this._lexer.token;
    if (keywordToken.kind === TokenKind.NAME) {
      switch (keywordToken.value) {
        case "schema":
          return this.parseSchemaDefinition();
        case "scalar":
          return this.parseScalarTypeDefinition();
        case "type":
          return this.parseObjectTypeDefinition();
        case "interface":
          return this.parseInterfaceTypeDefinition();
        case "union":
          return this.parseUnionTypeDefinition();
        case "enum":
          return this.parseEnumTypeDefinition();
        case "input":
          return this.parseInputObjectTypeDefinition();
        case "directive":
          return this.parseDirectiveDefinition();
      }
    }
    throw this.unexpected(keywordToken);
  };
  _proto.peekDescription = function peekDescription() {
    return this.peek(TokenKind.STRING) || this.peek(TokenKind.BLOCK_STRING);
  };
  _proto.parseDescription = function parseDescription() {
    if (this.peekDescription()) {
      return this.parseStringLiteral();
    }
  };
  _proto.parseSchemaDefinition = function parseSchemaDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("schema");
    var directives = this.parseDirectives(true);
    var operationTypes = this.many(TokenKind.BRACE_L, this.parseOperationTypeDefinition, TokenKind.BRACE_R);
    return {
      kind: Kind.SCHEMA_DEFINITION,
      description,
      directives,
      operationTypes,
      loc: this.loc(start)
    };
  };
  _proto.parseOperationTypeDefinition = function parseOperationTypeDefinition() {
    var start = this._lexer.token;
    var operation = this.parseOperationType();
    this.expectToken(TokenKind.COLON);
    var type = this.parseNamedType();
    return {
      kind: Kind.OPERATION_TYPE_DEFINITION,
      operation,
      type,
      loc: this.loc(start)
    };
  };
  _proto.parseScalarTypeDefinition = function parseScalarTypeDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("scalar");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    return {
      kind: Kind.SCALAR_TYPE_DEFINITION,
      description,
      name,
      directives,
      loc: this.loc(start)
    };
  };
  _proto.parseObjectTypeDefinition = function parseObjectTypeDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("type");
    var name = this.parseName();
    var interfaces = this.parseImplementsInterfaces();
    var directives = this.parseDirectives(true);
    var fields = this.parseFieldsDefinition();
    return {
      kind: Kind.OBJECT_TYPE_DEFINITION,
      description,
      name,
      interfaces,
      directives,
      fields,
      loc: this.loc(start)
    };
  };
  _proto.parseImplementsInterfaces = function parseImplementsInterfaces() {
    var _this$_options2;
    if (!this.expectOptionalKeyword("implements")) {
      return [];
    }
    if (((_this$_options2 = this._options) === null || _this$_options2 === void 0 ? void 0 : _this$_options2.allowLegacySDLImplementsInterfaces) === true) {
      var types2 = [];
      this.expectOptionalToken(TokenKind.AMP);
      do {
        types2.push(this.parseNamedType());
      } while (this.expectOptionalToken(TokenKind.AMP) || this.peek(TokenKind.NAME));
      return types2;
    }
    return this.delimitedMany(TokenKind.AMP, this.parseNamedType);
  };
  _proto.parseFieldsDefinition = function parseFieldsDefinition() {
    var _this$_options3;
    if (((_this$_options3 = this._options) === null || _this$_options3 === void 0 ? void 0 : _this$_options3.allowLegacySDLEmptyFields) === true && this.peek(TokenKind.BRACE_L) && this._lexer.lookahead().kind === TokenKind.BRACE_R) {
      this._lexer.advance();
      this._lexer.advance();
      return [];
    }
    return this.optionalMany(TokenKind.BRACE_L, this.parseFieldDefinition, TokenKind.BRACE_R);
  };
  _proto.parseFieldDefinition = function parseFieldDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    var name = this.parseName();
    var args = this.parseArgumentDefs();
    this.expectToken(TokenKind.COLON);
    var type = this.parseTypeReference();
    var directives = this.parseDirectives(true);
    return {
      kind: Kind.FIELD_DEFINITION,
      description,
      name,
      arguments: args,
      type,
      directives,
      loc: this.loc(start)
    };
  };
  _proto.parseArgumentDefs = function parseArgumentDefs() {
    return this.optionalMany(TokenKind.PAREN_L, this.parseInputValueDef, TokenKind.PAREN_R);
  };
  _proto.parseInputValueDef = function parseInputValueDef() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    var name = this.parseName();
    this.expectToken(TokenKind.COLON);
    var type = this.parseTypeReference();
    var defaultValue;
    if (this.expectOptionalToken(TokenKind.EQUALS)) {
      defaultValue = this.parseValueLiteral(true);
    }
    var directives = this.parseDirectives(true);
    return {
      kind: Kind.INPUT_VALUE_DEFINITION,
      description,
      name,
      type,
      defaultValue,
      directives,
      loc: this.loc(start)
    };
  };
  _proto.parseInterfaceTypeDefinition = function parseInterfaceTypeDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("interface");
    var name = this.parseName();
    var interfaces = this.parseImplementsInterfaces();
    var directives = this.parseDirectives(true);
    var fields = this.parseFieldsDefinition();
    return {
      kind: Kind.INTERFACE_TYPE_DEFINITION,
      description,
      name,
      interfaces,
      directives,
      fields,
      loc: this.loc(start)
    };
  };
  _proto.parseUnionTypeDefinition = function parseUnionTypeDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("union");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    var types2 = this.parseUnionMemberTypes();
    return {
      kind: Kind.UNION_TYPE_DEFINITION,
      description,
      name,
      directives,
      types: types2,
      loc: this.loc(start)
    };
  };
  _proto.parseUnionMemberTypes = function parseUnionMemberTypes() {
    return this.expectOptionalToken(TokenKind.EQUALS) ? this.delimitedMany(TokenKind.PIPE, this.parseNamedType) : [];
  };
  _proto.parseEnumTypeDefinition = function parseEnumTypeDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("enum");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    var values = this.parseEnumValuesDefinition();
    return {
      kind: Kind.ENUM_TYPE_DEFINITION,
      description,
      name,
      directives,
      values,
      loc: this.loc(start)
    };
  };
  _proto.parseEnumValuesDefinition = function parseEnumValuesDefinition() {
    return this.optionalMany(TokenKind.BRACE_L, this.parseEnumValueDefinition, TokenKind.BRACE_R);
  };
  _proto.parseEnumValueDefinition = function parseEnumValueDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    return {
      kind: Kind.ENUM_VALUE_DEFINITION,
      description,
      name,
      directives,
      loc: this.loc(start)
    };
  };
  _proto.parseInputObjectTypeDefinition = function parseInputObjectTypeDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("input");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    var fields = this.parseInputFieldsDefinition();
    return {
      kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
      description,
      name,
      directives,
      fields,
      loc: this.loc(start)
    };
  };
  _proto.parseInputFieldsDefinition = function parseInputFieldsDefinition() {
    return this.optionalMany(TokenKind.BRACE_L, this.parseInputValueDef, TokenKind.BRACE_R);
  };
  _proto.parseTypeSystemExtension = function parseTypeSystemExtension() {
    var keywordToken = this._lexer.lookahead();
    if (keywordToken.kind === TokenKind.NAME) {
      switch (keywordToken.value) {
        case "schema":
          return this.parseSchemaExtension();
        case "scalar":
          return this.parseScalarTypeExtension();
        case "type":
          return this.parseObjectTypeExtension();
        case "interface":
          return this.parseInterfaceTypeExtension();
        case "union":
          return this.parseUnionTypeExtension();
        case "enum":
          return this.parseEnumTypeExtension();
        case "input":
          return this.parseInputObjectTypeExtension();
      }
    }
    throw this.unexpected(keywordToken);
  };
  _proto.parseSchemaExtension = function parseSchemaExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("schema");
    var directives = this.parseDirectives(true);
    var operationTypes = this.optionalMany(TokenKind.BRACE_L, this.parseOperationTypeDefinition, TokenKind.BRACE_R);
    if (directives.length === 0 && operationTypes.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.SCHEMA_EXTENSION,
      directives,
      operationTypes,
      loc: this.loc(start)
    };
  };
  _proto.parseScalarTypeExtension = function parseScalarTypeExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("scalar");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    if (directives.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.SCALAR_TYPE_EXTENSION,
      name,
      directives,
      loc: this.loc(start)
    };
  };
  _proto.parseObjectTypeExtension = function parseObjectTypeExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("type");
    var name = this.parseName();
    var interfaces = this.parseImplementsInterfaces();
    var directives = this.parseDirectives(true);
    var fields = this.parseFieldsDefinition();
    if (interfaces.length === 0 && directives.length === 0 && fields.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.OBJECT_TYPE_EXTENSION,
      name,
      interfaces,
      directives,
      fields,
      loc: this.loc(start)
    };
  };
  _proto.parseInterfaceTypeExtension = function parseInterfaceTypeExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("interface");
    var name = this.parseName();
    var interfaces = this.parseImplementsInterfaces();
    var directives = this.parseDirectives(true);
    var fields = this.parseFieldsDefinition();
    if (interfaces.length === 0 && directives.length === 0 && fields.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.INTERFACE_TYPE_EXTENSION,
      name,
      interfaces,
      directives,
      fields,
      loc: this.loc(start)
    };
  };
  _proto.parseUnionTypeExtension = function parseUnionTypeExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("union");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    var types2 = this.parseUnionMemberTypes();
    if (directives.length === 0 && types2.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.UNION_TYPE_EXTENSION,
      name,
      directives,
      types: types2,
      loc: this.loc(start)
    };
  };
  _proto.parseEnumTypeExtension = function parseEnumTypeExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("enum");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    var values = this.parseEnumValuesDefinition();
    if (directives.length === 0 && values.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.ENUM_TYPE_EXTENSION,
      name,
      directives,
      values,
      loc: this.loc(start)
    };
  };
  _proto.parseInputObjectTypeExtension = function parseInputObjectTypeExtension() {
    var start = this._lexer.token;
    this.expectKeyword("extend");
    this.expectKeyword("input");
    var name = this.parseName();
    var directives = this.parseDirectives(true);
    var fields = this.parseInputFieldsDefinition();
    if (directives.length === 0 && fields.length === 0) {
      throw this.unexpected();
    }
    return {
      kind: Kind.INPUT_OBJECT_TYPE_EXTENSION,
      name,
      directives,
      fields,
      loc: this.loc(start)
    };
  };
  _proto.parseDirectiveDefinition = function parseDirectiveDefinition() {
    var start = this._lexer.token;
    var description = this.parseDescription();
    this.expectKeyword("directive");
    this.expectToken(TokenKind.AT);
    var name = this.parseName();
    var args = this.parseArgumentDefs();
    var repeatable = this.expectOptionalKeyword("repeatable");
    this.expectKeyword("on");
    var locations = this.parseDirectiveLocations();
    return {
      kind: Kind.DIRECTIVE_DEFINITION,
      description,
      name,
      arguments: args,
      repeatable,
      locations,
      loc: this.loc(start)
    };
  };
  _proto.parseDirectiveLocations = function parseDirectiveLocations() {
    return this.delimitedMany(TokenKind.PIPE, this.parseDirectiveLocation);
  };
  _proto.parseDirectiveLocation = function parseDirectiveLocation() {
    var start = this._lexer.token;
    var name = this.parseName();
    if (DirectiveLocation[name.value] !== void 0) {
      return name;
    }
    throw this.unexpected(start);
  };
  _proto.loc = function loc(startToken) {
    var _this$_options4;
    if (((_this$_options4 = this._options) === null || _this$_options4 === void 0 ? void 0 : _this$_options4.noLocation) !== true) {
      return new Location(startToken, this._lexer.lastToken, this._lexer.source);
    }
  };
  _proto.peek = function peek(kind) {
    return this._lexer.token.kind === kind;
  };
  _proto.expectToken = function expectToken(kind) {
    var token = this._lexer.token;
    if (token.kind === kind) {
      this._lexer.advance();
      return token;
    }
    throw syntaxError(this._lexer.source, token.start, "Expected ".concat(getTokenKindDesc(kind), ", found ").concat(getTokenDesc(token), "."));
  };
  _proto.expectOptionalToken = function expectOptionalToken(kind) {
    var token = this._lexer.token;
    if (token.kind === kind) {
      this._lexer.advance();
      return token;
    }
    return void 0;
  };
  _proto.expectKeyword = function expectKeyword(value) {
    var token = this._lexer.token;
    if (token.kind === TokenKind.NAME && token.value === value) {
      this._lexer.advance();
    } else {
      throw syntaxError(this._lexer.source, token.start, 'Expected "'.concat(value, '", found ').concat(getTokenDesc(token), "."));
    }
  };
  _proto.expectOptionalKeyword = function expectOptionalKeyword(value) {
    var token = this._lexer.token;
    if (token.kind === TokenKind.NAME && token.value === value) {
      this._lexer.advance();
      return true;
    }
    return false;
  };
  _proto.unexpected = function unexpected(atToken) {
    var token = atToken !== null && atToken !== void 0 ? atToken : this._lexer.token;
    return syntaxError(this._lexer.source, token.start, "Unexpected ".concat(getTokenDesc(token), "."));
  };
  _proto.any = function any(openKind, parseFn, closeKind) {
    this.expectToken(openKind);
    var nodes = [];
    while (!this.expectOptionalToken(closeKind)) {
      nodes.push(parseFn.call(this));
    }
    return nodes;
  };
  _proto.optionalMany = function optionalMany(openKind, parseFn, closeKind) {
    if (this.expectOptionalToken(openKind)) {
      var nodes = [];
      do {
        nodes.push(parseFn.call(this));
      } while (!this.expectOptionalToken(closeKind));
      return nodes;
    }
    return [];
  };
  _proto.many = function many(openKind, parseFn, closeKind) {
    this.expectToken(openKind);
    var nodes = [];
    do {
      nodes.push(parseFn.call(this));
    } while (!this.expectOptionalToken(closeKind));
    return nodes;
  };
  _proto.delimitedMany = function delimitedMany(delimiterKind, parseFn) {
    this.expectOptionalToken(delimiterKind);
    var nodes = [];
    do {
      nodes.push(parseFn.call(this));
    } while (this.expectOptionalToken(delimiterKind));
    return nodes;
  };
  return Parser2;
}();
function getTokenDesc(token) {
  var value = token.value;
  return getTokenKindDesc(token.kind) + (value != null ? ' "'.concat(value, '"') : "");
}
function getTokenKindDesc(kind) {
  return isPunctuatorTokenKind(kind) ? '"'.concat(kind, '"') : kind;
}
var QueryDocumentKeys = {
  Name: [],
  Document: ["definitions"],
  OperationDefinition: ["name", "variableDefinitions", "directives", "selectionSet"],
  VariableDefinition: ["variable", "type", "defaultValue", "directives"],
  Variable: ["name"],
  SelectionSet: ["selections"],
  Field: ["alias", "name", "arguments", "directives", "selectionSet"],
  Argument: ["name", "value"],
  FragmentSpread: ["name", "directives"],
  InlineFragment: ["typeCondition", "directives", "selectionSet"],
  FragmentDefinition: [
    "name",
    "variableDefinitions",
    "typeCondition",
    "directives",
    "selectionSet"
  ],
  IntValue: [],
  FloatValue: [],
  StringValue: [],
  BooleanValue: [],
  NullValue: [],
  EnumValue: [],
  ListValue: ["values"],
  ObjectValue: ["fields"],
  ObjectField: ["name", "value"],
  Directive: ["name", "arguments"],
  NamedType: ["name"],
  ListType: ["type"],
  NonNullType: ["type"],
  SchemaDefinition: ["description", "directives", "operationTypes"],
  OperationTypeDefinition: ["type"],
  ScalarTypeDefinition: ["description", "name", "directives"],
  ObjectTypeDefinition: ["description", "name", "interfaces", "directives", "fields"],
  FieldDefinition: ["description", "name", "arguments", "type", "directives"],
  InputValueDefinition: ["description", "name", "type", "defaultValue", "directives"],
  InterfaceTypeDefinition: ["description", "name", "interfaces", "directives", "fields"],
  UnionTypeDefinition: ["description", "name", "directives", "types"],
  EnumTypeDefinition: ["description", "name", "directives", "values"],
  EnumValueDefinition: ["description", "name", "directives"],
  InputObjectTypeDefinition: ["description", "name", "directives", "fields"],
  DirectiveDefinition: ["description", "name", "arguments", "locations"],
  SchemaExtension: ["directives", "operationTypes"],
  ScalarTypeExtension: ["name", "directives"],
  ObjectTypeExtension: ["name", "interfaces", "directives", "fields"],
  InterfaceTypeExtension: ["name", "interfaces", "directives", "fields"],
  UnionTypeExtension: ["name", "directives", "types"],
  EnumTypeExtension: ["name", "directives", "values"],
  InputObjectTypeExtension: ["name", "directives", "fields"]
};
var BREAK = Object.freeze({});
function visit(root, visitor) {
  var visitorKeys = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : QueryDocumentKeys;
  var stack = void 0;
  var inArray = Array.isArray(root);
  var keys = [root];
  var index2 = -1;
  var edits = [];
  var node = void 0;
  var key = void 0;
  var parent = void 0;
  var path = [];
  var ancestors = [];
  var newRoot = root;
  do {
    index2++;
    var isLeaving = index2 === keys.length;
    var isEdited = isLeaving && edits.length !== 0;
    if (isLeaving) {
      key = ancestors.length === 0 ? void 0 : path[path.length - 1];
      node = parent;
      parent = ancestors.pop();
      if (isEdited) {
        if (inArray) {
          node = node.slice();
        } else {
          var clone2 = {};
          for (var _i2 = 0, _Object$keys2 = Object.keys(node); _i2 < _Object$keys2.length; _i2++) {
            var k2 = _Object$keys2[_i2];
            clone2[k2] = node[k2];
          }
          node = clone2;
        }
        var editOffset = 0;
        for (var ii = 0; ii < edits.length; ii++) {
          var editKey = edits[ii][0];
          var editValue = edits[ii][1];
          if (inArray) {
            editKey -= editOffset;
          }
          if (inArray && editValue === null) {
            node.splice(editKey, 1);
            editOffset++;
          } else {
            node[editKey] = editValue;
          }
        }
      }
      index2 = stack.index;
      keys = stack.keys;
      edits = stack.edits;
      inArray = stack.inArray;
      stack = stack.prev;
    } else {
      key = parent ? inArray ? index2 : keys[index2] : void 0;
      node = parent ? parent[key] : newRoot;
      if (node === null || node === void 0) {
        continue;
      }
      if (parent) {
        path.push(key);
      }
    }
    var result = void 0;
    if (!Array.isArray(node)) {
      if (!isNode(node)) {
        throw new Error("Invalid AST Node: ".concat(inspect(node), "."));
      }
      var visitFn = getVisitFn(visitor, node.kind, isLeaving);
      if (visitFn) {
        result = visitFn.call(visitor, node, key, parent, path, ancestors);
        if (result === BREAK) {
          break;
        }
        if (result === false) {
          if (!isLeaving) {
            path.pop();
            continue;
          }
        } else if (result !== void 0) {
          edits.push([key, result]);
          if (!isLeaving) {
            if (isNode(result)) {
              node = result;
            } else {
              path.pop();
              continue;
            }
          }
        }
      }
    }
    if (result === void 0 && isEdited) {
      edits.push([key, node]);
    }
    if (isLeaving) {
      path.pop();
    } else {
      var _visitorKeys$node$kin;
      stack = {
        inArray,
        index: index2,
        keys,
        edits,
        prev: stack
      };
      inArray = Array.isArray(node);
      keys = inArray ? node : (_visitorKeys$node$kin = visitorKeys[node.kind]) !== null && _visitorKeys$node$kin !== void 0 ? _visitorKeys$node$kin : [];
      index2 = -1;
      edits = [];
      if (parent) {
        ancestors.push(parent);
      }
      parent = node;
    }
  } while (stack !== void 0);
  if (edits.length !== 0) {
    newRoot = edits[edits.length - 1][1];
  }
  return newRoot;
}
function getVisitFn(visitor, kind, isLeaving) {
  var kindVisitor = visitor[kind];
  if (kindVisitor) {
    if (!isLeaving && typeof kindVisitor === "function") {
      return kindVisitor;
    }
    var kindSpecificVisitor = isLeaving ? kindVisitor.leave : kindVisitor.enter;
    if (typeof kindSpecificVisitor === "function") {
      return kindSpecificVisitor;
    }
  } else {
    var specificVisitor = isLeaving ? visitor.leave : visitor.enter;
    if (specificVisitor) {
      if (typeof specificVisitor === "function") {
        return specificVisitor;
      }
      var specificKindVisitor = specificVisitor[kind];
      if (typeof specificKindVisitor === "function") {
        return specificKindVisitor;
      }
    }
  }
}
function print(ast) {
  return visit(ast, {
    leave: printDocASTReducer
  });
}
var MAX_LINE_LENGTH = 80;
var printDocASTReducer = {
  Name: function Name(node) {
    return node.value;
  },
  Variable: function Variable(node) {
    return "$" + node.name;
  },
  Document: function Document(node) {
    return join(node.definitions, "\n\n") + "\n";
  },
  OperationDefinition: function OperationDefinition(node) {
    var op = node.operation;
    var name = node.name;
    var varDefs = wrap("(", join(node.variableDefinitions, ", "), ")");
    var directives = join(node.directives, " ");
    var selectionSet = node.selectionSet;
    return !name && !directives && !varDefs && op === "query" ? selectionSet : join([op, join([name, varDefs]), directives, selectionSet], " ");
  },
  VariableDefinition: function VariableDefinition(_ref3) {
    var variable = _ref3.variable, type = _ref3.type, defaultValue = _ref3.defaultValue, directives = _ref3.directives;
    return variable + ": " + type + wrap(" = ", defaultValue) + wrap(" ", join(directives, " "));
  },
  SelectionSet: function SelectionSet(_ref22) {
    var selections = _ref22.selections;
    return block(selections);
  },
  Field: function Field(_ref3) {
    var alias = _ref3.alias, name = _ref3.name, args = _ref3.arguments, directives = _ref3.directives, selectionSet = _ref3.selectionSet;
    var prefix = wrap("", alias, ": ") + name;
    var argsLine = prefix + wrap("(", join(args, ", "), ")");
    if (argsLine.length > MAX_LINE_LENGTH) {
      argsLine = prefix + wrap("(\n", indent(join(args, "\n")), "\n)");
    }
    return join([argsLine, join(directives, " "), selectionSet], " ");
  },
  Argument: function Argument(_ref4) {
    var name = _ref4.name, value = _ref4.value;
    return name + ": " + value;
  },
  FragmentSpread: function FragmentSpread(_ref5) {
    var name = _ref5.name, directives = _ref5.directives;
    return "..." + name + wrap(" ", join(directives, " "));
  },
  InlineFragment: function InlineFragment(_ref6) {
    var typeCondition = _ref6.typeCondition, directives = _ref6.directives, selectionSet = _ref6.selectionSet;
    return join(["...", wrap("on ", typeCondition), join(directives, " "), selectionSet], " ");
  },
  FragmentDefinition: function FragmentDefinition(_ref7) {
    var name = _ref7.name, typeCondition = _ref7.typeCondition, variableDefinitions = _ref7.variableDefinitions, directives = _ref7.directives, selectionSet = _ref7.selectionSet;
    return "fragment ".concat(name).concat(wrap("(", join(variableDefinitions, ", "), ")"), " ") + "on ".concat(typeCondition, " ").concat(wrap("", join(directives, " "), " ")) + selectionSet;
  },
  IntValue: function IntValue(_ref8) {
    var value = _ref8.value;
    return value;
  },
  FloatValue: function FloatValue(_ref9) {
    var value = _ref9.value;
    return value;
  },
  StringValue: function StringValue(_ref10, key) {
    var value = _ref10.value, isBlockString = _ref10.block;
    return isBlockString ? printBlockString(value, key === "description" ? "" : "  ") : JSON.stringify(value);
  },
  BooleanValue: function BooleanValue(_ref11) {
    var value = _ref11.value;
    return value ? "true" : "false";
  },
  NullValue: function NullValue() {
    return "null";
  },
  EnumValue: function EnumValue(_ref12) {
    var value = _ref12.value;
    return value;
  },
  ListValue: function ListValue(_ref13) {
    var values = _ref13.values;
    return "[" + join(values, ", ") + "]";
  },
  ObjectValue: function ObjectValue(_ref14) {
    var fields = _ref14.fields;
    return "{" + join(fields, ", ") + "}";
  },
  ObjectField: function ObjectField(_ref15) {
    var name = _ref15.name, value = _ref15.value;
    return name + ": " + value;
  },
  Directive: function Directive(_ref16) {
    var name = _ref16.name, args = _ref16.arguments;
    return "@" + name + wrap("(", join(args, ", "), ")");
  },
  NamedType: function NamedType(_ref17) {
    var name = _ref17.name;
    return name;
  },
  ListType: function ListType(_ref18) {
    var type = _ref18.type;
    return "[" + type + "]";
  },
  NonNullType: function NonNullType(_ref19) {
    var type = _ref19.type;
    return type + "!";
  },
  SchemaDefinition: addDescription(function(_ref20) {
    var directives = _ref20.directives, operationTypes = _ref20.operationTypes;
    return join(["schema", join(directives, " "), block(operationTypes)], " ");
  }),
  OperationTypeDefinition: function OperationTypeDefinition(_ref21) {
    var operation = _ref21.operation, type = _ref21.type;
    return operation + ": " + type;
  },
  ScalarTypeDefinition: addDescription(function(_ref22) {
    var name = _ref22.name, directives = _ref22.directives;
    return join(["scalar", name, join(directives, " ")], " ");
  }),
  ObjectTypeDefinition: addDescription(function(_ref23) {
    var name = _ref23.name, interfaces = _ref23.interfaces, directives = _ref23.directives, fields = _ref23.fields;
    return join(["type", name, wrap("implements ", join(interfaces, " & ")), join(directives, " "), block(fields)], " ");
  }),
  FieldDefinition: addDescription(function(_ref24) {
    var name = _ref24.name, args = _ref24.arguments, type = _ref24.type, directives = _ref24.directives;
    return name + (hasMultilineItems(args) ? wrap("(\n", indent(join(args, "\n")), "\n)") : wrap("(", join(args, ", "), ")")) + ": " + type + wrap(" ", join(directives, " "));
  }),
  InputValueDefinition: addDescription(function(_ref25) {
    var name = _ref25.name, type = _ref25.type, defaultValue = _ref25.defaultValue, directives = _ref25.directives;
    return join([name + ": " + type, wrap("= ", defaultValue), join(directives, " ")], " ");
  }),
  InterfaceTypeDefinition: addDescription(function(_ref26) {
    var name = _ref26.name, interfaces = _ref26.interfaces, directives = _ref26.directives, fields = _ref26.fields;
    return join(["interface", name, wrap("implements ", join(interfaces, " & ")), join(directives, " "), block(fields)], " ");
  }),
  UnionTypeDefinition: addDescription(function(_ref27) {
    var name = _ref27.name, directives = _ref27.directives, types2 = _ref27.types;
    return join(["union", name, join(directives, " "), types2 && types2.length !== 0 ? "= " + join(types2, " | ") : ""], " ");
  }),
  EnumTypeDefinition: addDescription(function(_ref28) {
    var name = _ref28.name, directives = _ref28.directives, values = _ref28.values;
    return join(["enum", name, join(directives, " "), block(values)], " ");
  }),
  EnumValueDefinition: addDescription(function(_ref29) {
    var name = _ref29.name, directives = _ref29.directives;
    return join([name, join(directives, " ")], " ");
  }),
  InputObjectTypeDefinition: addDescription(function(_ref30) {
    var name = _ref30.name, directives = _ref30.directives, fields = _ref30.fields;
    return join(["input", name, join(directives, " "), block(fields)], " ");
  }),
  DirectiveDefinition: addDescription(function(_ref31) {
    var name = _ref31.name, args = _ref31.arguments, repeatable = _ref31.repeatable, locations = _ref31.locations;
    return "directive @" + name + (hasMultilineItems(args) ? wrap("(\n", indent(join(args, "\n")), "\n)") : wrap("(", join(args, ", "), ")")) + (repeatable ? " repeatable" : "") + " on " + join(locations, " | ");
  }),
  SchemaExtension: function SchemaExtension(_ref32) {
    var directives = _ref32.directives, operationTypes = _ref32.operationTypes;
    return join(["extend schema", join(directives, " "), block(operationTypes)], " ");
  },
  ScalarTypeExtension: function ScalarTypeExtension(_ref33) {
    var name = _ref33.name, directives = _ref33.directives;
    return join(["extend scalar", name, join(directives, " ")], " ");
  },
  ObjectTypeExtension: function ObjectTypeExtension(_ref34) {
    var name = _ref34.name, interfaces = _ref34.interfaces, directives = _ref34.directives, fields = _ref34.fields;
    return join(["extend type", name, wrap("implements ", join(interfaces, " & ")), join(directives, " "), block(fields)], " ");
  },
  InterfaceTypeExtension: function InterfaceTypeExtension(_ref35) {
    var name = _ref35.name, interfaces = _ref35.interfaces, directives = _ref35.directives, fields = _ref35.fields;
    return join(["extend interface", name, wrap("implements ", join(interfaces, " & ")), join(directives, " "), block(fields)], " ");
  },
  UnionTypeExtension: function UnionTypeExtension(_ref36) {
    var name = _ref36.name, directives = _ref36.directives, types2 = _ref36.types;
    return join(["extend union", name, join(directives, " "), types2 && types2.length !== 0 ? "= " + join(types2, " | ") : ""], " ");
  },
  EnumTypeExtension: function EnumTypeExtension(_ref37) {
    var name = _ref37.name, directives = _ref37.directives, values = _ref37.values;
    return join(["extend enum", name, join(directives, " "), block(values)], " ");
  },
  InputObjectTypeExtension: function InputObjectTypeExtension(_ref38) {
    var name = _ref38.name, directives = _ref38.directives, fields = _ref38.fields;
    return join(["extend input", name, join(directives, " "), block(fields)], " ");
  }
};
function addDescription(cb) {
  return function(node) {
    return join([node.description, cb(node)], "\n");
  };
}
function join(maybeArray) {
  var _maybeArray$filter$jo;
  var separator = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "";
  return (_maybeArray$filter$jo = maybeArray === null || maybeArray === void 0 ? void 0 : maybeArray.filter(function(x2) {
    return x2;
  }).join(separator)) !== null && _maybeArray$filter$jo !== void 0 ? _maybeArray$filter$jo : "";
}
function block(array) {
  return wrap("{\n", indent(join(array, "\n")), "\n}");
}
function wrap(start, maybeString) {
  var end = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "";
  return maybeString != null && maybeString !== "" ? start + maybeString + end : "";
}
function indent(str) {
  return wrap("  ", str.replace(/\n/g, "\n  "));
}
function isMultiline(str) {
  return str.indexOf("\n") !== -1;
}
function hasMultilineItems(maybeArray) {
  return maybeArray != null && maybeArray.some(isMultiline);
}
function k$1(a2) {
  return typeof a2 == "string" ? new GraphQLError(a2) : typeof a2 == "object" && a2.message ? new GraphQLError(a2.message, a2.nodes, a2.source, a2.positions, a2.path, a2, a2.extensions || {}) : a2;
}
function l$1() {
  return this.message;
}
function n$2(a2, b2) {
  a2 |= 0;
  for (var c2 = 0, d2 = 0 | b2.length; c2 < d2; c2++) {
    a2 = (a2 << 5) + a2 + b2.charCodeAt(c2);
  }
  return a2;
}
function t$2(a2) {
  var b2, c2, d2, e2, f2, g2;
  if (a2 === null || q.has(a2)) {
    return "null";
  }
  if (typeof a2 != "object") {
    return JSON.stringify(a2) || "";
  }
  if (a2.toJSON) {
    return t$2(a2.toJSON());
  }
  if (Array.isArray(a2)) {
    for (b2 = "[", c2 = 0, d2 = a2.length; c2 < d2; c2++) {
      0 < c2 && (b2 += ",");
      b2 += 0 < (e2 = t$2(a2[c2])).length ? e2 : "null";
    }
    return b2 + "]";
  }
  if (!(b2 = Object.keys(a2).sort()).length && a2.constructor && a2.constructor !== Object) {
    return b2 = r$2.get(a2) || Math.random().toString(36).slice(2), r$2.set(a2, b2), '{"__key":"' + b2 + '"}';
  }
  q.add(a2);
  c2 = "{";
  d2 = 0;
  for (e2 = b2.length; d2 < e2; d2++) {
    (g2 = t$2(a2[f2 = b2[d2]])) && (1 < c2.length && (c2 += ","), c2 += t$2(f2) + ":" + g2);
  }
  q.delete(a2);
  return c2 + "}";
}
function u$2(a2) {
  q.clear();
  return t$2(a2);
}
function v$2(a2) {
  var b2 = (typeof a2 != "string" ? a2.loc && a2.loc.source.body || print(a2) : a2).replace(/([\s,]|#[^\n\r]+)+/g, " ").trim();
  typeof a2 != "string" && (a2.loc ? (a2 = "definitions" in a2 && w$2(a2)) && (b2 = "# " + a2 + "\n" + b2) : a2.loc = {
    start: 0,
    end: b2.length,
    source: {
      body: b2,
      name: "gql",
      locationOffset: {
        line: 1,
        column: 1
      }
    }
  });
  return b2;
}
function y$2(a2) {
  if (typeof a2 == "string") {
    var b2 = n$2(5381, v$2(a2)) >>> 0;
    a2 = x$2.get(b2) || parse(a2, {
      noLocation: true
    });
  } else {
    b2 = a2.__key || n$2(5381, v$2(a2)) >>> 0, a2 = x$2.get(b2) || a2;
  }
  a2.loc || v$2(a2);
  a2.__key = b2;
  x$2.set(b2, a2);
  return a2;
}
function w$2(a2) {
  var b2, c2, d2;
  for (b2 = 0, c2 = a2.definitions.length; b2 < c2; b2++) {
    if ((d2 = a2.definitions[b2]).kind === Kind.OPERATION_DEFINITION && d2.name) {
      return d2.name.value;
    }
  }
}
function z$2(a2, b2, c2) {
  return {
    operation: a2,
    data: b2.data,
    error: Array.isArray(b2.errors) ? new m$1({
      graphQLErrors: b2.errors,
      response: c2
    }) : void 0,
    extensions: typeof b2.extensions == "object" && b2.extensions || void 0
  };
}
function A(a2, b2, c2) {
  return {
    operation: a2,
    data: void 0,
    error: new m$1({
      networkError: b2,
      response: c2
    }),
    extensions: void 0
  };
}
function B$1() {
  return (B$1 = Object.assign || function(a2) {
    var b2, c2, d2;
    for (b2 = 1; b2 < arguments.length; b2++) {
      c2 = arguments[b2];
      for (d2 in c2) {
        Object.prototype.hasOwnProperty.call(c2, d2) && (a2[d2] = c2[d2]);
      }
    }
    return a2;
  }).apply(this, arguments);
}
function makeFetchBody(a2) {
  return {
    query: print(a2.query),
    operationName: w$2(a2.query),
    variables: a2.variables || void 0,
    extensions: void 0
  };
}
function makeFetchURL(a2, b2) {
  var c2 = a2.context.url;
  if (a2.kind !== "query" || !a2.context.preferGetMethod || !b2) {
    return c2;
  }
  a2 = [];
  b2.operationName && a2.push("operationName=" + encodeURIComponent(b2.operationName));
  b2.query && a2.push("query=" + encodeURIComponent(b2.query.replace(/([\s,]|#[^\n\r]+)+/g, " ").trim()));
  b2.variables && a2.push("variables=" + encodeURIComponent(u$2(b2.variables)));
  b2.extensions && a2.push("extensions=" + encodeURIComponent(u$2(b2.extensions)));
  return c2 + "?" + a2.join("&");
}
function makeFetchOptions(a2, b2) {
  var c2 = a2.kind === "query" && !!a2.context.preferGetMethod;
  return B$1({}, a2 = typeof a2.context.fetchOptions == "function" ? a2.context.fetchOptions() : a2.context.fetchOptions || {}, {
    body: !c2 && b2 ? JSON.stringify(b2) : void 0,
    method: c2 ? "GET" : "POST",
    headers: c2 ? a2.headers : B$1({}, {
      "content-type": "application/json"
    }, a2.headers)
  });
}
function makeFetchSource(a2, b2, c2) {
  return make$1(function(d2) {
    var e2 = d2.next, f2 = d2.complete, g2 = typeof AbortController != "undefined" ? new AbortController() : null, p2 = false;
    Promise.resolve().then(function() {
      if (!p2) {
        return g2 && (c2.signal = g2.signal), function C2(a3, b3, c3) {
          var e3, d3 = false;
          return (a3.context.fetch || fetch)(b3, c3).then(function(a4) {
            e3 = a4;
            d3 = 200 > a4.status || a4.status >= (c3.redirect === "manual" ? 400 : 300);
            return a4.json();
          }).then(function(b4) {
            if (!("data" in b4) && !("errors" in b4)) {
              throw Error("No Content");
            }
            return z$2(a3, b4, e3);
          }).catch(function(b4) {
            if (b4.name !== "AbortError") {
              return A(a3, d3 ? Error(e3.statusText) : b4, e3);
            }
          });
        }(a2, b2, c2);
      }
    }).then(function(a3) {
      p2 || (p2 = true, a3 && e2(a3), f2());
    });
    return function() {
      p2 = true;
      g2 && g2.abort();
    };
  });
}
function createRequest(a2, b2) {
  a2 = y$2(a2);
  return {
    key: b2 ? n$2(a2.__key, u$2(b2)) >>> 0 : a2.__key,
    query: a2,
    variables: b2 || {}
  };
}
var m$1, q, r$2, x$2;
m$1 = function(a2) {
  function b2(b3) {
    var f2, c2 = b3.networkError, e2 = b3.response;
    f2 = function h2(a3, b4) {
      var d2 = "";
      if (a3 !== void 0) {
        return d2 = "[Network] " + a3.message;
      }
      b4 !== void 0 && b4.forEach(function c3(a4) {
        d2 += "[GraphQL] " + a4.message + "\n";
      });
      return d2.trim();
    }(c2, b3 = (b3.graphQLErrors || []).map(k$1));
    a2.call(this, f2);
    this.name = "CombinedError";
    this.message = f2;
    this.graphQLErrors = b3;
    this.networkError = c2;
    this.response = e2;
  }
  a2 && (b2.__proto__ = a2);
  (b2.prototype = Object.create(a2 && a2.prototype)).constructor = b2;
  b2.prototype.toString = l$1;
  return b2;
}(Error);
q = new Set(), r$2 = new WeakMap();
x$2 = new Map();
function n$1(a2, b2) {
  if (Array.isArray(a2)) {
    for (var c2 = 0; c2 < a2.length; c2++) {
      n$1(a2[c2], b2);
    }
  } else if (typeof a2 == "object" && a2 !== null) {
    for (c2 in a2) {
      c2 === "__typename" && typeof a2[c2] == "string" ? b2[a2[c2]] = 0 : n$1(a2[c2], b2);
    }
  }
  return b2;
}
function p$1(a2) {
  return a2.kind === Kind.FIELD && a2.name.value === "__typename" && !a2.alias;
}
function r$1(a2) {
  if (a2.selectionSet && !a2.selectionSet.selections.some(p$1)) {
    return B$1({}, a2, {
      selectionSet: B$1({}, a2.selectionSet, {
        selections: a2.selectionSet.selections.concat([{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: "__typename"
          }
        }])
      })
    });
  }
}
function u$1(a2) {
  a2 = y$2(a2);
  var b2 = t$1.get(a2.__key);
  b2 || ((b2 = visit(a2, {
    Field: r$1,
    InlineFragment: r$1
  })).__key = a2.__key, t$1.set(a2.__key, b2));
  return b2;
}
function v$1(a2) {
  return a2 && typeof a2 == "object" ? Object.keys(a2).reduce(function(b2, c2) {
    var d2 = a2[c2];
    c2 === "__typename" ? Object.defineProperty(b2, "__typename", {
      enumerable: false,
      value: d2
    }) : Array.isArray(d2) ? b2[c2] = d2.map(v$1) : b2[c2] = d2 && typeof d2 == "object" && "__typename" in d2 ? v$1(d2) : d2;
    return b2;
  }, {}) : a2;
}
function w$1(a2) {
  a2.toPromise = function() {
    return toPromise$1(take$1(1)(a2));
  };
  return a2;
}
function x$1(a2, b2, c2) {
  c2 || (c2 = b2.context);
  return {
    key: b2.key,
    query: b2.query,
    variables: b2.variables,
    kind: a2,
    context: c2
  };
}
function y$1(a2, b2) {
  return x$1(a2.kind, a2, B$1({}, a2.context, {
    meta: B$1({}, a2.context.meta, b2)
  }));
}
function z$1() {
}
function D(a2) {
  return (a2 = a2.kind) !== "mutation" && a2 !== "query";
}
function E$1(a2) {
  var b2 = x$1(a2.kind, a2);
  b2.query = u$1(a2.query);
  return b2;
}
function F(a2) {
  return a2.kind !== "query" || a2.context.requestPolicy !== "cache-only";
}
function G(a2) {
  return y$1(a2, {
    cacheOutcome: "miss"
  });
}
function H(a2) {
  return D(a2);
}
function I$1(a2) {
  function b2(a3) {
    var b3 = a3.context.requestPolicy;
    return a3.kind === "query" && b3 !== "network-only" && (b3 === "cache-only" || k2.has(a3.key));
  }
  function c2(a3) {
    var c3 = k2.get(a3.key);
    c3 = B$1({}, c3, {
      operation: y$1(a3, {
        cacheOutcome: c3 ? "hit" : "miss"
      })
    });
    a3.context.requestPolicy === "cache-and-network" && (c3.stale = true, J(m2, a3));
    return c3;
  }
  function d2(a3) {
    return !D(a3) && b2(a3);
  }
  function e2(a3) {
    function c3(a4) {
      g3.add(a4);
    }
    var e3, g3, l2, d3 = a3.operation;
    if (d3) {
      e3 = Object.keys(n$1(a3.data, {})).concat(d3.context.additionalTypenames || []);
      if (a3.operation.kind === "mutation") {
        g3 = new Set();
        for (a3 = 0; a3 < e3.length; a3++) {
          (l2 = h2[l2 = e3[a3]] || (h2[l2] = new Set())).forEach(c3);
          l2.clear();
        }
        g3.forEach(function b3(a4) {
          k2.has(a4) && (d3 = k2.get(a4).operation, k2.delete(a4), J(m2, d3));
        });
      } else if (d3.kind === "query" && a3.data) {
        for (k2.set(d3.key, a3), a3 = 0; a3 < e3.length; a3++) {
          (h2[l2 = e3[a3]] || (h2[l2] = new Set())).add(d3.key);
        }
      }
    }
  }
  function f2(a3) {
    return !D(a3) && !b2(a3);
  }
  var g2 = a2.forward, m2 = a2.client;
  a2.dispatchDebug;
  var k2 = new Map(), h2 = Object.create(null);
  return function(a3) {
    var b3 = share$1(a3);
    a3 = map$1(c2)(filter$1(d2)(b3));
    b3 = H$1(e2)(g2(filter$1(F)(map$1(G)(merge$1([map$1(E$1)(filter$1(f2)(b3)), filter$1(H)(b3)])))));
    return merge$1([a3, b3]);
  };
}
function J(a2, b2) {
  return a2.reexecuteOperation(x$1(b2.kind, b2, B$1({}, b2.context, {
    requestPolicy: "network-only"
  })));
}
function M$1(a2) {
  function b2(a3) {
    f2.delete(a3.operation.key);
  }
  function c2(a3) {
    var c3 = a3.key, b3 = a3.kind;
    if (b3 === "teardown") {
      return f2.delete(c3), true;
    }
    if (b3 !== "query" && b3 !== "subscription") {
      return true;
    }
    b3 = f2.has(c3);
    f2.add(c3);
    b3 && false;
    return !b3;
  }
  var d2 = a2.forward, e2 = a2.dispatchDebug, f2 = new Set();
  return function(a3) {
    a3 = filter$1(c2)(a3);
    return H$1(b2)(d2(a3));
  };
}
function N(a2) {
  return a2.kind === "query" || a2.kind === "mutation";
}
function O(a2) {
  return a2.kind !== "query" && a2.kind !== "mutation";
}
function P(a2) {
  var b2 = a2.forward;
  a2.dispatchDebug;
  return function(a3) {
    var f2, d2 = share$1(a3);
    a3 = D$1(function(a4) {
      var b3 = a4.key, e2 = filter$1(function(a5) {
        return a5.kind === "teardown" && a5.key === b3;
      })(d2), g2 = makeFetchBody(a4), h2 = makeFetchURL(a4, g2), l2 = makeFetchOptions(a4, g2);
      return H$1(function(b4) {
        b4.data ? void 0 : b4.error;
      })(takeUntil$1(e2)(makeFetchSource(a4, h2, l2)));
    })(filter$1(N)(d2));
    f2 = b2(filter$1(O)(d2));
    return merge$1([a3, f2]);
  };
}
function Q() {
  return false;
}
function R(a2) {
  function b2(a3) {
    if (a3.kind !== "teardown" && false) {
      var b3 = 'No exchange has handled operations of kind "' + a3.kind + `". Check whether you've added an exchange responsible for these operations.`;
      console.warn(b3);
    }
  }
  a2.dispatchDebug;
  return function(a3) {
    return filter$1(Q)(H$1(b2)(a3));
  };
}
function T(a2) {
  return function(b2) {
    var c2 = b2.client;
    b2.dispatchDebug;
    return a2.reduceRight(function(a3, b3) {
      return b3({
        client: c2,
        forward: a3,
        dispatchDebug: function(a4) {
        }
      });
    }, b2.forward);
  };
}
function V(a2) {
  var d2, e2, g2, m2, c2 = this;
  this.activeOperations = Object.create(null);
  this.queue = [];
  this.createOperationContext = function(a3) {
    a3 || (a3 = {});
    return B$1({}, {
      url: c2.url,
      fetchOptions: c2.fetchOptions,
      fetch: c2.fetch,
      preferGetMethod: c2.preferGetMethod
    }, a3, {
      suspense: a3.suspense || a3.suspense !== false && c2.suspense,
      requestPolicy: a3.requestPolicy || c2.requestPolicy
    });
  };
  this.createRequestOperation = function(a3, b2, d3) {
    return x$1(a3, b2, c2.createOperationContext(d3));
  };
  this.executeQuery = function(a3, b2) {
    a3 = c2.createRequestOperation("query", a3, b2);
    return c2.executeRequestOperation(a3);
  };
  this.executeSubscription = function(a3, b2) {
    a3 = c2.createRequestOperation("subscription", a3, b2);
    return c2.executeRequestOperation(a3);
  };
  this.executeMutation = function(a3, b2) {
    a3 = c2.createRequestOperation("mutation", a3, b2);
    return c2.executeRequestOperation(a3);
  };
  d2 = z$1;
  this.url = a2.url;
  this.fetchOptions = a2.fetchOptions;
  this.fetch = a2.fetch;
  this.suspense = !!a2.suspense;
  this.requestPolicy = a2.requestPolicy || "cache-first";
  this.preferGetMethod = !!a2.preferGetMethod;
  this.maskTypename = !!a2.maskTypename;
  e2 = makeSubject$1();
  g2 = e2.next;
  this.operations$ = e2.source;
  m2 = false;
  this.dispatchOperation = function(a3) {
    m2 = true;
    for (a3 && g2(a3); a3 = c2.queue.shift(); ) {
      g2(a3);
    }
    m2 = false;
  };
  this.reexecuteOperation = function(a3) {
    if (a3.kind === "mutation" || 0 < (c2.activeOperations[a3.key] || 0)) {
      c2.queue.push(a3), m2 || Promise.resolve().then(c2.dispatchOperation);
    }
  };
  a2 = T(a2.exchanges !== void 0 ? a2.exchanges : U);
  this.results$ = share$1(a2({
    client: this,
    dispatchDebug: d2,
    forward: R({
      dispatchDebug: d2
    })
  })(this.operations$));
  publish$1(this.results$);
}
function W$1(a2) {
  a2.data = v$1(a2.data);
  return a2;
}
function createClient(a2) {
  return new V(a2);
}
var t$1, U;
t$1 = new Map();
R({
  dispatchDebug: z$1
});
U = [M$1, I$1, P];
V.prototype.onOperationStart = function(a2) {
  var b2 = a2.key;
  this.activeOperations[b2] = (this.activeOperations[b2] || 0) + 1;
  this.dispatchOperation(a2);
};
V.prototype.onOperationEnd = function(a2) {
  var b2 = a2.key, c2 = this.activeOperations[b2] || 0;
  if (0 >= (this.activeOperations[b2] = 0 >= c2 ? 0 : c2 - 1)) {
    for (b2 = this.queue.length - 1; 0 <= b2; b2--) {
      this.queue[b2].key === a2.key && this.queue.splice(b2, 1);
    }
    this.dispatchOperation(x$1("teardown", a2, a2.context));
  }
};
V.prototype.executeRequestOperation = function(a2) {
  var e2, f2, c2 = this, d2 = filter$1(function(b2) {
    return b2.operation.key === a2.key;
  })(this.results$);
  this.maskTypename && (d2 = map$1(W$1)(d2));
  if (a2.kind === "mutation") {
    return take$1(1)(onStart$1(function b2() {
      return c2.dispatchOperation(a2);
    })(d2));
  }
  e2 = filter$1(function(b2) {
    return b2.kind === "teardown" && b2.key === a2.key;
  })(this.operations$), f2 = filter$1(function(b2) {
    return b2.kind === a2.kind && b2.key === a2.key && b2.context.requestPolicy !== "cache-only";
  })(this.operations$);
  return onEnd$1(function() {
    c2.onOperationEnd(a2);
  })(onStart$1(function() {
    c2.onOperationStart(a2);
  })(K(function(a3) {
    return a3.stale ? fromValue$1(a3) : merge$1([fromValue$1(a3), map$1(function() {
      return B$1({}, a3, {
        stale: true
      });
    })(take$1(1)(f2))]);
  })(takeUntil$1(e2)(d2))));
};
V.prototype.query = function(a2, b2, c2) {
  c2 && typeof c2.suspense == "boolean" || (c2 = B$1({}, c2, {
    suspense: false
  }));
  return w$1(this.executeQuery(createRequest(a2, b2), c2));
};
V.prototype.readQuery = function(a2, b2, c2) {
  var d2 = null;
  N$1(function(a3) {
    d2 = a3;
  })(this.executeQuery(createRequest(a2, b2), c2)).unsubscribe();
  return d2;
};
V.prototype.subscription = function(a2, b2, c2) {
  return this.executeSubscription(createRequest(a2, b2), c2);
};
V.prototype.mutation = function(a2, b2, c2) {
  return w$1(this.executeMutation(createRequest(a2, b2), c2));
};
const subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = [];
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (let i2 = 0; i2 < subscribers.length; i2 += 1) {
          const s2 = subscribers[i2];
          s2[1]();
          subscriber_queue.push(s2, value);
        }
        if (run_queue) {
          for (let i2 = 0; i2 < subscriber_queue.length; i2 += 2) {
            subscriber_queue[i2][0](subscriber_queue[i2 + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      const index2 = subscribers.indexOf(subscriber);
      if (index2 !== -1) {
        subscribers.splice(index2, 1);
      }
      if (subscribers.length === 0) {
        stop();
        stop = null;
      }
    };
  }
  return {set, update, subscribe: subscribe2};
}
function _extends() {
  return (_extends = Object.assign || function(target) {
    var i2, source, key;
    for (i2 = 1; i2 < arguments.length; i2++) {
      source = arguments[i2];
      for (key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }).apply(this, arguments);
}
function operationStore(query2, variables, context) {
  var internal = {
    query: query2,
    variables: variables || null,
    context
  }, state = {
    stale: false,
    fetching: true,
    data: void 0,
    error: void 0,
    extensions: void 0
  }, svelteStore = writable(state), _internalUpdate = false;
  state.set = function set(value) {
    var key$1;
    if (!value || value === state) {
      value = emptyUpdate;
    }
    _internalUpdate = true;
    for (key$1 in value) {
      if (key$1 === "query" || key$1 === "variables" || key$1 === "context") {
        internal[key$1] = value[key$1];
      } else if (key$1 === "fetching") {
        state[key$1] = !!value[key$1];
      } else if (key$1 in state) {
        state[key$1] = value[key$1];
      }
    }
    state.stale = !!value.stale;
    _internalUpdate = false;
    svelteStore.set(state);
  };
  state.update = function update(fn) {
    state.set(fn(state));
  };
  state.subscribe = function subscribe2(run2, invalidate) {
    return svelteStore.subscribe(run2, invalidate);
  };
  Object.keys(internal).forEach(function(prop) {
    Object.defineProperty(state, prop, {
      configurable: false,
      get: function() {
        return internal[prop];
      },
      set: function set(value) {
        internal[prop] = value;
        if (!_internalUpdate) {
          svelteStore.set(state);
        }
      }
    });
  });
  return state;
}
function toSource(store) {
  return make$1(function(observer) {
    var $request, $contextKey;
    return store.subscribe(function(state) {
      var request = createRequest(state.query, state.variables), contextKey = u$2(request.context = state.context);
      if ($request === void 0 || request.key !== $request.key || $contextKey === void 0 || contextKey !== $contextKey) {
        $contextKey = contextKey;
        $request = request;
        observer.next(request);
      }
    });
  });
}
function _ref(result, partial) {
  return _extends({}, result, partial);
}
function _ref2(result) {
  return _extends({}, {
    fetching: false
  }, result, {
    stale: !!result.stale
  });
}
function query(store) {
  var client = getClient(), subscription = N$1(function(update) {
    _markStoreUpdate(update);
    store.set(update);
  })(scan$1(_ref, baseState)(K(function(request) {
    if (request.context && request.context.pause) {
      return fromValue$1({
        fetching: false,
        stale: false
      });
    }
    return concat$1([fromValue$1({
      fetching: true,
      stale: false
    }), map$1(_ref2)(client.executeQuery(request, request.context)), fromValue$1({
      fetching: false,
      stale: false
    })]);
  })(toSource(store))));
  onDestroy(subscription.unsubscribe);
  return store;
}
var _contextKey, _markStoreUpdate, emptyUpdate, getClient, setClient, baseState;
_contextKey = "$$_urql";
_markStoreUpdate = function() {
  return;
};
emptyUpdate = Object.create(null);
getClient = function() {
  return getContext(_contextKey);
};
setClient = function(client) {
  setContext(_contextKey, client);
};
baseState = {
  fetching: false,
  stale: false,
  error: void 0,
  data: void 0,
  extensions: void 0
};
var {toPrimitive: e} = Symbol, t = Symbol.for("sxs.composers"), {assign: n, create: r, defineProperties: o, getOwnPropertyDescriptors: i} = Object, a = (t2, r2, a2) => n(o(t2, i(a2)), {[e]: () => t2[r2], toString: () => t2[r2]}), s = (e2) => e2.includes("-") ? e2 : e2.replace(/[A-Z]/g, (e3) => "-" + e3.toLowerCase()), l = (e2, t2) => e2.reduce((e3, n2) => (e3.push(...t2.map((e4) => e4.includes("&") ? e4.replace(/&/g, /[ +>|~]/.test(n2) && /&[^]*&/.test(e4) ? `:is(${n2})` : n2) : n2 + " " + e4)), e3), []), c = /\s*,\s*(?![^()]*\))/, d = /(-columns|(^|[^e]-)padding|[^t]-spacing|l-align|rows|(^|(^border|[dkmnptx]|le|ne)-)width|^border|tom|[ek]-start|(o|[^e]-du)ration|us|(^|[^tv]-)left|(^|-)top|tance|rgin|e-offset|(er|g|n|t)-block|(^|[^tv]-)right|basis|[gnt]-inline|gap|(^|[^e]-)height|ness|(^|[^p]-)inset|[ek]-end|elay|tline|ve|dent|-rotate|n-rule|(c|ck|d|ne|t)-size)$/, g = /([+-])?((?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)?(\$|--)([$\w-]+)/g, p = /\s+(?![^()]*\))/, h = (e2) => (t2) => e2(...typeof t2 == "string" ? String(t2).split(p) : [t2]), m = /([\d.]+)([^]*)/, u = {appearance: (e2) => ({WebkitAppearance: e2, appearance: e2}), backfaceVisibility: (e2) => ({WebkitBackfaceVisibility: e2, backfaceVisibility: e2}), backgroundClip: (e2) => ({WebkitBackgroundClip: e2, backgroundClip: e2}), boxDecorationBreak: (e2) => ({WebkitBoxDecorationBreak: e2, boxDecorationBreak: e2}), clipPath: (e2) => ({WebkitClipPath: e2, clipPath: e2}), content: (e2) => ({content: /^([^]*["'][^]*|[A-Za-z]+\([^]*|[^]*-quote|inherit|initial|none|normal|revert|unset)$/.test(e2) ? e2 : `"${e2}"`}), hyphens: (e2) => ({WebkitHyphens: e2, hyphens: e2}), maskImage: (e2) => ({WebkitMaskImage: e2, maskImage: e2}), tabSize: (e2) => ({MozTabSize: e2, tabSize: e2}), userSelect: (e2) => ({WebkitUserSelect: e2, userSelect: e2}), marginBlock: h((e2, t2) => ({marginBlockStart: e2, marginBlockEnd: t2 || e2})), marginInline: h((e2, t2) => ({marginInlineStart: e2, marginInlineEnd: t2 || e2})), maxSize: h((e2, t2) => ({maxBlockSize: e2, maxInlineSize: t2 || e2})), minSize: h((e2, t2) => ({minBlockSize: e2, minInlineSize: t2 || e2})), paddingBlock: h((e2, t2) => ({paddingBlockStart: e2, paddingBlockEnd: t2 || e2})), paddingInline: h((e2, t2) => ({paddingInlineStart: e2, paddingInlineEnd: t2 || e2}))}, f = (e2) => {
  const {media: t2, themeMap: n2, utils: r2} = e2;
  let o2, i2, a2, p2;
  return (h2) => ((e3, t3) => {
    const n3 = new WeakSet(), r3 = (e4, o3, i3, a3, d2) => {
      let g2 = "";
      e:
        for (let p3 in e4) {
          const h3 = p3.charCodeAt(0) === 64;
          for (const m2 of h3 ? [].concat(e4[p3]) : [e4[p3]]) {
            if (typeof t3 == "function" && (p3 !== a3 || m2 !== d2)) {
              const n4 = t3(p3, m2, e4);
              if (n4 !== null) {
                g2 += n4 === Object(n4) ? r3(n4, o3, i3, p3, m2) : n4 == null ? "" : n4;
                continue e;
              }
            }
            const h4 = p3.charCodeAt(0) === 64;
            if (m2 !== Object(m2) || "length" in m2) {
              for (let e5 = 0; e5 < i3.length; ++e5)
                n3.has(i3[e5]) || (n3.add(i3[e5]), g2 += i3[e5] + "{");
              o3.length && !n3.has(o3) && (n3.add(o3), g2 += o3 + "{");
              for (const e5 of /^@import/i.test(p3) ? [].concat(m2) : [m2])
                g2 += (h4 ? p3 + " " : s(p3) + ":") + String(e5) + ";";
            } else {
              n3.has(o3) && (n3.delete(o3), g2 += "}");
              const e5 = Object(p3), t4 = h4 ? o3 : o3.length ? l(o3, p3.split(c)) : p3.split(c);
              g2 += r3(m2, t4, h4 ? i3.concat(e5) : i3), n3.has(e5) && (n3.delete(e5), g2 += "}"), n3.has(t4) && (n3.delete(t4), g2 += "}");
            }
          }
        }
      return g2;
    };
    return r3(e3, [], []);
  })(h2, (l2, c2) => {
    const h3 = l2.charCodeAt(0), f2 = h3 === 64 ? l2 : /[A-Z]/.test(b2 = l2) ? b2 : b2.replace(/-[^]/g, (e3) => e3[1].toUpperCase());
    var b2;
    const S2 = h3 === 64 ? l2 : s(l2);
    if (typeof r2[l2] == "function") {
      if (r2[l2] != a2 || c2 != p2)
        return a2 = r2[l2], p2 = c2, a2(e2)(p2);
    } else if (typeof u[f2] == "function" && (u[f2] != a2 || c2 != p2))
      return a2 = u[f2], p2 = c2, a2(p2);
    if (p2 = c2, o2 != f2 && i2 != c2 && /^((min|max)?((Block|Inline)Size|Height|Width)|height|width)$/.test(f2)) {
      o2 = f2, i2 = c2;
      const e3 = String(i2).replace(/^((?:[^]*[^\w-])?)(fit-content|stretch)((?:[^\w-][^]*)?)$/, (e4, t3, n3, r3) => t3 + (n3 === "stretch" ? `-moz-available${r3};${S2}:${t3}-webkit-fill-available` : `-moz-fit-content${r3};${S2}:${t3}fit-content`) + r3);
      if (e3 != c2)
        return {[l2]: e3};
    }
    let k2 = h3 === 64 ? (l2.slice(1) in t2 ? "@media " + t2[l2.slice(1)] : l2).replace(/\(\s*([\w-]+)\s*(=|<|<=|>|>=)\s*([\w-]+)\s*(?:(<|<=|>|>=)\s*([\w-]+)\s*)?\)/g, (e3, t3, n3, r3, o3, i3) => {
      const a3 = m.test(t3), s2 = 0.0625 * (a3 ? -1 : 1), [l3, c3] = a3 ? [r3, t3] : [t3, r3];
      return "(" + (n3[0] === "=" ? "" : n3[0] === ">" === a3 ? "max-" : "min-") + l3 + ":" + (n3[0] !== "=" && n3.length === 1 ? c3.replace(m, (e4, t4, r4) => Number(t4) + s2 * (n3 === ">" ? 1 : -1) + r4) : c3) + (o3 ? ") and (" + (o3[0] === ">" ? "min-" : "max-") + l3 + ":" + (o3.length === 1 ? i3.replace(m, (e4, t4, n4) => Number(t4) + s2 * (o3 === ">" ? -1 : 1) + n4) : i3) : "") + ")";
    }) : h3 === 36 ? "-" + l2.replace(/\$/g, "-") : l2;
    const B2 = c2 === Object(c2) ? c2 : c2 && typeof c2 == "number" && d.test(S2) ? String(c2) + "px" : String(c2).replace(g, (e3, t3, r3, o3, i3) => o3 == "$" == !!r3 ? e3 : (t3 || o3 == "--" ? "calc(" : "") + "var(" + (o3 === "$" ? "--" + (i3.includes("$") ? "" : f2 in n2 ? n2[f2] + "-" : "") + i3.replace(/\$/g, "-") : o3 + i3) + ")" + (t3 || o3 == "--" ? "*" + (t3 || "") + (r3 || "1") + ")" : ""));
    return c2 != B2 || S2 != k2 ? {[k2]: B2} : null;
  });
}, {from: b, isArray: S} = Array, {ownKeys: k} = Reflect, B = class extends Set {
  toString() {
    return b(this).join("");
  }
  get hasChanged() {
    const {size: e2} = this;
    return () => e2 < this.size;
  }
}, y = B;
B.prototype[e] = B.prototype.toString;
var w = "colors", I = "sizes", C = "space", x = {gap: C, gridGap: C, columnGap: C, gridColumnGap: C, rowGap: C, gridRowGap: C, inset: C, insetBlock: C, insetBlockEnd: C, insetBlockStart: C, insetInline: C, insetInlineEnd: C, insetInlineStart: C, margin: C, marginTop: C, marginRight: C, marginBottom: C, marginLeft: C, marginBlock: C, marginBlockEnd: C, marginBlockStart: C, marginInline: C, marginInlineEnd: C, marginInlineStart: C, padding: C, paddingTop: C, paddingRight: C, paddingBottom: C, paddingLeft: C, paddingBlock: C, paddingBlockEnd: C, paddingBlockStart: C, paddingInline: C, paddingInlineEnd: C, paddingInlineStart: C, top: C, right: C, bottom: C, left: C, scrollMargin: C, scrollMarginTop: C, scrollMarginRight: C, scrollMarginBottom: C, scrollMarginLeft: C, scrollMarginX: C, scrollMarginY: C, scrollMarginBlock: C, scrollMarginBlockEnd: C, scrollMarginBlockStart: C, scrollMarginInline: C, scrollMarginInlineEnd: C, scrollMarginInlineStart: C, scrollPadding: C, scrollPaddingTop: C, scrollPaddingRight: C, scrollPaddingBottom: C, scrollPaddingLeft: C, scrollPaddingX: C, scrollPaddingY: C, scrollPaddingBlock: C, scrollPaddingBlockEnd: C, scrollPaddingBlockStart: C, scrollPaddingInline: C, scrollPaddingInlineEnd: C, scrollPaddingInlineStart: C, fontSize: "fontSizes", background: w, backgroundColor: w, backgroundImage: w, border: w, borderBlock: w, borderBlockEnd: w, borderBlockStart: w, borderBottom: w, borderBottomColor: w, borderColor: w, borderInline: w, borderInlineEnd: w, borderInlineStart: w, borderLeft: w, borderLeftColor: w, borderRight: w, borderRightColor: w, borderTop: w, borderTopColor: w, caretColor: w, color: w, columnRuleColor: w, fill: w, outline: w, outlineColor: w, stroke: w, textDecorationColor: w, fontFamily: "fonts", fontWeight: "fontWeights", lineHeight: "lineHeights", letterSpacing: "letterSpacings", blockSize: I, minBlockSize: I, maxBlockSize: I, inlineSize: I, minInlineSize: I, maxInlineSize: I, width: I, minWidth: I, maxWidth: I, height: I, minHeight: I, maxHeight: I, flexBasis: I, gridTemplateColumns: I, gridTemplateRows: I, borderWidth: "borderWidths", borderTopWidth: "borderWidths", borderRightWidth: "borderWidths", borderBottomWidth: "borderWidths", borderLeftWidth: "borderWidths", borderStyle: "borderStyles", borderTopStyle: "borderStyles", borderRightStyle: "borderStyles", borderBottomStyle: "borderStyles", borderLeftStyle: "borderStyles", borderRadius: "radii", borderTopLeftRadius: "radii", borderTopRightRadius: "radii", borderBottomRightRadius: "radii", borderBottomLeftRadius: "radii", boxShadow: "shadows", textShadow: "shadows", transition: "transitions", zIndex: "zIndices"}, z = (e2) => {
  const t2 = {};
  for (const n2 in e2)
    for (const r2 in e2[n2])
      t2["$" + n2 + "-" + r2] = String(e2[n2][r2]).replace(/\$[$\w-]+/g, (e3) => /[^]\$/.test(e3) ? e3 : "$" + n2 + e3);
  return t2;
}, $ = (e2, t2) => {
  for (var n2 = JSON.stringify(t2), r2 = n2.length, o2 = 9; r2; )
    o2 = Math.imul(o2 ^ n2.charCodeAt(--r2), 9 ** 9);
  return e2 + (o2 ^ o2 >>> 9).toString(36).slice(-5);
}, j = class {
  constructor(e2, t2, n2) {
    this.value = e2, this.token = t2, this.scale = n2;
  }
  get computedValue() {
    return "var(" + this.variable + ")";
  }
  get variable() {
    return "--" + this.scale + "-" + this.token;
  }
  toString() {
    return this.computedValue;
  }
}, W = class extends Array {
  toString() {
    return this.join("");
  }
  get hasChanged() {
    const e2 = String(this);
    return () => e2 !== String(this);
  }
}, v = W;
W.prototype[e] = W.prototype.toString;
var E = (e2) => {
  let t2, r2, o2, i2, a2, s2 = false;
  const l2 = e2.insertionMethod === "append" ? "append" : "prepend";
  return (e3) => {
    typeof document == "object" && (t2 || (t2 = document.head || document.documentElement), r2 || (r2 = document.getElementById("stitches") || n(document.createElement("style"), {id: "stitches", textContent: e3})), o2 || (o2 = r2.firstChild || new Text(), s2 = !o2.data), i2 || (i2 = r2.insertBefore(new Text(), o2)), r2.isConnected || t2[l2](r2), i2.data = e3, !s2 && e3 && (clearTimeout(a2), a2 = setTimeout(() => {
      o2.remove(), s2 = true;
    }, 250)));
  };
}, M = (e2) => {
  e2 = Object(e2);
  const o2 = n({initial: "all"}, e2.media), i2 = Object(e2.theme), s2 = Object(e2.themeMap || x), l2 = Object(e2.utils), c2 = new Set([].concat(e2.passthru || ["as", "className"])), d2 = e2.prefix || "sx", g2 = (typeof e2.insertionMethod == "function" ? e2.insertionMethod : E)(e2), p2 = "03kze", h2 = {theme: i2, media: o2, prefix: d2, themeMap: s2, utils: l2}, m2 = f(h2), u2 = new y(), S2 = new y(), B2 = new y(), w2 = new y(), I2 = new y([u2, S2, B2, w2]);
  let C2 = "";
  const W2 = () => {
    const e3 = b(I2).join("");
    C2 !== e3 && g2(C2 = e3);
  }, M2 = (e3, t2) => {
    t2 = e3 === Object(e3) ? e3 : Object(t2), e3 = typeof e3 == "string" ? e3 : "";
    const n2 = z(t2), o3 = (e3 = e3 || $(d2, n2)).replace(/^\w/, ".$&"), i3 = e3 === d2 + p2 ? "" : m2({[o3]: n2}), s3 = a(r(null), "className", {className: e3, selector: o3});
    for (const e4 in t2) {
      s3[e4] = r(null);
      for (const n3 in t2[e4])
        s3[e4][n3] = new j(t2[e4][n3], n3, e4);
    }
    return a(s3, "className", {get className() {
      const {hasChanged: t3} = S2;
      return S2.add(i3), t3() && W2(), e3;
    }, selector: o3});
  }, O2 = (e3, t2 = "") => {
    const n2 = new y(), o3 = new y();
    for (const t3 in e3)
      if (e3[t3] !== Object(e3[t3]) || k(e3[t3]).length) {
        const r2 = m2({[t3]: e3[t3]});
        (t3 === "@import" ? n2 : o3).add(r2);
      }
    const i3 = a(r(null), "name", {name: t2}), s3 = a(() => {
      let e4 = u2.hasChanged, t3 = B2.hasChanged;
      return n2.forEach((e5) => {
        u2.add(e5);
      }), o3.forEach((e5) => {
        B2.add(e5);
      }), (e4() || t3()) && W2(), i3;
    }, "name", {get name() {
      return String(s3());
    }});
    return s3;
  }, P2 = (e3) => {
    const t2 = new y(), n2 = new v(), o3 = new y(), i3 = new y([t2, n2, o3]);
    let {variants: a2, compoundVariants: s3, defaultVariants: l3, ...c3} = e3;
    l3 = Object(l3);
    const g3 = $(d2, e3), h3 = "." + g3, u3 = g3 === d2 + p2 ? "" : m2({[h3]: c3});
    w2.add(i3);
    const f2 = r(null), b2 = [], S3 = [];
    for (const e4 in a2)
      for (const t3 in a2[e4]) {
        const n3 = a2[e4][t3];
        S3.push({[e4]: t3, css: n3});
      }
    S3.push(...s3 || []);
    for (const e4 in S3) {
      const {css: t3, ...o4} = S3[e4], i4 = k(o4), a3 = i4.length;
      for (const e5 of i4)
        f2[e5] = f2[e5] || r(null), f2[e5][o4[e5]] = true;
      const s4 = (e5, r2) => {
        e5 = {...e5};
        for (const t4 in r2)
          e5[t4] !== void 0 || Object(f2[t4])[e5[t4]] || (e5[t4] = r2[t4]);
        const s5 = new Set();
        if (i4.length && i4.every((t4) => {
          const n3 = e5[t4], r3 = String(o4[t4]);
          if (r3 === String(n3))
            return true;
          if (n3 === Object(n3)) {
            for (const e6 in n3)
              if (r3 == String(n3[e6]) && e6.charCodeAt(0) === 64)
                return s5.add(e6), true;
          }
        })) {
          let e6 = Object(t3);
          for (const t4 of s5)
            e6 = {[t4]: e6};
          const r3 = g3 + $("", e6) + "--" + (a3 === 1 ? i4[0] + "-" + o4[i4[0]] : "c" + a3), l4 = m2({["." + r3]: e6});
          return (n2[a3 - 1] || (n2[a3 - 1] = new y())).add(l4), r3;
        }
      };
      b2.push(s4);
    }
    return {apply(e4, r2, o4) {
      const a3 = t2.hasChanged, s4 = n2.hasChanged;
      if (t2.add(u3), e4) {
        r2.add(g3);
        for (const t3 of b2) {
          const n3 = t3(e4, o4);
          n3 && r2.add(n3);
        }
      }
      if (a3() || s4())
        return w2.add(i3), true;
    }, inline(e4, t3) {
      const n3 = $("-", e4), r2 = g3 === "-" + n3 ? "" : m2({[h3 + n3]: e4});
      t3.add(g3 + n3);
      const {hasChanged: i4} = o3;
      return r2 && o3.add(r2), i4();
    }, className: g3, defaultVariants: l3, selector: h3, variantProps: f2};
  }, T2 = M2(":root", i2), N2 = a({css: (...e3) => {
    let o3, i3 = [], s3 = r(null);
    for (const r2 of e3)
      if (r2 === Object(r2))
        if (t in r2)
          for (const e4 of r2[t])
            i3.push(e4), n(s3, e4.defaultVariants);
        else
          i3.push(o3 = P2(r2)), n(s3, o3.defaultVariants);
    return o3 = o3 || P2({}), a((e4) => {
      const {css: n2, ...l3} = Object(e4), d3 = new Set();
      let g3, p3 = false;
      for (const e5 of i3)
        p3 = e5.apply(l3, d3, s3) || p3;
      n2 === Object(n2) && (g3 = o3.inline(n2, d3)), (p3 || g3) && W2();
      for (const e5 in o3.variantProps)
        c2.has(e5) || delete l3[e5];
      "className" in l3 && String(l3.className).split(/\s+/).forEach(d3.add, d3);
      const h3 = b(d3);
      return l3.className = h3.join(" "), a(r(null), "className", {get [t]() {
        return i3;
      }, className: l3.className, props: l3, selector: o3.selector});
    }, "className", {get [t]() {
      return i3;
    }, get className() {
      return o3.apply() && W2(), o3.className;
    }, selector: o3.selector});
  }, config: h2, global: O2, keyframes: (e3) => {
    const t2 = $(d2, e3);
    return O2({["@keyframes " + t2]: e3}, t2);
  }, prefix: d2, reset: () => (u2.clear(), S2.clear(), B2.clear(), w2.clear(), T2.className, N2), theme: n(M2, T2), get cssText() {
    return C2;
  }, getCssString: () => C2}, "cssText", {});
  return N2;
};
const {
  css: css$3,
  global: globalCSS,
  keyframes,
  getCssString,
  theme
} = M({
  theme: {
    colors: {
      black: "rgba(19, 19, 21, 1)",
      white: "rgba(255, 255, 255, 1)",
      gray: "rgba(128, 128, 128, 1)",
      blue: "rgba(3, 136, 252, 1)",
      red: "rgba(249, 16, 74, 1)",
      yellow: "rgba(255, 221, 0, 1)",
      pink: "rgba(232, 141, 163, 1)",
      turq: "rgba(0, 245, 196, 1)",
      orange: "rgba(255, 135, 31, 1)",
      lightGray: "#e1e1e1",
      offwhite: "#ededed"
    },
    fontSizes: {
      1: "12px",
      2: "14px",
      3: "16px",
      4: "20px",
      5: "24px",
      6: "32px",
      7: "48px",
      8: "64px",
      9: "72px"
    },
    sizes: {
      maxWidth: "1000px"
    },
    shadows: {
      boxShadow: "0 12px 24px 0 rgba(0,0,0,0.09)"
    }
  },
  media: {
    bp1: "(min-width: 575px)",
    bp2: "(min-width: 750px)",
    bp3: "(min-width: 1000px)",
    bp4: "(min-width: 1200px)"
  },
  utils: {
    p: (config) => (value) => ({
      paddingTop: value,
      paddingBottom: value,
      paddingLeft: value,
      paddingRight: value
    }),
    pt: (config) => (value) => ({
      paddingTop: value
    }),
    pr: (config) => (value) => ({
      paddingRight: value
    }),
    pb: (config) => (value) => ({
      paddingBottom: value
    }),
    pl: (config) => (value) => ({
      paddingLeft: value
    }),
    px: (config) => (value) => ({
      paddingLeft: value,
      paddingRight: value
    }),
    py: (config) => (value) => ({
      paddingTop: value,
      paddingBottom: value
    }),
    m: (config) => (value) => ({
      marginTop: value,
      marginBottom: value,
      marginLeft: value,
      marginRight: value
    }),
    mt: (config) => (value) => ({
      marginTop: value
    }),
    mr: (config) => (value) => ({
      marginRight: value
    }),
    mb: (config) => (value) => ({
      marginBottom: value
    }),
    ml: (config) => (value) => ({
      marginLeft: value
    }),
    mx: (config) => (value) => ({
      marginLeft: value,
      marginRight: value
    }),
    my: (config) => (value) => ({
      marginTop: value,
      marginBottom: value
    }),
    bc: (config) => (value) => ({
      backgroundColor: value
    })
  },
  prefix: "",
  themeMap: {}
});
const paginationStyles = css$3({
  textAlign: "center",
  display: "inline-grid",
  gridTemplateColumns: "repeat(4, auto)",
  alignItems: "stretch",
  justifyContent: "center",
  alignContent: "center",
  marginBottom: "4rem",
  border: "1px solid $colors$lightGray",
  borderRadius: "10px",
  "&:last-child": {
    marginTop: "4rem"
  },
  "& > *": {
    m: "0",
    px: "30px",
    py: "5px",
    borderRight: "1px solid $colors$lightGray",
    "&:last-child": {
      borderRight: "0"
    }
  },
  "a:hover": {
    textDecoration: "none",
    color: "$colors$red"
  },
  'a[aria-disabled="true"]': {
    color: "$colors$grey",
    pointerEvents: "none"
  }
});
const Pagination = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let count;
  let PageCount;
  let $PAGINATION_QUERY, $$unsubscribe_PAGINATION_QUERY;
  var _a;
  let {page: page2 = 1} = $$props;
  const PAGINATION_QUERY = operationStore(`
    query PAGINATION_QUERY {
      _allProductsMeta {
        
        count
      }
    }
  `);
  $$unsubscribe_PAGINATION_QUERY = subscribe(PAGINATION_QUERY, (value) => $PAGINATION_QUERY = value);
  query(PAGINATION_QUERY);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  count = (_a = $PAGINATION_QUERY.data) === null || _a === void 0 ? void 0 : _a._allProductsMeta.count;
  PageCount = Math.ceil(count / perPage$1);
  $$unsubscribe_PAGINATION_QUERY();
  return `${$$result.head += `${$$result.title = `<title>
        Sick Fits - Page ${escape(page2)} of ${escape(PageCount)}
    </title>`, ""}`, ""}

${$PAGINATION_QUERY.error ? `${validate_component(ErrorMessage, "DisplayError").$$render($$result, {error: $PAGINATION_QUERY.error.message}, {}, {})}` : `<div${add_attribute("class", paginationStyles(), 0)}><a${add_attribute("href", `/products/${+page2 - 1}`, 0)}${add_attribute("aria-disabled", page2 <= 1, 0)}>Prev </a>
        <p>Page ${escape(page2)} of ${escape(PageCount)}</p>
        <p>${escape(count)} Items Total</p>
        <a${add_attribute("href", `/products/${+page2 + 1}`, 0)}${add_attribute("aria-disabled", page2 >= PageCount, 0)}>Next</a></div>`}`;
});
function formatMoney(amount = 0) {
  const options = {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2
  };
  if (amount % 100)
    options.minimumFractionDigits = 0;
  const formatter = Intl.NumberFormat("en-GB", options);
  return formatter.format(amount / 100);
}
const itemStyles = css$3({
  background: "$colors$white",
  border: "1px solid $colors$offWhite",
  boxShadow: "$shadows$boxShadow",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  img: {
    width: "100%",
    height: "400px",
    objectFit: "cover"
  },
  p: {
    lineHeight: "2",
    fontWeight: "300",
    "flex-grow": "1",
    padding: " 0 3rem",
    fontSize: "$fontSizes$3"
  },
  ".buttonList": {
    display: "grid",
    width: "100%",
    borderTop: "1px solid $colors$lightGray",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gridGap: "1px",
    background: "$colors$lightGray",
    "& > *": {
      background: "white",
      border: "0",
      fontSize: "$fontSizes$1",
      padding: "1rem"
    }
  }
});
var Product_svelte = "h3.svelte-aj45ow.svelte-aj45ow{text-align:center;transform:skew(-5deg) rotate(-1deg);margin:-3rem 1rem 0;text-shadow:2px 2px 0 rgba(0,0,0,.1)}h3.svelte-aj45ow a.svelte-aj45ow{background:var(--colors-red);display:inline;line-height:1.3;font-size:3rem;text-align:center;color:#fff;padding:0 1rem}p.svelte-aj45ow.svelte-aj45ow{padding:0 1rem}.pricetag.svelte-aj45ow.svelte-aj45ow{background:var(--colors-red);transform:rotate(3deg);color:var(--colors-white);font-weight:600;padding:5px;line-height:1;font-size:2rem;display:inline-block;position:absolute;top:-3px;right:-3px}";
const css$2 = {
  code: "h3.svelte-aj45ow.svelte-aj45ow{margin:0 1rem;text-align:center;transform:skew(-5deg) rotate(-1deg);margin-top:-3rem;text-shadow:2px 2px 0 rgba(0, 0, 0, 0.1)}h3.svelte-aj45ow a.svelte-aj45ow{background:var(--colors-red);display:inline;line-height:1.3;font-size:3rem;text-align:center;color:white;padding:0 1rem}p.svelte-aj45ow.svelte-aj45ow{padding:0 1rem}.pricetag.svelte-aj45ow.svelte-aj45ow{background:var(--colors-red);transform:rotate(3deg);color:var(--colors-white);font-weight:600;padding:5px;line-height:1;font-size:2rem;display:inline-block;position:absolute;top:-3px;right:-3px}",
  map: '{"version":3,"file":"Product.svelte","sources":["Product.svelte"],"sourcesContent":["<script>\\n    import formatMoney from \\"$lib/formatMoney\\";\\n    import { itemStyles } from \\"$lib/styles/ItemStyles\\";\\n\\n    export let product;\\n</script>\\n\\n<div class={itemStyles()}>\\n    <img src={product?.photo?.image?.publicUrlTransformed} alt={product.name} />\\n    <h3>\\n        <a href={`/product/${product.id}`}>{product.name}</a>\\n    </h3>\\n    <span class=\\"pricetag\\">{formatMoney(product.price)}</span>\\n    <p>{product.description}</p>\\n    <div class=\\"buttonList\\">\\n        <a\\n            href={{\\n                pathname: \\"/update\\",\\n                query: {\\n                    id: product.id,\\n                },\\n            }}\\n        >\\n            Edit Product\\n        </a>\\n        <!-- <AddToCart id={product.id} />\\n    <DeleteProduct id={product.id}>Delete</DeleteProduct> -->\\n    </div>\\n</div>\\n\\n<style lang=\\"scss\\">h3 {\\n  margin: 0 1rem;\\n  text-align: center;\\n  transform: skew(-5deg) rotate(-1deg);\\n  margin-top: -3rem;\\n  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);\\n}\\nh3 a {\\n  background: var(--colors-red);\\n  display: inline;\\n  line-height: 1.3;\\n  font-size: 3rem;\\n  text-align: center;\\n  color: white;\\n  padding: 0 1rem;\\n}\\n\\np {\\n  padding: 0 1rem;\\n}\\n\\n.pricetag {\\n  background: var(--colors-red);\\n  transform: rotate(3deg);\\n  color: var(--colors-white);\\n  font-weight: 600;\\n  padding: 5px;\\n  line-height: 1;\\n  font-size: 2rem;\\n  display: inline-block;\\n  position: absolute;\\n  top: -3px;\\n  right: -3px;\\n}</style>\\n"],"names":[],"mappings":"AA8BmB,EAAE,4BAAC,CAAC,AACrB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,UAAU,CAAE,MAAM,CAClB,SAAS,CAAE,KAAK,KAAK,CAAC,CAAC,OAAO,KAAK,CAAC,CACpC,UAAU,CAAE,KAAK,CACjB,WAAW,CAAE,GAAG,CAAC,GAAG,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAC3C,CAAC,AACD,gBAAE,CAAC,CAAC,cAAC,CAAC,AACJ,UAAU,CAAE,IAAI,YAAY,CAAC,CAC7B,OAAO,CAAE,MAAM,CACf,WAAW,CAAE,GAAG,CAChB,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,MAAM,CAClB,KAAK,CAAE,KAAK,CACZ,OAAO,CAAE,CAAC,CAAC,IAAI,AACjB,CAAC,AAED,CAAC,4BAAC,CAAC,AACD,OAAO,CAAE,CAAC,CAAC,IAAI,AACjB,CAAC,AAED,SAAS,4BAAC,CAAC,AACT,UAAU,CAAE,IAAI,YAAY,CAAC,CAC7B,SAAS,CAAE,OAAO,IAAI,CAAC,CACvB,KAAK,CAAE,IAAI,cAAc,CAAC,CAC1B,WAAW,CAAE,GAAG,CAChB,OAAO,CAAE,GAAG,CACZ,WAAW,CAAE,CAAC,CACd,SAAS,CAAE,IAAI,CACf,OAAO,CAAE,YAAY,CACrB,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,IAAI,CACT,KAAK,CAAE,IAAI,AACb,CAAC"}'
};
const Product = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  var _a, _b;
  let {product} = $$props;
  if ($$props.product === void 0 && $$bindings.product && product !== void 0)
    $$bindings.product(product);
  $$result.css.add(css$2);
  return `<div class="${escape(null_to_empty(itemStyles())) + " svelte-aj45ow"}"><img${add_attribute("src", (_b = (_a = product == null ? void 0 : product.photo) == null ? void 0 : _a.image) == null ? void 0 : _b.publicUrlTransformed, 0)}${add_attribute("alt", product.name, 0)}>
    <h3 class="${"svelte-aj45ow"}"><a${add_attribute("href", `/product/${product.id}`, 0)} class="${"svelte-aj45ow"}">${escape(product.name)}</a></h3>
    <span class="${"pricetag svelte-aj45ow"}">${escape(formatMoney(product.price))}</span>
    <p class="${"svelte-aj45ow"}">${escape(product.description)}</p>
    <div class="${"buttonList"}"><a${add_attribute("href", {
    pathname: "/update",
    query: {id: product.id}
  }, 0)}>Edit Product
        </a>
        </div>
</div>`;
});
var Products_svelte = ".product-list.svelte-1dezbjo{display:grid;grid-template-columns:1fr 1fr;grid-gap:60px}";
const css$1 = {
  code: ".product-list.svelte-1dezbjo{display:grid;grid-template-columns:1fr 1fr;grid-gap:60px}",
  map: '{"version":3,"file":"Products.svelte","sources":["Products.svelte"],"sourcesContent":["<script lang=\\"ts\\">import Product from \\"./Product.svelte\\";\\nimport { operationStore, query } from \\"@urql/svelte\\";\\nexport let page = 1;\\nlet perPage = 4;\\nconst ALL_PRODUCTS_QUERY = operationStore(`\\n        query ALL_PRODUCTS_QUERY($skip: Int = 0, $first: Int) {\\n            allProducts(first: $first, skip: $skip) {\\n                id\\n                name\\n                description\\n                photo {\\n                    id\\n                    image {\\n                        id\\n                        publicUrlTransformed\\n                        }\\n                    }\\n                    price\\n                }\\n            }\\n            `, { first: perPage, skip: page * perPage - perPage }, { requestPolicy: \\"cache-and-network\\" });\\nquery(ALL_PRODUCTS_QUERY);\\n$: $ALL_PRODUCTS_QUERY.variables.skip = page * perPage - perPage;\\n</script>\\n\\n<svelte:head>\\n    <title>Sick Fits</title>\\n</svelte:head>\\n\\n{#if $ALL_PRODUCTS_QUERY.fetching}\\n    <p>Loading...</p>\\n{:else if $ALL_PRODUCTS_QUERY.error}\\n    <p>Oh no... {$ALL_PRODUCTS_QUERY.error.message}</p>\\n{:else}\\n    <div class=\\"product-list\\">\\n        {#each $ALL_PRODUCTS_QUERY?.data.allProducts as product}\\n            <Product {product} />\\n        {/each}\\n    </div>\\n{/if}\\n\\n<style>\\n    .product-list {\\n        display: grid;\\n        grid-template-columns: 1fr 1fr;\\n        grid-gap: 60px;\\n    }\\n</style>\\n"],"names":[],"mappings":"AA0CI,aAAa,eAAC,CAAC,AACX,OAAO,CAAE,IAAI,CACb,qBAAqB,CAAE,GAAG,CAAC,GAAG,CAC9B,QAAQ,CAAE,IAAI,AAClB,CAAC"}'
};
let perPage = 4;
const Products = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $ALL_PRODUCTS_QUERY, $$unsubscribe_ALL_PRODUCTS_QUERY;
  let {page: page2 = 1} = $$props;
  const ALL_PRODUCTS_QUERY = operationStore(`
        query ALL_PRODUCTS_QUERY($skip: Int = 0, $first: Int) {
            allProducts(first: $first, skip: $skip) {
                id
                name
                description
                photo {
                    id
                    image {
                        id
                        publicUrlTransformed
                        }
                    }
                    price
                }
            }
            `, {
    first: perPage,
    skip: page2 * perPage - perPage
  }, {requestPolicy: "cache-and-network"});
  $$unsubscribe_ALL_PRODUCTS_QUERY = subscribe(ALL_PRODUCTS_QUERY, (value) => $ALL_PRODUCTS_QUERY = value);
  query(ALL_PRODUCTS_QUERY);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  $$result.css.add(css$1);
  set_store_value(ALL_PRODUCTS_QUERY, $ALL_PRODUCTS_QUERY.variables.skip = page2 * perPage - perPage, $ALL_PRODUCTS_QUERY);
  $$unsubscribe_ALL_PRODUCTS_QUERY();
  return `${$$result.head += `${$$result.title = `<title>Sick Fits</title>`, ""}`, ""}

${$ALL_PRODUCTS_QUERY.fetching ? `<p>Loading...</p>` : `${$ALL_PRODUCTS_QUERY.error ? `<p>Oh no... ${escape($ALL_PRODUCTS_QUERY.error.message)}</p>` : `<div class="${"product-list svelte-1dezbjo"}">${each($ALL_PRODUCTS_QUERY == null ? void 0 : $ALL_PRODUCTS_QUERY.data.allProducts, (product) => `${validate_component(Product, "Product").$$render($$result, {product}, {}, {})}`)}</div>`}`}`;
});
const prerender$1 = true;
const load = async ({page: page2, fetch: fetch2}) => {
  let {id} = page2.params;
  return {props: {id}};
};
const U5Bidu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {id} = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  return `<div>${validate_component(Pagination, "Pagination").$$render($$result, {page: id || 1}, {}, {})}
    ${validate_component(Products, "Products").$$render($$result, {page: id || 1}, {}, {})}
    ${validate_component(Pagination, "Pagination").$$render($$result, {page: id || 1}, {}, {})}</div>`;
});
var _id_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: U5Bidu5D,
  prerender: prerender$1,
  load
});
const prerender = true;
const Sell = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div>hello world</div>`;
});
var sell = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Sell,
  prerender
});
const globalStyles = globalCSS({
  "@font-face": {
    fontFamily: "radnika_next",
    src: "url('/static/radnikanext-medium-webfont.woff2') format('woff2')",
    fontWeight: "normal",
    fontStyle: "normal"
  },
  html: {
    fontFamily: `'radnika_next',--apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
    fontSizes: "$fontSizes$1",
    boxSizing: "border-box"
  },
  "*, *:before, *:after": {
    boxSizing: "inherit"
  },
  body: {
    p: "0",
    m: "0",
    fontSize: "$fontSizes$2",
    lineHeight: "2"
  },
  a: {
    textDecoration: "none",
    color: "$colors$black"
  },
  "a:hover": {
    textDecoration: "underline"
  },
  button: {
    fontFamily: `'radnika_next', --apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`
  }
});
const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    page: {
      subscribe: stores.page.subscribe
    },
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    get preloading() {
      console.error("stores.preloading is deprecated; use stores.navigating instead");
      return {
        subscribe: stores.navigating.subscribe
      };
    },
    session: stores.session
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
const navStyles = css$3({
  margin: "0",
  padding: "0",
  display: "flex",
  justifySelf: "end",
  "a, button": {
    padding: "1rem 3rem",
    display: "flex",
    alignItems: "center",
    position: "relative",
    textTransform: "uppercase",
    fontWeight: "900",
    fontSize: "$fontSizes$4",
    background: "none",
    border: "0",
    cursor: "pointer",
    "@b2": {
      fontSize: "10px",
      padding: "0 10px"
    },
    "&:before": {
      content: "",
      width: "2px",
      background: "$colors$lightGray",
      height: "100%",
      left: "0",
      position: "absolute",
      transform: "skew(-20deg)",
      top: " 0",
      bottom: "0"
    },
    "&:after": {
      height: "2px",
      background: "red",
      content: "",
      width: "0",
      position: "absolute",
      transform: "translateX(-50%)",
      transition: "width 0.4s",
      transitionTimingFunction: "cubic-bezier(1, -0.65, 0, 2.31)",
      left: "50%",
      marginTop: "2rem"
    },
    "&:hover, &:focus": {
      outline: "none",
      textDecoration: "none",
      "&:after": {
        width: "calc(100% - 60px)"
      },
      "@b2": {
        width: "calc(100% - 10px)"
      }
    },
    "&.active:after": {
      width: "calc(100% - 60px)"
    }
  },
  "@b3": {
    borderTop: "1px solid $colors$lightGray",
    width: "100%",
    justifyContent: "center",
    fontSize: "$fontSizes$2"
  }
});
const Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {section} = $$props;
  if ($$props.section === void 0 && $$bindings.section && section !== void 0)
    $$bindings.section(section);
  return `


<ul${add_attribute("class", navStyles(), 0)}><a sveltekit:prefetch href="${"/products/1"}"${add_classes([section === "products" ? "active" : ""].join(" ").trim())}>Products
    </a>
    <a sveltekit:prefetch href="${"/sell"}"${add_classes([section === "sell" ? "active" : ""].join(" ").trim())}>Sell
    </a>
    

    
    </ul>`;
});
const Search = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div>Search</div>`;
});
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let section;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const headers = css$3({
    ".bar": {
      borderBottom: "10px solid $colors$black",
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      justifyContent: "space-between",
      alignItems: "stretch"
    },
    ".logo": {
      fontSize: "$fontSizes$7",
      marginLeft: "2rem",
      position: "relative",
      zIndex: "2",
      transform: "skew(-7deg)",
      background: "$colors$red",
      color: "$colors$white",
      textDecoration: "none",
      textTransform: "uppercase",
      padding: "0.5rem 1rem"
    }
  });
  section = $page.path.split("/")[1];
  $$unsubscribe_page();
  return `<header${add_attribute("class", headers(), 0)}><div class="${"bar"}"><h1 class="${"logo"}"><div href="${"/"}">Sick fits</div></h1>
        ${validate_component(Nav, "Nav").$$render($$result, {section}, {}, {})}</div>
    ${validate_component(Search, "Search").$$render($$result, {}, {}, {})}</header>

`;
});
var $layout_svelte = ".container.svelte-j7uuib{max-width:var(--sizes-maxWidth);margin:0 auto;padding:2rem}";
const css = {
  code: ".container.svelte-j7uuib{max-width:var(--sizes-maxWidth);margin:0 auto;padding:2rem}",
  map: '{"version":3,"file":"$layout.svelte","sources":["$layout.svelte"],"sourcesContent":["<script>\\n    import { globalStyles } from \\"$lib/styles/global\\";\\n    import Header from \\"$lib/components/Header.svelte\\";\\n\\n    // import \\"../global.scss\\";\\n    import { endpoint, prodEndpoint } from \\"../../config\\";\\n\\n    import { createClient, setClient } from \\"@urql/svelte\\";\\n    import { onMount } from \\"svelte\\";\\n\\n    onMount(async () => await globalStyles());\\n\\n    const client = createClient({\\n        url: prodEndpoint,\\n    });\\n\\n    setClient(client);\\n</script>\\n\\n<main>\\n    <Header />\\n    <div class=\\"container\\">\\n        <slot />\\n        <!-- <button class={buttons({ size: \\"large\\" })}>Hello Worls</button> -->\\n    </div>\\n</main>\\n\\n<style lang=\\"scss\\">.container {\\n  max-width: var(--sizes-maxWidth);\\n  margin: 0 auto;\\n  padding: 2rem;\\n}</style>\\n"],"names":[],"mappings":"AA2BmB,UAAU,cAAC,CAAC,AAC7B,SAAS,CAAE,IAAI,gBAAgB,CAAC,CAChC,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,IAAI,AACf,CAAC"}'
};
const $layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  onMount(async () => await globalStyles());
  const client = createClient({url: prodEndpoint});
  setClient(client);
  $$result.css.add(css);
  return `<main>${validate_component(Header, "Header").$$render($$result, {}, {}, {})}
    <div class="${"container svelte-j7uuib"}">${slots.default ? slots.default({}) : ``}
        </div>
</main>`;
});
var $layout$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: $layout
});
export {init, render};
