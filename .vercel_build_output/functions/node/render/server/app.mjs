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
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
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
        var members = thing.map(function(v2, i) {
          return i in thing ? stringify(v2) : "";
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
          thing.forEach(function(v2, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v2));
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
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
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
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
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
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
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
      if (accum.every((c) => typeof c === "string")) {
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
    } catch (e) {
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
function safe_not_equal$1(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
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
        for (let i = 0; i < subscribers.length; i += 1) {
          const s = subscribers[i];
          s[1]();
          subscriber_queue$1.push(s, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue$1.length; i += 2) {
            subscriber_queue$1[i][0](subscriber_queue$1[i + 1]);
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
async function get_response({request, options, $session, route, status = 200, error: error2}) {
  const host = options.host || request.headers[options.host_header];
  const dependencies = {};
  const serialized_session = try_serialize($session, (error3) => {
    throw new Error(`Failed to serialize session data: ${error3.message}`);
  });
  const serialized_data = [];
  const match = route && route.pattern.exec(request.path);
  const params = route && route.params(match);
  const page = {
    host,
    path: request.path,
    query: request.query,
    params
  };
  let uses_credentials = false;
  const fetcher = async (url, opts = {}) => {
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
      const asset = options.manifest.assets.find((d) => d.file === filename || d.file === filename_html);
      if (asset) {
        if (options.get_static_file) {
          response = new Response(options.get_static_file(asset.file), {
            headers: {
              "content-type": asset.type
            }
          });
        } else {
          response = await fetch$1(`http://${page.host}/${asset.file}`, opts);
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
      const clone2 = response.clone();
      const headers2 = {};
      clone2.headers.forEach((value, key) => {
        if (key !== "etag")
          headers2[key] = value;
      });
      const payload = JSON.stringify({
        status: clone2.status,
        statusText: clone2.statusText,
        headers: headers2,
        body: await clone2.text()
      });
      serialized_data.push({url, payload});
      return response;
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
  for (let i = 0; i < component_promises.length; i += 1) {
    let loaded;
    try {
      const mod = await component_promises[i];
      components2[i] = mod.default;
      if (mod.preload) {
        throw new Error("preload has been deprecated in favour of load. Please consult the documentation: https://kit.svelte.dev/docs#load");
      }
      if (mod.load) {
        loaded = await mod.load.call(null, {
          page,
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
    } catch (e) {
      if (error2)
        throw e instanceof Error ? e : new Error(e);
      loaded = {
        error: e instanceof Error ? e : {name: "Error", message: e.toString()},
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
      props_promises[i] = loaded.props;
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
    page,
    components: components2
  };
  for (let i = 0; i < props_promises.length; i += 1) {
    props[`props_${i}`] = await props_promises[i];
  }
  let rendered;
  try {
    rendered = options.root.render(props);
  } catch (e) {
    if (error2)
      throw e instanceof Error ? e : new Error(e);
    return await get_response({
      request,
      options,
      $session,
      route,
      status: 500,
      error: e instanceof Error ? e : {name: "Error", message: e.toString()}
    });
  }
  unsubscribe();
  const js_deps = route ? route.js : [];
  const css_deps = route ? route.css : [];
  const style = route ? route.style : "";
  const s = JSON.stringify;
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
			import { start } from ${s(options.entry)};
			start({
				target: ${options.target ? `document.querySelector(${s(options.target)})` : "document.body"},
				paths: ${s(options.paths)},
				status: ${status},
				error: ${serialize_error(error2)},
				session: ${serialized_session},
				nodes: [
					${(route ? route.parts : []).map((part) => `import(${s(options.get_component_path(part.id))})`).join(",\n					")}
				],
				page: {
					host: ${host ? s(host) : "location.host"},
					path: ${s(request.path)},
					query: new URLSearchParams(${s(request.query.toString())}),
					params: ${s(params)}
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

			${serialized_data.map(({url, payload}) => `<script type="svelte-data" url="${url}">${payload}</script>`).join("\n\n			")}
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
async function render_page(request, route, context, options) {
  const $session = await (options.setup.getSession && options.setup.getSession({context}));
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
async function render_route(request, route, context, options) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (handler) {
    const match = route.pattern.exec(request.path);
    const params = route.params(match);
    const response = await handler({
      host: options.host || request.headers[options.host_header || "host"],
      path: request.path,
      headers: request.headers,
      query: request.query,
      body: request.body,
      params
    }, context);
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
async function ssr(request, options) {
  if (request.path.endsWith("/") && request.path !== "/") {
    const q2 = request.query.toString();
    return {
      status: 301,
      headers: {
        location: request.path.slice(0, -1) + (q2 ? `?${q2}` : "")
      }
    };
  }
  const {context, headers = {}} = await (options.setup.prepare && options.setup.prepare({headers: request.headers})) || {};
  try {
    for (const route of options.manifest.routes) {
      if (options.initiator === route) {
        return {
          status: 404,
          headers: {},
          body: `Not found: ${request.path}`
        };
      }
      if (route.pattern.test(request.path)) {
        const response = route.type === "endpoint" ? await render_route(request, route, context, options) : await render_page(request, route, context, options);
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
          return {
            status: response.status,
            headers: {...headers, ...response.headers},
            body: response.body,
            dependencies: response.dependencies
          };
        }
      }
    }
    return await render_page(request, null, context, options);
  } catch (e) {
    if (e && e.stack) {
      e.stack = await options.get_stack(e);
    }
    console.error(e && e.stack || e);
    return {
      status: 500,
      headers,
      body: options.dev ? e.stack : e.message
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
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
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
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
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
var root_svelte = "#svelte-announcer.svelte-1y31lbn{position:absolute;left:0;top:0;clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}";
const css$5 = {
  code: "#svelte-announcer.svelte-1y31lbn{position:absolute;left:0;top:0;clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\timport ErrorComponent from \\"../components/error.svelte\\";\\n\\n\\t// error handling\\n\\texport let status = undefined;\\n\\texport let error = undefined;\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\n\\tconst Layout = components[0];\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title;\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n</script>\\n\\n<Layout {...(props_0 || {})}>\\n\\t{#if error}\\n\\t\\t<ErrorComponent {status} {error}/>\\n\\t{:else}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}/>\\n\\t{/if}\\n</Layout>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\tNavigated to {title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>#svelte-announcer{position:absolute;left:0;top:0;clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}</style>"],"names":[],"mappings":"AAyDO,gCAAiB,CAAC,SAAS,QAAQ,CAAC,KAAK,CAAC,CAAC,IAAI,CAAC,CAAC,KAAK,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,kBAAkB,MAAM,GAAG,CAAC,CAAC,UAAU,MAAM,GAAG,CAAC,CAAC,SAAS,MAAM,CAAC,YAAY,MAAM,CAAC,MAAM,GAAG,CAAC,OAAO,GAAG,CAAC"}`
};
const Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let {status = void 0} = $$props;
  let {error: error2 = void 0} = $$props;
  let {stores} = $$props;
  let {page} = $$props;
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
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components2 !== void 0)
    $$bindings.components(components2);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  $$result.css.add(css$5);
  {
    stores.page.set(page);
  }
  return `


${validate_component(Layout, "Layout").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${error2 ? `${validate_component(Error$1, "ErrorComponent").$$render($$result, {status, error: error2}, {}, {})}` : `${validate_component(components2[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {})}`}`
  })}

${mounted ? `<div id="${"svelte-announcer"}" aria-live="${"assertive"}" aria-atomic="${"true"}" class="${"svelte-1y31lbn"}">${navigated ? `Navigated to ${escape(title)}` : ``}</div>` : ``}`;
});
var setup = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
const template = ({head, body}) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.ico" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
function init({paths}) {
}
const empty = () => ({});
const components = [
  () => Promise.resolve().then(function() {
    return index$1;
  }),
  () => Promise.resolve().then(function() {
    return index;
  })
];
const client_component_lookup = {".svelte/build/runtime/internal/start.js": "start-9cc60a6e.js", "src/routes/index.svelte": "pages/index.svelte-1e199d95.js", "src/routes/products/index.svelte": "pages/products/index.svelte-6f00a8a6.js"};
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
      css: ["assets/start-e0f43c44.css"],
      js: ["start-9cc60a6e.js", "chunks/index-4f58c89d.js", "chunks/urql-svelte-bf759fa7.js", "pages/index.svelte-1e199d95.js"]
    },
    {
      type: "page",
      pattern: /^\/products\/?$/,
      params: empty,
      parts: [{id: "src/routes/products/index.svelte", load: components[1]}],
      css: ["assets/start-e0f43c44.css", "assets/pages/products/index.svelte-46809281.css"],
      js: ["start-9cc60a6e.js", "chunks/index-4f58c89d.js", "chunks/urql-svelte-bf759fa7.js", "pages/products/index.svelte-6f00a8a6.js"]
    }
  ]
};
function render(request, {
  paths = {base: "", assets: "/."},
  local = false,
  only_render_prerenderable_pages = false,
  get_static_file
} = {}) {
  return ssr(request, {
    paths,
    local,
    template,
    manifest,
    target: "#svelte",
    entry: "/./_app/start-9cc60a6e.js",
    root: Root,
    setup,
    dev: false,
    amp: false,
    only_render_prerenderable_pages,
    app_dir: "_app",
    host: null,
    host_header: null,
    get_component_path: (id) => "/./_app/" + client_component_lookup[id],
    get_stack: (error2) => error2.stack,
    get_static_file,
    get_amp_css: (dep) => amp_css_lookup[dep]
  });
}
const Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<main></main>`;
});
var index$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Routes
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
var Product_svelte = ".itemstyles.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki{background:#fff;border:1px solid var(--offWhite);box-shadow:var(--bs);position:relative;display:flex;flex-direction:column}.itemstyles.svelte-ijgpki img.svelte-ijgpki.svelte-ijgpki{width:100%;height:400px;-o-object-fit:cover;object-fit:cover}.itemstyles.svelte-ijgpki p.svelte-ijgpki.svelte-ijgpki{line-height:2;font-weight:300;flex-grow:1;padding:0 3rem;font-size:1.5rem}.itemstyles.svelte-ijgpki .buttonList.svelte-ijgpki.svelte-ijgpki{display:grid;width:100%;border-top:1px solid var(--lightGray);grid-template-columns:repeat(auto-fit,minmax(100px,1fr));grid-gap:1px;background:var(--lightGray)}.itemstyles.svelte-ijgpki .buttonList.svelte-ijgpki>.svelte-ijgpki{background:#fff;border:0;font-size:1rem;padding:1rem}h3.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki{text-align:center;transform:skew(-5deg) rotate(-1deg);margin:-3rem 1rem 0;text-shadow:2px 2px 0 rgba(0,0,0,.1)}h3.svelte-ijgpki a.svelte-ijgpki.svelte-ijgpki{display:inline;line-height:1.3;font-size:4rem;text-align:center;padding:0 1rem}.pricetag.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki,h3.svelte-ijgpki a.svelte-ijgpki.svelte-ijgpki{background:var(--red);color:#fff}.pricetag.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki{transform:rotate(3deg);font-weight:600;padding:5px;line-height:1;font-size:3rem;display:inline-block;position:absolute;top:-3px;right:-3px}";
const css$4 = {
  code: ".itemstyles.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki{background:#fff;border:1px solid var(--offWhite);box-shadow:var(--bs);position:relative;display:flex;flex-direction:column}.itemstyles.svelte-ijgpki img.svelte-ijgpki.svelte-ijgpki{width:100%;height:400px;-o-object-fit:cover;object-fit:cover}.itemstyles.svelte-ijgpki p.svelte-ijgpki.svelte-ijgpki{line-height:2;font-weight:300;flex-grow:1;padding:0 3rem;font-size:1.5rem}.itemstyles.svelte-ijgpki .buttonList.svelte-ijgpki.svelte-ijgpki{display:grid;width:100%;border-top:1px solid var(--lightGray);grid-template-columns:repeat(auto-fit,minmax(100px,1fr));grid-gap:1px;background:var(--lightGray)}.itemstyles.svelte-ijgpki .buttonList.svelte-ijgpki>.svelte-ijgpki{background:#fff;border:0;font-size:1rem;padding:1rem}h3.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki{text-align:center;transform:skew(-5deg) rotate(-1deg);margin:-3rem 1rem 0;text-shadow:2px 2px 0 rgba(0,0,0,.1)}h3.svelte-ijgpki a.svelte-ijgpki.svelte-ijgpki{display:inline;line-height:1.3;font-size:4rem;text-align:center;padding:0 1rem}.pricetag.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki,h3.svelte-ijgpki a.svelte-ijgpki.svelte-ijgpki{background:var(--red);color:#fff}.pricetag.svelte-ijgpki.svelte-ijgpki.svelte-ijgpki{transform:rotate(3deg);font-weight:600;padding:5px;line-height:1;font-size:3rem;display:inline-block;position:absolute;top:-3px;right:-3px}",
  map: '{"version":3,"file":"Product.svelte","sources":["Product.svelte"],"sourcesContent":["<script>\\n  import formatMoney from \\"$lib/formatMoney\\";\\n\\n  export let product;\\n</script>\\n\\n<div class=\\"itemstyles\\">\\n  <img src={product?.photo?.image?.publicUrlTransformed} alt={product.name} />\\n  <h3>\\n    <a href={`/product/${product.id}`}>{product.name}</a>\\n  </h3>\\n  <span class=\\"pricetag\\">{formatMoney(product.price)}</span>\\n  <p>{product.description}</p>\\n  <div class=\\"buttonList\\">\\n    <a\\n      href={{\\n        pathname: \\"/update\\",\\n        query: {\\n          id: product.id,\\n        },\\n      }}\\n    >\\n      Edit Product\\n    </a>\\n    <!-- <AddToCart id={product.id} />\\n    <DeleteProduct id={product.id}>Delete</DeleteProduct> -->\\n  </div>\\n</div>\\n\\n<style lang=\\"scss\\">.itemstyles{background:#fff;border:1px solid var(--offWhite);box-shadow:var(--bs);position:relative;display:flex;flex-direction:column}.itemstyles img{width:100%;height:400px;-o-object-fit:cover;object-fit:cover}.itemstyles p{line-height:2;font-weight:300;flex-grow:1;padding:0 3rem;font-size:1.5rem}.itemstyles .buttonList{display:grid;width:100%;border-top:1px solid var(--lightGray);grid-template-columns:repeat(auto-fit,minmax(100px,1fr));grid-gap:1px;background:var(--lightGray)}.itemstyles .buttonList>*{background:#fff;border:0;font-size:1rem;padding:1rem}h3{text-align:center;transform:skew(-5deg) rotate(-1deg);margin:-3rem 1rem 0;text-shadow:2px 2px 0 rgba(0,0,0,.1)}h3 a{display:inline;line-height:1.3;font-size:4rem;text-align:center;padding:0 1rem}.pricetag,h3 a{background:var(--red);color:#fff}.pricetag{transform:rotate(3deg);font-weight:600;padding:5px;line-height:1;font-size:3rem;display:inline-block;position:absolute;top:-3px;right:-3px}</style>\\n"],"names":[],"mappings":"AA6BmB,qDAAW,CAAC,WAAW,IAAI,CAAC,OAAO,GAAG,CAAC,KAAK,CAAC,IAAI,UAAU,CAAC,CAAC,WAAW,IAAI,IAAI,CAAC,CAAC,SAAS,QAAQ,CAAC,QAAQ,IAAI,CAAC,eAAe,MAAM,CAAC,yBAAW,CAAC,+BAAG,CAAC,MAAM,IAAI,CAAC,OAAO,KAAK,CAAC,cAAc,KAAK,CAAC,WAAW,KAAK,CAAC,yBAAW,CAAC,6BAAC,CAAC,YAAY,CAAC,CAAC,YAAY,GAAG,CAAC,UAAU,CAAC,CAAC,QAAQ,CAAC,CAAC,IAAI,CAAC,UAAU,MAAM,CAAC,yBAAW,CAAC,uCAAW,CAAC,QAAQ,IAAI,CAAC,MAAM,IAAI,CAAC,WAAW,GAAG,CAAC,KAAK,CAAC,IAAI,WAAW,CAAC,CAAC,sBAAsB,OAAO,QAAQ,CAAC,OAAO,KAAK,CAAC,GAAG,CAAC,CAAC,CAAC,SAAS,GAAG,CAAC,WAAW,IAAI,WAAW,CAAC,CAAC,yBAAW,CAAC,yBAAW,CAAC,cAAC,CAAC,WAAW,IAAI,CAAC,OAAO,CAAC,CAAC,UAAU,IAAI,CAAC,QAAQ,IAAI,CAAC,4CAAE,CAAC,WAAW,MAAM,CAAC,UAAU,KAAK,KAAK,CAAC,CAAC,OAAO,KAAK,CAAC,CAAC,OAAO,KAAK,CAAC,IAAI,CAAC,CAAC,CAAC,YAAY,GAAG,CAAC,GAAG,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,gBAAE,CAAC,6BAAC,CAAC,QAAQ,MAAM,CAAC,YAAY,GAAG,CAAC,UAAU,IAAI,CAAC,WAAW,MAAM,CAAC,QAAQ,CAAC,CAAC,IAAI,CAAC,mDAAS,CAAC,gBAAE,CAAC,6BAAC,CAAC,WAAW,IAAI,KAAK,CAAC,CAAC,MAAM,IAAI,CAAC,mDAAS,CAAC,UAAU,OAAO,IAAI,CAAC,CAAC,YAAY,GAAG,CAAC,QAAQ,GAAG,CAAC,YAAY,CAAC,CAAC,UAAU,IAAI,CAAC,QAAQ,YAAY,CAAC,SAAS,QAAQ,CAAC,IAAI,IAAI,CAAC,MAAM,IAAI,CAAC"}'
};
const Product = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  var _a, _b;
  let {product} = $$props;
  if ($$props.product === void 0 && $$bindings.product && product !== void 0)
    $$bindings.product(product);
  $$result.css.add(css$4);
  return `<div class="${"itemstyles svelte-ijgpki"}"><img${add_attribute("src", (_b = (_a = product == null ? void 0 : product.photo) == null ? void 0 : _a.image) == null ? void 0 : _b.publicUrlTransformed, 0)}${add_attribute("alt", product.name, 0)} class="${"svelte-ijgpki"}">
  <h3 class="${"svelte-ijgpki"}"><a${add_attribute("href", `/product/${product.id}`, 0)} class="${"svelte-ijgpki"}">${escape(product.name)}</a></h3>
  <span class="${"pricetag svelte-ijgpki"}">${escape(formatMoney(product.price))}</span>
  <p class="${"svelte-ijgpki"}">${escape(product.description)}</p>
  <div class="${"buttonList svelte-ijgpki"}"><a${add_attribute("href", {
    pathname: "/update",
    query: {id: product.id}
  }, 0)} class="${"svelte-ijgpki"}">Edit Product
    </a>
    </div>
</div>`;
});
function l$1(a, b) {
  b.tag = a;
  return b;
}
function m$1() {
}
function p$1(a) {
  return function(b) {
    var c = a.length;
    let d = false, e = false, f = false, g = 0;
    b(l$1(0, [
      function(h) {
        if (h) {
          d = true;
        } else if (e) {
          f = true;
        } else {
          for (e = f = true; f && !d; ) {
            g < c ? (h = a[g], g = g + 1 | 0, f = false, b(l$1(1, [h]))) : (d = true, b(0));
          }
          e = false;
        }
      }
    ]));
  };
}
function r$2() {
}
function t$2(a) {
  a(0);
}
function u$2(a) {
  let b = false;
  a(l$1(0, [
    function(c) {
      c ? b = true : b || a(0);
    }
  ]));
}
function x$2(a) {
  if (a === null || a[0] !== v$2) {
    return a;
  }
  if ((a = a[1]) !== 0) {
    return [v$2, a - 1 | 0];
  }
}
function z$2(a) {
  return function(b) {
    return function(c) {
      function d(b2) {
        typeof b2 == "number" ? k2 && (k2 = false, (b2 = e.shift()) !== void 0 ? (b2 = a(x$2(b2)), k2 = true, b2(d)) : q2 ? c(0) : g || (g = true, f(0))) : b2.tag ? k2 && (c(b2), n2 ? n2 = false : h(0)) : (h = b2 = b2[0], n2 = false, b2(0));
      }
      let e = [], f = m$1, g = false, h = m$1, k2 = false, n2 = false, q2 = false;
      b(function(b2) {
        typeof b2 == "number" ? q2 || (q2 = true, k2 || e.length !== 0 || c(0)) : b2.tag ? q2 || (b2 = b2[0], g = false, k2 ? e.push(b2) : (b2 = a(b2), k2 = true, b2(d))) : f = b2[0];
      });
      c(l$1(0, [
        function(c2) {
          if (c2) {
            if (q2 || (q2 = true, f(1)), k2) {
              return k2 = false, h(1);
            }
          } else {
            q2 || g || (g = true, f(0)), k2 && !n2 && (n2 = true, h(0));
          }
        }
      ]));
    };
  };
}
function B$1(a) {
  return a;
}
function C(a) {
  return a(0);
}
function D$1(a) {
  return function(b) {
    return function(c) {
      let e = m$1, f = false, g = [], h = false;
      b(function(b2) {
        typeof b2 == "number" ? h || (h = true, g.length === 0 && c(0)) : b2.tag ? h || (f = false, function(a2) {
          function b3(a3) {
            typeof a3 == "number" ? g.length !== 0 && (g = g.filter(d), a3 = g.length === 0, h && a3 ? c(0) : !f && a3 && (f = true, e(0))) : a3.tag ? g.length !== 0 && (c(l$1(1, [a3[0]])), k2(0)) : (k2 = a3 = a3[0], g = g.concat(a3), a3(0));
          }
          function d(a3) {
            return a3 !== k2;
          }
          let k2 = m$1;
          a2.length === 1 ? a2(b3) : a2.bind(null, b3);
        }(a(b2[0])), f || (f = true, e(0))) : e = b2[0];
      });
      c(l$1(0, [
        function(a2) {
          a2 ? (h || (h = true, e(a2)), g.forEach(function(c2) {
            return c2(a2);
          }), g = []) : (f || h ? f = false : (f = true, e(0)), g.forEach(C));
        }
      ]));
    };
  };
}
function E$1(a) {
  return a;
}
function H$1(a) {
  return function(b) {
    return function(c) {
      let d = false;
      return b(function(e) {
        if (typeof e == "number") {
          d || (d = true, c(e));
        } else if (e.tag) {
          d || (a(e[0]), c(e));
        } else {
          var g = e[0];
          c(l$1(0, [
            function(a2) {
              if (!d) {
                return a2 && (d = true), g(a2);
              }
            }
          ]));
        }
      });
    };
  };
}
function J$1(a) {
  a(0);
}
function K(a) {
  return function(b) {
    return function(c) {
      function d(a2) {
        h && (typeof a2 == "number" ? (h = false, n2 ? c(a2) : f || (f = true, e(0))) : a2.tag ? (c(a2), k2 ? k2 = false : g(0)) : (g = a2 = a2[0], k2 = false, a2(0)));
      }
      let e = m$1, f = false, g = m$1, h = false, k2 = false, n2 = false;
      b(function(b2) {
        typeof b2 == "number" ? n2 || (n2 = true, h || c(0)) : b2.tag ? n2 || (h && (g(1), g = m$1), f ? f = false : (f = true, e(0)), b2 = a(b2[0]), h = true, b2(d)) : e = b2[0];
      });
      c(l$1(0, [
        function(a2) {
          if (a2) {
            if (n2 || (n2 = true, e(1)), h) {
              return h = false, g(1);
            }
          } else {
            n2 || f || (f = true, e(0)), h && !k2 && (k2 = true, g(0));
          }
        }
      ]));
    };
  };
}
function M$1(a) {
  return function(b) {
    return function(c) {
      let d = [], e = m$1;
      return b(function(b2) {
        typeof b2 == "number" ? p$1(d)(c) : b2.tag ? (d.length >= a && 0 < a && d.shift(), d.push(b2[0]), e(0)) : (b2 = b2[0], 0 >= a ? (b2(1), u$2(c)) : (e = b2, b2(0)));
      });
    };
  };
}
function N$1(a) {
  return function(b) {
    let c = m$1, d = false;
    b(function(e) {
      typeof e == "number" ? d = true : e.tag ? d || (a(e[0]), c(0)) : (c = e = e[0], e(0));
    });
    return {
      unsubscribe: function() {
        if (!d) {
          return d = true, c(1);
        }
      }
    };
  };
}
function O$1() {
}
function concat$1(a) {
  return z$2(B$1)(p$1(a));
}
function filter$1(a) {
  return function(b) {
    return function(c) {
      let d = m$1;
      return b(function(b2) {
        typeof b2 == "number" ? c(b2) : b2.tag ? a(b2[0]) ? c(b2) : d(0) : (d = b2[0], c(b2));
      });
    };
  };
}
function fromValue$1(a) {
  return function(b) {
    let c = false;
    b(l$1(0, [
      function(d) {
        d ? c = true : c || (c = true, b(l$1(1, [a])), b(0));
      }
    ]));
  };
}
function make$1(a) {
  return function(b) {
    let c = r$2, d = false;
    c = a({
      next: function(a2) {
        d || b(l$1(1, [a2]));
      },
      complete: function() {
        d || (d = true, b(0));
      }
    });
    b(l$1(0, [
      function(a2) {
        if (a2 && !d) {
          return d = true, c();
        }
      }
    ]));
  };
}
function makeSubject$1() {
  let a = [], b = false;
  return {
    source: function(c) {
      function b2(a2) {
        return a2 !== c;
      }
      a = a.concat(c);
      c(l$1(0, [
        function(c2) {
          c2 && (a = a.filter(b2));
        }
      ]));
    },
    next: function(c) {
      b || a.forEach(function(a2) {
        a2(l$1(1, [c]));
      });
    },
    complete: function() {
      b || (b = true, a.forEach(t$2));
    }
  };
}
function map$1(a) {
  return function(b) {
    return function(c) {
      return b(function(b2) {
        b2 = typeof b2 == "number" ? 0 : b2.tag ? l$1(1, [a(b2[0])]) : l$1(0, [b2[0]]);
        c(b2);
      });
    };
  };
}
function merge$1(a) {
  return D$1(E$1)(p$1(a));
}
function onEnd$1(a) {
  return function(b) {
    return function(c) {
      let d = false;
      return b(function(b2) {
        if (typeof b2 == "number") {
          if (d) {
            return;
          }
          d = true;
          c(b2);
          return a();
        }
        if (b2.tag) {
          d || c(b2);
        } else {
          var e = b2[0];
          c(l$1(0, [
            function(c2) {
              if (!d) {
                return c2 ? (d = true, e(c2), a()) : e(c2);
              }
            }
          ]));
        }
      });
    };
  };
}
function onStart$1(a) {
  return function(b) {
    return function(c) {
      return b(function(b2) {
        typeof b2 == "number" ? c(b2) : b2.tag ? c(b2) : (c(b2), a());
      });
    };
  };
}
function publish$1(a) {
  return N$1(O$1)(a);
}
function scan$1(a, b) {
  return function(a2, b2) {
    return function(c) {
      return function(d) {
        let e = b2;
        return c(function(c2) {
          typeof c2 == "number" ? c2 = 0 : c2.tag ? (e = a2(e, c2[0]), c2 = l$1(1, [e])) : c2 = l$1(0, [c2[0]]);
          d(c2);
        });
      };
    };
  }(a, b);
}
function share$1(a) {
  function b(a2) {
    typeof a2 == "number" ? (c.forEach(J$1), c = []) : a2.tag ? (e = false, c.forEach(function(b2) {
      b2(a2);
    })) : d = a2[0];
  }
  let c = [], d = m$1, e = false;
  return function(f) {
    function g(a2) {
      return a2 !== f;
    }
    c = c.concat(f);
    c.length === 1 && a(b);
    f(l$1(0, [
      function(a2) {
        if (a2) {
          if (c = c.filter(g), c.length === 0) {
            return d(1);
          }
        } else {
          e || (e = true, d(a2));
        }
      }
    ]));
  };
}
function take$1(a) {
  return function(b) {
    return function(c) {
      let d = false, e = 0, f = m$1;
      b(function(b2) {
        typeof b2 == "number" ? d || (d = true, c(0)) : b2.tag ? e < a && !d && (e = e + 1 | 0, c(b2), !d && e >= a && (d = true, c(0), f(1))) : (b2 = b2[0], 0 >= a ? (d = true, c(0), b2(1)) : f = b2);
      });
      c(l$1(0, [
        function(b2) {
          if (!d) {
            if (b2) {
              return d = true, f(1);
            }
            if (e < a) {
              return f(0);
            }
          }
        }
      ]));
    };
  };
}
function takeUntil$1(a) {
  return function(b) {
    return function(c) {
      function d(a2) {
        typeof a2 != "number" && (a2.tag ? (e = true, f(1), c(0)) : (g = a2 = a2[0], a2(0)));
      }
      let e = false, f = m$1, g = m$1;
      b(function(b2) {
        typeof b2 == "number" ? e || (e = true, g(1), c(0)) : b2.tag ? e || c(b2) : (f = b2[0], a(d));
      });
      c(l$1(0, [
        function(a2) {
          if (!e) {
            return a2 ? (e = true, f(1), g(1)) : f(0);
          }
        }
      ]));
    };
  };
}
function toPromise$1(a) {
  return new Promise(function(b) {
    M$1(1)(a)(function(a2) {
      if (typeof a2 != "number") {
        if (a2.tag) {
          b(a2[0]);
        } else {
          a2[0](0);
        }
      }
    });
  });
}
var v$2 = [];
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
    for (var i = 0; i < locationLine.length; i += 80) {
      subLines.push(locationLine.slice(i, i + 80));
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
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
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
      var a = [null];
      a.push.apply(a, args2);
      var Constructor = Function.bind.apply(Parent2, a);
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
  } catch (e) {
    return false;
  }
}
function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
function _setPrototypeOf(o, p2) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o2, p3) {
    o2.__proto__ = p3;
    return o2;
  };
  return _setPrototypeOf(o, p2);
}
function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf2(o2) {
    return o2.__proto__ || Object.getPrototypeOf(o2);
  };
  return _getPrototypeOf(o);
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
  for (var i = 0; i < len; ++i) {
    items.push(formatValue(array[i], seenValues));
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
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
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
    for (var i = 1; i < lines.length; i++) {
      lines[i] = lines[i].slice(commonIndent);
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
  for (var i = 0; i < str.length; ++i) {
    if (str[i] !== " " && str[i] !== "	") {
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
  for (var i = 0; i < value.length; ++i) {
    switch (value.charCodeAt(i)) {
      case 13:
        if (value.charCodeAt(i + 1) === 10) {
          ++i;
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
function uniCharCode(a, b, c, d) {
  return char2hex(a) << 12 | char2hex(b) << 8 | char2hex(c) << 4 | char2hex(d);
}
function char2hex(a) {
  return a >= 48 && a <= 57 ? a - 48 : a >= 65 && a <= 70 ? a - 55 : a >= 97 && a <= 102 ? a - 87 : -1;
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
function k(a) {
  return typeof a == "string" ? new GraphQLError(a) : typeof a == "object" && a.message ? new GraphQLError(a.message, a.nodes, a.source, a.positions, a.path, a, a.extensions || {}) : a;
}
function l() {
  return this.message;
}
function n$1(a, b) {
  a |= 0;
  for (var c = 0, d = 0 | b.length; c < d; c++) {
    a = (a << 5) + a + b.charCodeAt(c);
  }
  return a;
}
function t$1(a) {
  var b, c, d, e, f, g;
  if (a === null || q.has(a)) {
    return "null";
  }
  if (typeof a != "object") {
    return JSON.stringify(a) || "";
  }
  if (a.toJSON) {
    return t$1(a.toJSON());
  }
  if (Array.isArray(a)) {
    for (b = "[", c = 0, d = a.length; c < d; c++) {
      0 < c && (b += ",");
      b += 0 < (e = t$1(a[c])).length ? e : "null";
    }
    return b + "]";
  }
  if (!(b = Object.keys(a).sort()).length && a.constructor && a.constructor !== Object) {
    return b = r$1.get(a) || Math.random().toString(36).slice(2), r$1.set(a, b), '{"__key":"' + b + '"}';
  }
  q.add(a);
  c = "{";
  d = 0;
  for (e = b.length; d < e; d++) {
    (g = t$1(a[f = b[d]])) && (1 < c.length && (c += ","), c += t$1(f) + ":" + g);
  }
  q.delete(a);
  return c + "}";
}
function u$1(a) {
  q.clear();
  return t$1(a);
}
function v$1(a) {
  var b = (typeof a != "string" ? a.loc && a.loc.source.body || print(a) : a).replace(/([\s,]|#[^\n\r]+)+/g, " ").trim();
  typeof a != "string" && (a.loc ? (a = "definitions" in a && w$1(a)) && (b = "# " + a + "\n" + b) : a.loc = {
    start: 0,
    end: b.length,
    source: {
      body: b,
      name: "gql",
      locationOffset: {
        line: 1,
        column: 1
      }
    }
  });
  return b;
}
function y$1(a) {
  if (typeof a == "string") {
    var b = n$1(5381, v$1(a)) >>> 0;
    a = x$1.get(b) || parse(a, {
      noLocation: true
    });
  } else {
    b = a.__key || n$1(5381, v$1(a)) >>> 0, a = x$1.get(b) || a;
  }
  a.loc || v$1(a);
  a.__key = b;
  x$1.set(b, a);
  return a;
}
function w$1(a) {
  var b, c, d;
  for (b = 0, c = a.definitions.length; b < c; b++) {
    if ((d = a.definitions[b]).kind === Kind.OPERATION_DEFINITION && d.name) {
      return d.name.value;
    }
  }
}
function z$1(a, b, c) {
  return {
    operation: a,
    data: b.data,
    error: Array.isArray(b.errors) ? new m({
      graphQLErrors: b.errors,
      response: c
    }) : void 0,
    extensions: typeof b.extensions == "object" && b.extensions || void 0
  };
}
function A(a, b, c) {
  return {
    operation: a,
    data: void 0,
    error: new m({
      networkError: b,
      response: c
    }),
    extensions: void 0
  };
}
function B() {
  return (B = Object.assign || function(a) {
    var b, c, d;
    for (b = 1; b < arguments.length; b++) {
      c = arguments[b];
      for (d in c) {
        Object.prototype.hasOwnProperty.call(c, d) && (a[d] = c[d]);
      }
    }
    return a;
  }).apply(this, arguments);
}
function makeFetchBody(a) {
  return {
    query: print(a.query),
    operationName: w$1(a.query),
    variables: a.variables || void 0,
    extensions: void 0
  };
}
function makeFetchURL(a, b) {
  var c = a.context.url;
  if (a.kind !== "query" || !a.context.preferGetMethod || !b) {
    return c;
  }
  a = [];
  b.operationName && a.push("operationName=" + encodeURIComponent(b.operationName));
  b.query && a.push("query=" + encodeURIComponent(b.query.replace(/([\s,]|#[^\n\r]+)+/g, " ").trim()));
  b.variables && a.push("variables=" + encodeURIComponent(u$1(b.variables)));
  b.extensions && a.push("extensions=" + encodeURIComponent(u$1(b.extensions)));
  return c + "?" + a.join("&");
}
function makeFetchOptions(a, b) {
  var c = a.kind === "query" && !!a.context.preferGetMethod;
  return B({}, a = typeof a.context.fetchOptions == "function" ? a.context.fetchOptions() : a.context.fetchOptions || {}, {
    body: !c && b ? JSON.stringify(b) : void 0,
    method: c ? "GET" : "POST",
    headers: c ? a.headers : B({}, {
      "content-type": "application/json"
    }, a.headers)
  });
}
function makeFetchSource(a, b, c) {
  return make$1(function(d) {
    var e = d.next, f = d.complete, g = typeof AbortController != "undefined" ? new AbortController() : null, p2 = false;
    Promise.resolve().then(function() {
      if (!p2) {
        return g && (c.signal = g.signal), function C2(a2, b2, c2) {
          var e2, d2 = false;
          return (a2.context.fetch || fetch)(b2, c2).then(function(a3) {
            e2 = a3;
            d2 = 200 > a3.status || a3.status >= (c2.redirect === "manual" ? 400 : 300);
            return a3.json();
          }).then(function(b3) {
            if (!("data" in b3) && !("errors" in b3)) {
              throw Error("No Content");
            }
            return z$1(a2, b3, e2);
          }).catch(function(b3) {
            if (b3.name !== "AbortError") {
              return A(a2, d2 ? Error(e2.statusText) : b3, e2);
            }
          });
        }(a, b, c);
      }
    }).then(function(a2) {
      p2 || (p2 = true, a2 && e(a2), f());
    });
    return function() {
      p2 = true;
      g && g.abort();
    };
  });
}
function createRequest(a, b) {
  a = y$1(a);
  return {
    key: b ? n$1(a.__key, u$1(b)) >>> 0 : a.__key,
    query: a,
    variables: b || {}
  };
}
var m, q, r$1, x$1;
m = function(a) {
  function b(b2) {
    var f, c = b2.networkError, e = b2.response;
    f = function h(a2, b3) {
      var d = "";
      if (a2 !== void 0) {
        return d = "[Network] " + a2.message;
      }
      b3 !== void 0 && b3.forEach(function c2(a3) {
        d += "[GraphQL] " + a3.message + "\n";
      });
      return d.trim();
    }(c, b2 = (b2.graphQLErrors || []).map(k));
    a.call(this, f);
    this.name = "CombinedError";
    this.message = f;
    this.graphQLErrors = b2;
    this.networkError = c;
    this.response = e;
  }
  a && (b.__proto__ = a);
  (b.prototype = Object.create(a && a.prototype)).constructor = b;
  b.prototype.toString = l;
  return b;
}(Error);
q = new Set(), r$1 = new WeakMap();
x$1 = new Map();
function n(a, b) {
  if (Array.isArray(a)) {
    for (var c = 0; c < a.length; c++) {
      n(a[c], b);
    }
  } else if (typeof a == "object" && a !== null) {
    for (c in a) {
      c === "__typename" && typeof a[c] == "string" ? b[a[c]] = 0 : n(a[c], b);
    }
  }
  return b;
}
function p(a) {
  return a.kind === Kind.FIELD && a.name.value === "__typename" && !a.alias;
}
function r(a) {
  if (a.selectionSet && !a.selectionSet.selections.some(p)) {
    return B({}, a, {
      selectionSet: B({}, a.selectionSet, {
        selections: a.selectionSet.selections.concat([{
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
function u(a) {
  a = y$1(a);
  var b = t.get(a.__key);
  b || ((b = visit(a, {
    Field: r,
    InlineFragment: r
  })).__key = a.__key, t.set(a.__key, b));
  return b;
}
function v(a) {
  return a && typeof a == "object" ? Object.keys(a).reduce(function(b, c) {
    var d = a[c];
    c === "__typename" ? Object.defineProperty(b, "__typename", {
      enumerable: false,
      value: d
    }) : Array.isArray(d) ? b[c] = d.map(v) : b[c] = d && typeof d == "object" && "__typename" in d ? v(d) : d;
    return b;
  }, {}) : a;
}
function w(a) {
  a.toPromise = function() {
    return toPromise$1(take$1(1)(a));
  };
  return a;
}
function x(a, b, c) {
  c || (c = b.context);
  return {
    key: b.key,
    query: b.query,
    variables: b.variables,
    kind: a,
    context: c
  };
}
function y(a, b) {
  return x(a.kind, a, B({}, a.context, {
    meta: B({}, a.context.meta, b)
  }));
}
function z() {
}
function D(a) {
  return (a = a.kind) !== "mutation" && a !== "query";
}
function E(a) {
  var b = x(a.kind, a);
  b.query = u(a.query);
  return b;
}
function F(a) {
  return a.kind !== "query" || a.context.requestPolicy !== "cache-only";
}
function G(a) {
  return y(a, {
    cacheOutcome: "miss"
  });
}
function H(a) {
  return D(a);
}
function I(a) {
  function b(a2) {
    var b2 = a2.context.requestPolicy;
    return a2.kind === "query" && b2 !== "network-only" && (b2 === "cache-only" || k2.has(a2.key));
  }
  function c(a2) {
    var c2 = k2.get(a2.key);
    c2 = B({}, c2, {
      operation: y(a2, {
        cacheOutcome: c2 ? "hit" : "miss"
      })
    });
    a2.context.requestPolicy === "cache-and-network" && (c2.stale = true, J(m2, a2));
    return c2;
  }
  function d(a2) {
    return !D(a2) && b(a2);
  }
  function e(a2) {
    function c2(a3) {
      g2.add(a3);
    }
    var e2, g2, l2, d2 = a2.operation;
    if (d2) {
      e2 = Object.keys(n(a2.data, {})).concat(d2.context.additionalTypenames || []);
      if (a2.operation.kind === "mutation") {
        g2 = new Set();
        for (a2 = 0; a2 < e2.length; a2++) {
          (l2 = h[l2 = e2[a2]] || (h[l2] = new Set())).forEach(c2);
          l2.clear();
        }
        g2.forEach(function b2(a3) {
          k2.has(a3) && (d2 = k2.get(a3).operation, k2.delete(a3), J(m2, d2));
        });
      } else if (d2.kind === "query" && a2.data) {
        for (k2.set(d2.key, a2), a2 = 0; a2 < e2.length; a2++) {
          (h[l2 = e2[a2]] || (h[l2] = new Set())).add(d2.key);
        }
      }
    }
  }
  function f(a2) {
    return !D(a2) && !b(a2);
  }
  var g = a.forward, m2 = a.client;
  a.dispatchDebug;
  var k2 = new Map(), h = Object.create(null);
  return function(a2) {
    var b2 = share$1(a2);
    a2 = map$1(c)(filter$1(d)(b2));
    b2 = H$1(e)(g(filter$1(F)(map$1(G)(merge$1([map$1(E)(filter$1(f)(b2)), filter$1(H)(b2)])))));
    return merge$1([a2, b2]);
  };
}
function J(a, b) {
  return a.reexecuteOperation(x(b.kind, b, B({}, b.context, {
    requestPolicy: "network-only"
  })));
}
function M(a) {
  function b(a2) {
    f.delete(a2.operation.key);
  }
  function c(a2) {
    var c2 = a2.key, b2 = a2.kind;
    if (b2 === "teardown") {
      return f.delete(c2), true;
    }
    if (b2 !== "query" && b2 !== "subscription") {
      return true;
    }
    b2 = f.has(c2);
    f.add(c2);
    b2 && false;
    return !b2;
  }
  var d = a.forward, e = a.dispatchDebug, f = new Set();
  return function(a2) {
    a2 = filter$1(c)(a2);
    return H$1(b)(d(a2));
  };
}
function N(a) {
  return a.kind === "query" || a.kind === "mutation";
}
function O(a) {
  return a.kind !== "query" && a.kind !== "mutation";
}
function P(a) {
  var b = a.forward;
  a.dispatchDebug;
  return function(a2) {
    var f, d = share$1(a2);
    a2 = D$1(function(a3) {
      var b2 = a3.key, e = filter$1(function(a4) {
        return a4.kind === "teardown" && a4.key === b2;
      })(d), g = makeFetchBody(a3), h = makeFetchURL(a3, g), l2 = makeFetchOptions(a3, g);
      return H$1(function(b3) {
        b3.data ? void 0 : b3.error;
      })(takeUntil$1(e)(makeFetchSource(a3, h, l2)));
    })(filter$1(N)(d));
    f = b(filter$1(O)(d));
    return merge$1([a2, f]);
  };
}
function Q() {
  return false;
}
function R(a) {
  function b(a2) {
    if (a2.kind !== "teardown" && false) {
      var b2 = 'No exchange has handled operations of kind "' + a2.kind + `". Check whether you've added an exchange responsible for these operations.`;
      console.warn(b2);
    }
  }
  a.dispatchDebug;
  return function(a2) {
    return filter$1(Q)(H$1(b)(a2));
  };
}
function T(a) {
  return function(b) {
    var c = b.client;
    b.dispatchDebug;
    return a.reduceRight(function(a2, b2) {
      return b2({
        client: c,
        forward: a2,
        dispatchDebug: function(a3) {
        }
      });
    }, b.forward);
  };
}
function V(a) {
  var d, e, g, m2, c = this;
  this.activeOperations = Object.create(null);
  this.queue = [];
  this.createOperationContext = function(a2) {
    a2 || (a2 = {});
    return B({}, {
      url: c.url,
      fetchOptions: c.fetchOptions,
      fetch: c.fetch,
      preferGetMethod: c.preferGetMethod
    }, a2, {
      suspense: a2.suspense || a2.suspense !== false && c.suspense,
      requestPolicy: a2.requestPolicy || c.requestPolicy
    });
  };
  this.createRequestOperation = function(a2, b, d2) {
    return x(a2, b, c.createOperationContext(d2));
  };
  this.executeQuery = function(a2, b) {
    a2 = c.createRequestOperation("query", a2, b);
    return c.executeRequestOperation(a2);
  };
  this.executeSubscription = function(a2, b) {
    a2 = c.createRequestOperation("subscription", a2, b);
    return c.executeRequestOperation(a2);
  };
  this.executeMutation = function(a2, b) {
    a2 = c.createRequestOperation("mutation", a2, b);
    return c.executeRequestOperation(a2);
  };
  d = z;
  this.url = a.url;
  this.fetchOptions = a.fetchOptions;
  this.fetch = a.fetch;
  this.suspense = !!a.suspense;
  this.requestPolicy = a.requestPolicy || "cache-first";
  this.preferGetMethod = !!a.preferGetMethod;
  this.maskTypename = !!a.maskTypename;
  e = makeSubject$1();
  g = e.next;
  this.operations$ = e.source;
  m2 = false;
  this.dispatchOperation = function(a2) {
    m2 = true;
    for (a2 && g(a2); a2 = c.queue.shift(); ) {
      g(a2);
    }
    m2 = false;
  };
  this.reexecuteOperation = function(a2) {
    if (a2.kind === "mutation" || 0 < (c.activeOperations[a2.key] || 0)) {
      c.queue.push(a2), m2 || Promise.resolve().then(c.dispatchOperation);
    }
  };
  a = T(a.exchanges !== void 0 ? a.exchanges : U);
  this.results$ = share$1(a({
    client: this,
    dispatchDebug: d,
    forward: R({
      dispatchDebug: d
    })
  })(this.operations$));
  publish$1(this.results$);
}
function W(a) {
  a.data = v(a.data);
  return a;
}
function createClient(a) {
  return new V(a);
}
var t, U;
t = new Map();
R({
  dispatchDebug: z
});
U = [M, I, P];
V.prototype.onOperationStart = function(a) {
  var b = a.key;
  this.activeOperations[b] = (this.activeOperations[b] || 0) + 1;
  this.dispatchOperation(a);
};
V.prototype.onOperationEnd = function(a) {
  var b = a.key, c = this.activeOperations[b] || 0;
  if (0 >= (this.activeOperations[b] = 0 >= c ? 0 : c - 1)) {
    for (b = this.queue.length - 1; 0 <= b; b--) {
      this.queue[b].key === a.key && this.queue.splice(b, 1);
    }
    this.dispatchOperation(x("teardown", a, a.context));
  }
};
V.prototype.executeRequestOperation = function(a) {
  var e, f, c = this, d = filter$1(function(b) {
    return b.operation.key === a.key;
  })(this.results$);
  this.maskTypename && (d = map$1(W)(d));
  if (a.kind === "mutation") {
    return take$1(1)(onStart$1(function b() {
      return c.dispatchOperation(a);
    })(d));
  }
  e = filter$1(function(b) {
    return b.kind === "teardown" && b.key === a.key;
  })(this.operations$), f = filter$1(function(b) {
    return b.kind === a.kind && b.key === a.key && b.context.requestPolicy !== "cache-only";
  })(this.operations$);
  return onEnd$1(function() {
    c.onOperationEnd(a);
  })(onStart$1(function() {
    c.onOperationStart(a);
  })(K(function(a2) {
    return a2.stale ? fromValue$1(a2) : merge$1([fromValue$1(a2), map$1(function() {
      return B({}, a2, {
        stale: true
      });
    })(take$1(1)(f))]);
  })(takeUntil$1(e)(d))));
};
V.prototype.query = function(a, b, c) {
  c && typeof c.suspense == "boolean" || (c = B({}, c, {
    suspense: false
  }));
  return w(this.executeQuery(createRequest(a, b), c));
};
V.prototype.readQuery = function(a, b, c) {
  var d = null;
  N$1(function(a2) {
    d = a2;
  })(this.executeQuery(createRequest(a, b), c)).unsubscribe();
  return d;
};
V.prototype.subscription = function(a, b, c) {
  return this.executeSubscription(createRequest(a, b), c);
};
V.prototype.mutation = function(a, b, c) {
  return w(this.executeMutation(createRequest(a, b), c));
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
        for (let i = 0; i < subscribers.length; i += 1) {
          const s = subscribers[i];
          s[1]();
          subscriber_queue.push(s, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
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
    var i, source, key;
    for (i = 1; i < arguments.length; i++) {
      source = arguments[i];
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
      var request = createRequest(state.query, state.variables), contextKey = u$1(request.context = state.context);
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
var Products_svelte = ".product-list.svelte-9994ax{display:grid;grid-template-columns:1fr 1fr;grid-gap:60px}";
const css$3 = {
  code: ".product-list.svelte-9994ax{display:grid;grid-template-columns:1fr 1fr;grid-gap:60px}",
  map: '{"version":3,"file":"Products.svelte","sources":["Products.svelte"],"sourcesContent":["<script>\\n  import Product from \\"./Product.svelte\\";\\n  import { operationStore, query } from \\"@urql/svelte\\";\\n\\n  const allProducts = operationStore(`\\n        query {\\n          allProducts {\\n            id\\n            name\\n            description\\n            photo {\\n              id\\n              image {\\n                publicUrlTransformed\\n              }\\n            }\\n            price\\n          }\\n        }\\n      `);\\n\\n  query(allProducts);\\n</script>\\n\\n<svelte:head>\\n  <title>Sick Fits</title>\\n</svelte:head>\\n\\n{#if $allProducts.fetching}\\n  <p>Loading...</p>\\n{:else if $allProducts.error}\\n  <p>Oh no... {$allProducts.error.message}</p>\\n{:else}\\n  <div class=\\"product-list\\">\\n    {#each $allProducts?.data.allProducts as product}\\n      <Product {product} />\\n    {/each}\\n  </div>\\n{/if}\\n\\n<style lang=\\"scss\\">.product-list{display:grid;grid-template-columns:1fr 1fr;grid-gap:60px}</style>\\n"],"names":[],"mappings":"AAwCmB,2BAAa,CAAC,QAAQ,IAAI,CAAC,sBAAsB,GAAG,CAAC,GAAG,CAAC,SAAS,IAAI,CAAC"}'
};
const Products = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $allProducts, $$unsubscribe_allProducts;
  const allProducts = operationStore(`
        query {
          allProducts {
            id
            name
            description
            photo {
              id
              image {
                publicUrlTransformed
              }
            }
            price
          }
        }
      `);
  $$unsubscribe_allProducts = subscribe(allProducts, (value) => $allProducts = value);
  query(allProducts);
  $$result.css.add(css$3);
  $$unsubscribe_allProducts();
  return `${$$result.head += `${$$result.title = `<title>Sick Fits</title>`, ""}`, ""}

${$allProducts.fetching ? `<p>Loading...</p>` : `${$allProducts.error ? `<p>Oh no... ${escape($allProducts.error.message)}</p>` : `<div class="${"product-list svelte-9994ax"}">${each($allProducts == null ? void 0 : $allProducts.data.allProducts, (product) => `${validate_component(Product, "Product").$$render($$result, {product}, {}, {})}`)}</div>`}`}`;
});
const Products_1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `${$$result.title = `<title>Sick Fits</title>`, ""}`, ""}

<div>${validate_component(Products, "Products").$$render($$result, {}, {}, {})}</div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: Products_1
});
var Nav_svelte = 'ul.svelte-158kai9.svelte-158kai9{margin:0;padding:0;display:flex;justify-self:end;font-size:2rem}ul.svelte-158kai9 a.svelte-158kai9{padding:1rem 3rem;display:flex;align-items:center;position:relative;text-transform:uppercase;font-weight:900;font-size:1em;background:none;border:0;cursor:pointer}@media(max-width:700px){ul.svelte-158kai9 a.svelte-158kai9{font-size:10px;padding:0 10px}}ul.svelte-158kai9 a.svelte-158kai9:before{content:"";width:2px;background:var(--lightGray);height:100%;left:0;position:absolute;transform:skew(-20deg);top:0;bottom:0}ul.svelte-158kai9 a.svelte-158kai9:after{height:2px;background:red;content:"";width:0;position:absolute;transform:translateX(-50%);transition:width .4s;transition-timing-function:cubic-bezier(1,-.65,0,2.31);left:50%;margin-top:2rem}ul.svelte-158kai9 a.svelte-158kai9:focus,ul.svelte-158kai9 a.svelte-158kai9:hover{outline:none}ul.svelte-158kai9 a.svelte-158kai9:focus:after,ul.svelte-158kai9 a.svelte-158kai9:hover:after{width:calc(100% - 60px)}@media(max-width:700px){ul.svelte-158kai9 a.svelte-158kai9:focus,ul.svelte-158kai9 a.svelte-158kai9:hover{width:calc(100% - 10px)}}@media(max-width:1300px){ul.svelte-158kai9.svelte-158kai9{border-top:1px solid var(--lightGray);width:100%;justify-content:center;font-size:1.5rem}}';
const css$2 = {
  code: 'ul.svelte-158kai9.svelte-158kai9{margin:0;padding:0;display:flex;justify-self:end;font-size:2rem}ul.svelte-158kai9 a.svelte-158kai9{padding:1rem 3rem;display:flex;align-items:center;position:relative;text-transform:uppercase;font-weight:900;font-size:1em;background:none;border:0;cursor:pointer}@media(max-width:700px){ul.svelte-158kai9 a.svelte-158kai9{font-size:10px;padding:0 10px}}ul.svelte-158kai9 a.svelte-158kai9:before{content:"";width:2px;background:var(--lightGray);height:100%;left:0;position:absolute;transform:skew(-20deg);top:0;bottom:0}ul.svelte-158kai9 a.svelte-158kai9:after{height:2px;background:red;content:"";width:0;position:absolute;transform:translateX(-50%);transition:width .4s;transition-timing-function:cubic-bezier(1,-.65,0,2.31);left:50%;margin-top:2rem}ul.svelte-158kai9 a.svelte-158kai9:focus,ul.svelte-158kai9 a.svelte-158kai9:hover{outline:none}ul.svelte-158kai9 a.svelte-158kai9:focus:after,ul.svelte-158kai9 a.svelte-158kai9:hover:after{width:calc(100% - 60px)}@media(max-width:700px){ul.svelte-158kai9 a.svelte-158kai9:focus,ul.svelte-158kai9 a.svelte-158kai9:hover{width:calc(100% - 10px)}}@media(max-width:1300px){ul.svelte-158kai9.svelte-158kai9{border-top:1px solid var(--lightGray);width:100%;justify-content:center;font-size:1.5rem}}',
  map: `{"version":3,"file":"Nav.svelte","sources":["Nav.svelte"],"sourcesContent":["<!-- import Link from 'next/link';\\nimport { useCart } from '../lib/cartState';\\nimport CartCount from './CartCount';\\nimport SignOut from './SignOut';\\nimport NavStyles from './styles/NavStyles';\\nimport { useUser } from './User'; -->\\n<script>\\n  let blank = \\"\\";\\n</script>\\n\\n<ul>\\n  <a href=\\"/products\\">Products</a>\\n  <a href=\\"/sell\\">Sell</a>\\n  <a href=\\"/order\\">Orders</a>\\n  <a href=\\"/account\\">Account</a>\\n  <!-- <SignOut /> -->\\n  <!-- <button type=\\"button\\" onClick={openCart}>\\n            My Cart\\n            <CartCount\\n              count={user.cart.reduce(\\n                (tally, cartItem) =>\\n                  tally + (cartItem.product ? cartItem.quantity : 0),\\n                0\\n              )}\\n            />\\n          </button> -->\\n</ul>\\n\\n<style lang=\\"scss\\">ul{margin:0;padding:0;display:flex;justify-self:end;font-size:2rem}ul a,ul button{padding:1rem 3rem;display:flex;align-items:center;position:relative;text-transform:uppercase;font-weight:900;font-size:1em;background:none;border:0;cursor:pointer}@media (max-width:700px){ul a,ul button{font-size:10px;padding:0 10px}}ul a:before,ul button:before{content:\\"\\";width:2px;background:var(--lightGray);height:100%;left:0;position:absolute;transform:skew(-20deg);top:0;bottom:0}ul a:after,ul button:after{height:2px;background:red;content:\\"\\";width:0;position:absolute;transform:translateX(-50%);transition:width .4s;transition-timing-function:cubic-bezier(1,-.65,0,2.31);left:50%;margin-top:2rem}ul a:focus,ul a:hover,ul button:focus,ul button:hover{outline:none}ul a:focus:after,ul a:hover:after,ul button:focus:after,ul button:hover:after{width:calc(100% - 60px)}@media (max-width:700px){ul a:focus,ul a:hover,ul button:focus,ul button:hover{width:calc(100% - 10px)}}@media (max-width:1300px){ul{border-top:1px solid var(--lightGray);width:100%;justify-content:center;font-size:1.5rem}}</style>\\n"],"names":[],"mappings":"AA4BmB,gCAAE,CAAC,OAAO,CAAC,CAAC,QAAQ,CAAC,CAAC,QAAQ,IAAI,CAAC,aAAa,GAAG,CAAC,UAAU,IAAI,CAAC,iBAAE,CAAC,CAAC,eAAU,CAAC,QAAQ,IAAI,CAAC,IAAI,CAAC,QAAQ,IAAI,CAAC,YAAY,MAAM,CAAC,SAAS,QAAQ,CAAC,eAAe,SAAS,CAAC,YAAY,GAAG,CAAC,UAAU,GAAG,CAAC,WAAW,IAAI,CAAC,OAAO,CAAC,CAAC,OAAO,OAAO,CAAC,MAAM,AAAC,WAAW,KAAK,CAAC,CAAC,iBAAE,CAAC,CAAC,eAAU,CAAC,UAAU,IAAI,CAAC,QAAQ,CAAC,CAAC,IAAI,CAAC,CAAC,iBAAE,CAAC,gBAAC,OAAO,AAAiB,CAAC,QAAQ,EAAE,CAAC,MAAM,GAAG,CAAC,WAAW,IAAI,WAAW,CAAC,CAAC,OAAO,IAAI,CAAC,KAAK,CAAC,CAAC,SAAS,QAAQ,CAAC,UAAU,KAAK,MAAM,CAAC,CAAC,IAAI,CAAC,CAAC,OAAO,CAAC,CAAC,iBAAE,CAAC,gBAAC,MAAM,AAAgB,CAAC,OAAO,GAAG,CAAC,WAAW,GAAG,CAAC,QAAQ,EAAE,CAAC,MAAM,CAAC,CAAC,SAAS,QAAQ,CAAC,UAAU,WAAW,IAAI,CAAC,CAAC,WAAW,KAAK,CAAC,GAAG,CAAC,2BAA2B,aAAa,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,KAAK,GAAG,CAAC,WAAW,IAAI,CAAC,iBAAE,CAAC,gBAAC,MAAM,CAAC,iBAAE,CAAC,gBAAC,MAAM,AAAgC,CAAC,QAAQ,IAAI,CAAC,iBAAE,CAAC,gBAAC,MAAM,MAAM,CAAC,iBAAE,CAAC,gBAAC,MAAM,MAAM,AAA4C,CAAC,MAAM,KAAK,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,MAAM,AAAC,WAAW,KAAK,CAAC,CAAC,iBAAE,CAAC,gBAAC,MAAM,CAAC,iBAAE,CAAC,gBAAC,MAAM,AAAgC,CAAC,MAAM,KAAK,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,MAAM,AAAC,WAAW,MAAM,CAAC,CAAC,gCAAE,CAAC,WAAW,GAAG,CAAC,KAAK,CAAC,IAAI,WAAW,CAAC,CAAC,MAAM,IAAI,CAAC,gBAAgB,MAAM,CAAC,UAAU,MAAM,CAAC,CAAC"}`
};
const Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$2);
  return `


<ul class="${"svelte-158kai9"}"><a href="${"/products"}" class="${"svelte-158kai9"}">Products</a>
  <a href="${"/sell"}" class="${"svelte-158kai9"}">Sell</a>
  <a href="${"/order"}" class="${"svelte-158kai9"}">Orders</a>
  <a href="${"/account"}" class="${"svelte-158kai9"}">Account</a>
  
  
</ul>`;
});
const Search = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div>Search</div>`;
});
var Header_svelte = ".bar.svelte-1ncpizr{border-bottom:10px solid var(--black,#000);display:grid;grid-template-columns:auto 1fr;justify-content:space-between;align-items:stretch}.logo.svelte-1ncpizr{font-size:4rem;margin-left:2rem;position:relative;z-index:2;transform:skew(-7deg);background:red;color:#fff;text-decoration:none;text-transform:uppercase;padding:.5rem 1rem}";
const css$1 = {
  code: ".bar.svelte-1ncpizr{border-bottom:10px solid var(--black,#000);display:grid;grid-template-columns:auto 1fr;justify-content:space-between;align-items:stretch}.logo.svelte-1ncpizr{font-size:4rem;margin-left:2rem;position:relative;z-index:2;transform:skew(-7deg);background:red;color:#fff;text-decoration:none;text-transform:uppercase;padding:.5rem 1rem}",
  map: '{"version":3,"file":"Header.svelte","sources":["Header.svelte"],"sourcesContent":["<script>\\n  import Nav from \\"$lib/components/Nav.svelte\\";\\n  import Search from \\"./Search.svelte\\";\\n</script>\\n\\n<header>\\n  <div class=\\"bar\\">\\n    <h1 class=\\"logo\\">\\n      <div href=\\"/\\">Sick fits</div>\\n    </h1>\\n    <Nav />\\n  </div>\\n  <Search />\\n</header>\\n\\n<!-- <Cart /> -->\\n<style lang=\\"scss\\">.bar{border-bottom:10px solid var(--black,#000);display:grid;grid-template-columns:auto 1fr;justify-content:space-between;align-items:stretch}.logo{font-size:4rem;margin-left:2rem;position:relative;z-index:2;transform:skew(-7deg);background:red;color:#fff;text-decoration:none;text-transform:uppercase;padding:.5rem 1rem}</style>\\n"],"names":[],"mappings":"AAgBmB,mBAAI,CAAC,cAAc,IAAI,CAAC,KAAK,CAAC,IAAI,OAAO,CAAC,IAAI,CAAC,CAAC,QAAQ,IAAI,CAAC,sBAAsB,IAAI,CAAC,GAAG,CAAC,gBAAgB,aAAa,CAAC,YAAY,OAAO,CAAC,oBAAK,CAAC,UAAU,IAAI,CAAC,YAAY,IAAI,CAAC,SAAS,QAAQ,CAAC,QAAQ,CAAC,CAAC,UAAU,KAAK,KAAK,CAAC,CAAC,WAAW,GAAG,CAAC,MAAM,IAAI,CAAC,gBAAgB,IAAI,CAAC,eAAe,SAAS,CAAC,QAAQ,KAAK,CAAC,IAAI,CAAC"}'
};
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$1);
  return `<header><div class="${"bar svelte-1ncpizr"}"><h1 class="${"logo svelte-1ncpizr"}"><div href="${"/"}">Sick fits</div></h1>
    ${validate_component(Nav, "Nav").$$render($$result, {}, {}, {})}</div>
  ${validate_component(Search, "Search").$$render($$result, {}, {}, {})}</header>

`;
});
var global = '@font-face{font-family:radnika_next;src:url(data:font/woff2;base64,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) format("woff2");font-weight:400;font-style:normal}:root{font-family:radnika_next,--apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif;--red:red;--black:#393939;--grey:#3a3a3a;--lightGray:#e1e1e1;--offwhite:#ededed;--maxWidth:1000px;--bs:0 12px 24px 0 rgba(0,0,0,0.09)}html{font-size:10px;box-sizing:border-box}*,:after,:before{box-sizing:inherit}body{font-family:radnika_next,--apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif;padding:0;margin:0;font-size:1.5rem;line-height:2}a{text-decoration:none;color:var(--black)}a:hover{text-decoration:underline}button{font-family:radnika_next,--apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif}';
var $layout_svelte = ".container.svelte-hpu3rp{max-width:var(--maxWidth);margin:0 auto;padding:2rem}";
const css = {
  code: ".container.svelte-hpu3rp{max-width:var(--maxWidth);margin:0 auto;padding:2rem}",
  map: '{"version":3,"file":"$layout.svelte","sources":["$layout.svelte"],"sourcesContent":["<script>\\n  import Header from \\"$lib/components/Header.svelte\\";\\n  import \\"../global.scss\\";\\n\\n  import { createClient, setClient } from \\"@urql/svelte\\";\\n\\n  const client = createClient({\\n    url: \\"http://localhost:3000/api/graphql\\",\\n  });\\n\\n  setClient(client);\\n</script>\\n\\n<main>\\n  <Header />\\n  <div class=\\"container\\">\\n    <slot />\\n  </div>\\n</main>\\n\\n<style lang=\\"scss\\">.container{max-width:var(--maxWidth);margin:0 auto;padding:2rem}</style>\\n"],"names":[],"mappings":"AAoBmB,wBAAU,CAAC,UAAU,IAAI,UAAU,CAAC,CAAC,OAAO,CAAC,CAAC,IAAI,CAAC,QAAQ,IAAI,CAAC"}'
};
const $layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const client = createClient({url: "http://localhost:3000/api/graphql"});
  setClient(client);
  $$result.css.add(css);
  return `<main>${validate_component(Header, "Header").$$render($$result, {}, {}, {})}
  <div class="${"container svelte-hpu3rp"}">${slots.default ? slots.default({}) : ``}</div>
</main>`;
});
var $layout$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  default: $layout
});
export {init, render};
