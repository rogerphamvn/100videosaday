// Generated from canonical Draft 2020-12 contracts by scripts/build-prompt-validators.mjs. Do not edit.
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/fast-deep-equal/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/ajv/dist/runtime/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports.default = equal;
  }
});

// node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/ajv-formats/dist/formats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports.fastFormats = {
      ...exports.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports.formatNames = Object.keys(exports.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date(str) {
      const matches = DATE.exec(str);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d2) {
      if (!(d1 && d2))
        return void 0;
      if (d1 > d2)
        return 1;
      if (d1 < d2)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time(str) {
        const matches = TIME.exec(str);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s2) {
      if (!(s1 && s2))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
      if (!(t1 && t2))
        return void 0;
      return t1 - t2;
    }
    function compareIsoTime(t1, t2) {
      if (!(t1 && t2))
        return void 0;
      const a1 = TIME.exec(t1);
      const a2 = TIME.exec(t2);
      if (!(a1 && a2))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t2 = a2[1] + a2[2] + a2[3];
      if (t1 > t2)
        return 1;
      if (t1 < t2)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time = getTime(strictTimeZone);
      return function date_time(str) {
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d2 = new Date(dt2).valueOf();
      if (!(d1 && d2))
        return void 0;
      return d1 - d2;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d2);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t2);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str) {
      return NOT_URI_FRAGMENT.test(str) && URI.test(str);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str) {
      BYTE.lastIndex = 0;
      return BYTE.test(str);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str) {
      if (Z_ANCHOR.test(str))
        return false;
      try {
        new RegExp(str);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// .verify-out/prompt-validators.cjs
var require_prompt_validators = __commonJS({
  ".verify-out/prompt-validators.cjs"(exports) {
    exports.validateMega = validate20;
    var schema31 = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://creative-hook-lab.invalid/schemas/mega-prompt.schema.json", "title": "Creative Hook Lab provider-neutral MEGA PROMPT", "type": "object", "additionalProperties": false, "required": ["schemaVersion", "promptId", "revision", "mediaType", "authorship", "provenance", "sourceEvidence", "approvedClaims", "productLock", "strategy", "taste", "output", "creative"], "properties": { "schemaVersion": { "const": "creative-hook-lab.mega-prompt/1.0.0" }, "promptId": { "type": "string", "pattern": "^mp_[a-z0-9][a-z0-9_-]{7,63}$" }, "revision": { "type": "integer", "minimum": 1 }, "mediaType": { "enum": ["image", "video"] }, "authorship": { "$ref": "#/$defs/authorship" }, "provenance": { "$ref": "#/$defs/provenance" }, "sourceEvidence": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/evidence" } }, "approvedClaims": { "type": "array", "items": { "$ref": "#/$defs/claim" } }, "productLock": { "$ref": "#/$defs/productLock" }, "strategy": { "$ref": "#/$defs/strategy" }, "taste": { "$ref": "#/$defs/taste" }, "output": { "$ref": "#/$defs/output" }, "creative": { "oneOf": [{ "$ref": "#/$defs/imageCreative" }, { "$ref": "#/$defs/videoCreative" }] } }, "allOf": [{ "if": { "properties": { "mediaType": { "const": "image" } } }, "then": { "properties": { "creative": { "$ref": "#/$defs/imageCreative" } } } }, { "if": { "properties": { "mediaType": { "const": "video" } } }, "then": { "properties": { "creative": { "$ref": "#/$defs/videoCreative" } } } }], "$defs": { "id": { "type": "string", "pattern": "^[a-z][a-z0-9_-]{2,63}$" }, "nonEmpty": { "type": "string", "minLength": 1, "maxLength": 2e3 }, "evidenceRefs": { "type": "array", "minItems": 1, "uniqueItems": true, "items": { "$ref": "#/$defs/id" } }, "hypothesis": { "type": "object", "additionalProperties": false, "required": ["statement", "status", "evidenceRefs"], "properties": { "statement": { "$ref": "#/$defs/nonEmpty" }, "status": { "enum": ["observed", "supported_hypothesis", "untested_hypothesis"] }, "evidenceRefs": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" } }, "testMethod": { "type": "string", "minLength": 1, "maxLength": 1e3 } } }, "authorship": { "type": "object", "additionalProperties": false, "required": ["modelFamily", "authoringMode", "authoredAt", "verificationStatus", "invocationRef"], "properties": { "modelFamily": { "enum": ["claude-opus-5.5", "gpt-6.1-sol"] }, "authoringMode": { "enum": ["model_authored", "model_authored_human_edited"] }, "authoredAt": { "type": "string", "format": "date-time" }, "verificationStatus": { "enum": ["actual_invocation_verified", "synthetic_fixture"] }, "invocationRef": { "type": "string", "minLength": 1, "maxLength": 200 }, "humanEditor": { "type": "string", "minLength": 1, "maxLength": 120 } } }, "provenance": { "type": "object", "additionalProperties": false, "required": ["projectId", "sourceSnapshotId", "compilerContract", "providerPayloadPolicy"], "properties": { "projectId": { "$ref": "#/$defs/id" }, "sourceSnapshotId": { "type": "string", "pattern": "^snap_[a-z0-9_-]{6,64}$" }, "compilerContract": { "const": "allowlisted-provider-adapter/v1" }, "providerPayloadPolicy": { "const": "compile_known_fields_only" }, "parentPromptId": { "type": "string", "pattern": "^mp_[a-z0-9][a-z0-9_-]{7,63}$" } } }, "evidence": { "type": "object", "additionalProperties": false, "required": ["evidenceId", "kind", "locator", "contentHash", "hashStatus", "productEvidence", "reviewStatus"], "properties": { "evidenceId": { "$ref": "#/$defs/id" }, "kind": { "enum": ["product_photo", "packaging_photo", "brand_asset", "specification", "approved_copy", "research_source", "trend_observation", "creative_reference", "app_screenshot"] }, "locator": { "type": "string", "minLength": 1, "maxLength": 2048 }, "contentHash": { "type": "string", "pattern": "^sha256:[a-f0-9]{64}$" }, "hashStatus": { "enum": ["verified_bytes", "illustrative_fixture"] }, "productEvidence": { "type": "boolean" }, "reviewStatus": { "enum": ["approved", "unverified", "rejected"] }, "note": { "type": "string", "maxLength": 500 } } }, "claim": { "type": "object", "additionalProperties": false, "required": ["claimId", "exactText", "status", "evidenceRefs"], "properties": { "claimId": { "$ref": "#/$defs/id" }, "exactText": { "type": "string", "minLength": 1, "maxLength": 500 }, "status": { "const": "approved" }, "evidenceRefs": { "$ref": "#/$defs/evidenceRefs" }, "allowedContexts": { "type": "array", "uniqueItems": true, "items": { "enum": ["hook", "body", "overlay", "endcard", "voiceover"] } } } }, "reference": { "type": "object", "additionalProperties": false, "required": ["referenceId", "evidenceRef", "role", "fidelity"], "properties": { "referenceId": { "$ref": "#/$defs/id" }, "evidenceRef": { "$ref": "#/$defs/id" }, "role": { "enum": ["product_identity", "packaging_identity", "logo_identity", "character_identity", "composition_inspiration", "lighting_inspiration", "motion_inspiration"] }, "fidelity": { "enum": ["exact", "high", "inspiration_only"] }, "usageNote": { "type": "string", "maxLength": 500 } } }, "productLock": { "type": "object", "additionalProperties": false, "required": ["syntheticDemo", "identity", "geometry", "packaging", "logo", "exactText", "references"], "properties": { "syntheticDemo": { "type": "boolean" }, "identity": { "type": "string", "minLength": 1, "maxLength": 500 }, "geometry": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "materials": { "type": "array", "items": { "$ref": "#/$defs/nonEmpty" } }, "packaging": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "logo": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "exactText": { "type": "array", "uniqueItems": true, "items": { "type": "string", "minLength": 1, "maxLength": 200 } }, "mutableAttributes": { "type": "array", "uniqueItems": true, "items": { "enum": ["background", "camera_angle", "lighting", "supporting_props", "human_context", "motion"] } }, "references": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/reference" } } } }, "strategy": { "type": "object", "additionalProperties": false, "required": ["objective", "audience", "motivator", "painPoint", "useCase", "hook"], "properties": { "objective": { "enum": ["stop_scroll", "click", "consideration", "conversion_test", "concept_replication"] }, "audience": { "$ref": "#/$defs/hypothesis" }, "motivator": { "$ref": "#/$defs/hypothesis" }, "painPoint": { "$ref": "#/$defs/hypothesis" }, "useCase": { "$ref": "#/$defs/hypothesis" }, "trend": { "$ref": "#/$defs/hypothesis" }, "hook": { "type": "object", "additionalProperties": false, "required": ["mechanism", "promise", "claimRefs"], "properties": { "mechanism": { "enum": ["pain_interrupt", "use_case_recognition", "demonstration", "contrast", "curiosity", "social_proof", "identity_signal"] }, "promise": { "$ref": "#/$defs/nonEmpty" }, "claimRefs": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" } } } } } }, "taste": { "type": "object", "additionalProperties": false, "required": ["direction", "mood", "palette", "lighting", "photography", "antiGenericRules"], "properties": { "direction": { "$ref": "#/$defs/nonEmpty" }, "mood": { "type": "array", "minItems": 1, "uniqueItems": true, "items": { "type": "string", "minLength": 1, "maxLength": 80 } }, "palette": { "type": "array", "minItems": 1, "uniqueItems": true, "items": { "type": "string", "pattern": "^#[A-Fa-f0-9]{6}$" } }, "lighting": { "$ref": "#/$defs/nonEmpty" }, "photography": { "$ref": "#/$defs/nonEmpty" }, "antiGenericRules": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } } } }, "safeZones": { "type": "object", "additionalProperties": false, "required": ["topPct", "rightPct", "bottomPct", "leftPct"], "properties": { "topPct": { "type": "number", "minimum": 0, "maximum": 40 }, "rightPct": { "type": "number", "minimum": 0, "maximum": 40 }, "bottomPct": { "type": "number", "minimum": 0, "maximum": 40 }, "leftPct": { "type": "number", "minimum": 0, "maximum": 40 } } }, "output": { "type": "object", "additionalProperties": false, "required": ["aspectRatio", "widthPx", "heightPx", "safeZones", "colorSpace"], "properties": { "aspectRatio": { "enum": ["1:1", "4:5", "9:16", "16:9"] }, "widthPx": { "type": "integer", "minimum": 256, "maximum": 8192 }, "heightPx": { "type": "integer", "minimum": 256, "maximum": 8192 }, "safeZones": { "$ref": "#/$defs/safeZones" }, "colorSpace": { "enum": ["sRGB", "Display-P3"] } } }, "textOverlay": { "type": "object", "additionalProperties": false, "required": ["exactText", "placement", "claimRef"], "properties": { "exactText": { "type": "string", "minLength": 1, "maxLength": 200 }, "placement": { "enum": ["top", "center", "bottom", "none"] }, "claimRef": { "$ref": "#/$defs/id" } } }, "imageCreative": { "type": "object", "additionalProperties": false, "required": ["kind", "scene", "composition", "camera", "subjectAction", "textOverlays"], "properties": { "kind": { "const": "image" }, "scene": { "$ref": "#/$defs/nonEmpty" }, "composition": { "$ref": "#/$defs/nonEmpty" }, "camera": { "$ref": "#/$defs/nonEmpty" }, "subjectAction": { "$ref": "#/$defs/nonEmpty" }, "supportingProps": { "type": "array", "items": { "$ref": "#/$defs/nonEmpty" } }, "textOverlays": { "type": "array", "items": { "$ref": "#/$defs/textOverlay" } } } }, "audioCue": { "type": "object", "additionalProperties": false, "required": ["type", "description", "sourcePolicy"], "properties": { "type": { "enum": ["dialogue", "voiceover", "music", "sfx", "ambience", "silence"] }, "description": { "$ref": "#/$defs/nonEmpty" }, "sourcePolicy": { "enum": ["visible_diegetic", "implied_diegetic", "approved_nondiegetic", "intentional_silence"] }, "claimRef": { "$ref": "#/$defs/id" } } }, "shot": { "type": "object", "additionalProperties": false, "required": ["shotId", "startS", "endS", "visual", "camera", "action", "continuity", "audio"], "properties": { "shotId": { "$ref": "#/$defs/id" }, "startS": { "type": "number", "minimum": 0 }, "endS": { "type": "number", "exclusiveMinimum": 0 }, "visual": { "$ref": "#/$defs/nonEmpty" }, "camera": { "$ref": "#/$defs/nonEmpty" }, "action": { "$ref": "#/$defs/nonEmpty" }, "continuity": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "audio": { "type": "array", "items": { "$ref": "#/$defs/audioCue" } }, "textOverlays": { "type": "array", "items": { "$ref": "#/$defs/textOverlay" } } } }, "videoCreative": { "type": "object", "additionalProperties": false, "required": ["kind", "durationS", "fps", "continuityRules", "audioPolicy", "shots"], "properties": { "kind": { "const": "video" }, "durationS": { "type": "number", "exclusiveMinimum": 0, "maximum": 180 }, "fps": { "enum": [24, 25, 30, 50, 60] }, "continuityRules": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "audioPolicy": { "type": "object", "additionalProperties": false, "required": ["allowInventedVoiceover", "musicVocals", "physicalSourceRequiredForDiegetic"], "properties": { "allowInventedVoiceover": { "const": false }, "musicVocals": { "enum": ["none", "approved_lyrics_only"] }, "physicalSourceRequiredForDiegetic": { "const": true } } }, "shots": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/shot" } } } } } };
    var schema51 = { "type": "object", "additionalProperties": false, "required": ["modelFamily", "authoringMode", "authoredAt", "verificationStatus", "invocationRef"], "properties": { "modelFamily": { "enum": ["claude-opus-5.5", "gpt-6.1-sol"] }, "authoringMode": { "enum": ["model_authored", "model_authored_human_edited"] }, "authoredAt": { "type": "string", "format": "date-time" }, "verificationStatus": { "enum": ["actual_invocation_verified", "synthetic_fixture"] }, "invocationRef": { "type": "string", "minLength": 1, "maxLength": 200 }, "humanEditor": { "type": "string", "minLength": 1, "maxLength": 120 } } };
    var func1 = require_ucs2length().default;
    var schema38 = { "type": "object", "additionalProperties": false, "required": ["exactText", "placement", "claimRef"], "properties": { "exactText": { "type": "string", "minLength": 1, "maxLength": 200 }, "placement": { "enum": ["top", "center", "bottom", "none"] }, "claimRef": { "$ref": "#/$defs/id" } } };
    var pattern4 = new RegExp("^[a-z][a-z0-9_-]{2,63}$", "u");
    function validate22(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate22.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.exactText === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "exactText" }, message: "must have required property 'exactText'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.placement === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "placement" }, message: "must have required property 'placement'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.claimRef === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "claimRef" }, message: "must have required property 'claimRef'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "exactText" || key0 === "placement" || key0 === "claimRef")) {
            const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        }
        if (data.exactText !== void 0) {
          let data0 = data.exactText;
          if (typeof data0 === "string") {
            if (func1(data0) > 200) {
              const err4 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/maxLength", keyword: "maxLength", params: { limit: 200 }, message: "must NOT have more than 200 characters" };
              if (vErrors === null) {
                vErrors = [err4];
              } else {
                vErrors.push(err4);
              }
              errors++;
            }
            if (func1(data0) < 1) {
              const err5 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.placement !== void 0) {
          let data1 = data.placement;
          if (!(data1 === "top" || data1 === "center" || data1 === "bottom" || data1 === "none")) {
            const err7 = { instancePath: instancePath + "/placement", schemaPath: "#/properties/placement/enum", keyword: "enum", params: { allowedValues: schema38.properties.placement.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.claimRef !== void 0) {
          let data2 = data.claimRef;
          if (typeof data2 === "string") {
            if (!pattern4.test(data2)) {
              const err8 = { instancePath: instancePath + "/claimRef", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
          } else {
            const err9 = { instancePath: instancePath + "/claimRef", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
      } else {
        const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      validate22.errors = vErrors;
      return errors === 0;
    }
    validate22.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    function validate21(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate21.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.kind === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.scene === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "scene" }, message: "must have required property 'scene'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.composition === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "composition" }, message: "must have required property 'composition'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.camera === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "camera" }, message: "must have required property 'camera'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.subjectAction === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "subjectAction" }, message: "must have required property 'subjectAction'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.textOverlays === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "textOverlays" }, message: "must have required property 'textOverlays'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "kind" || key0 === "scene" || key0 === "composition" || key0 === "camera" || key0 === "subjectAction" || key0 === "supportingProps" || key0 === "textOverlays")) {
            const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.kind !== void 0) {
          if ("image" !== data.kind) {
            const err7 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/const", keyword: "const", params: { allowedValue: "image" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.scene !== void 0) {
          let data1 = data.scene;
          if (typeof data1 === "string") {
            if (func1(data1) > 2e3) {
              const err8 = { instancePath: instancePath + "/scene", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (func1(data1) < 1) {
              const err9 = { instancePath: instancePath + "/scene", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          } else {
            const err10 = { instancePath: instancePath + "/scene", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.composition !== void 0) {
          let data2 = data.composition;
          if (typeof data2 === "string") {
            if (func1(data2) > 2e3) {
              const err11 = { instancePath: instancePath + "/composition", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (func1(data2) < 1) {
              const err12 = { instancePath: instancePath + "/composition", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
          } else {
            const err13 = { instancePath: instancePath + "/composition", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data.camera !== void 0) {
          let data3 = data.camera;
          if (typeof data3 === "string") {
            if (func1(data3) > 2e3) {
              const err14 = { instancePath: instancePath + "/camera", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            if (func1(data3) < 1) {
              const err15 = { instancePath: instancePath + "/camera", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
          } else {
            const err16 = { instancePath: instancePath + "/camera", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        if (data.subjectAction !== void 0) {
          let data4 = data.subjectAction;
          if (typeof data4 === "string") {
            if (func1(data4) > 2e3) {
              const err17 = { instancePath: instancePath + "/subjectAction", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            if (func1(data4) < 1) {
              const err18 = { instancePath: instancePath + "/subjectAction", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
          } else {
            const err19 = { instancePath: instancePath + "/subjectAction", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
        if (data.supportingProps !== void 0) {
          let data5 = data.supportingProps;
          if (Array.isArray(data5)) {
            const len0 = data5.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data6 = data5[i0];
              if (typeof data6 === "string") {
                if (func1(data6) > 2e3) {
                  const err20 = { instancePath: instancePath + "/supportingProps/" + i0, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err20];
                  } else {
                    vErrors.push(err20);
                  }
                  errors++;
                }
                if (func1(data6) < 1) {
                  const err21 = { instancePath: instancePath + "/supportingProps/" + i0, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err21];
                  } else {
                    vErrors.push(err21);
                  }
                  errors++;
                }
              } else {
                const err22 = { instancePath: instancePath + "/supportingProps/" + i0, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err22];
                } else {
                  vErrors.push(err22);
                }
                errors++;
              }
            }
          } else {
            const err23 = { instancePath: instancePath + "/supportingProps", schemaPath: "#/properties/supportingProps/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
        }
        if (data.textOverlays !== void 0) {
          let data7 = data.textOverlays;
          if (Array.isArray(data7)) {
            const len1 = data7.length;
            for (let i1 = 0; i1 < len1; i1++) {
              if (!validate22(data7[i1], { instancePath: instancePath + "/textOverlays/" + i1, parentData: data7, parentDataProperty: i1, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err24 = { instancePath: instancePath + "/textOverlays", schemaPath: "#/properties/textOverlays/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err24];
            } else {
              vErrors.push(err24);
            }
            errors++;
          }
        }
      } else {
        const err25 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
      validate21.errors = vErrors;
      return errors === 0;
    }
    validate21.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var schema40 = { "type": "object", "additionalProperties": false, "required": ["kind", "durationS", "fps", "continuityRules", "audioPolicy", "shots"], "properties": { "kind": { "const": "video" }, "durationS": { "type": "number", "exclusiveMinimum": 0, "maximum": 180 }, "fps": { "enum": [24, 25, 30, 50, 60] }, "continuityRules": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "audioPolicy": { "type": "object", "additionalProperties": false, "required": ["allowInventedVoiceover", "musicVocals", "physicalSourceRequiredForDiegetic"], "properties": { "allowInventedVoiceover": { "const": false }, "musicVocals": { "enum": ["none", "approved_lyrics_only"] }, "physicalSourceRequiredForDiegetic": { "const": true } } }, "shots": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/shot" } } } };
    var schema42 = { "type": "object", "additionalProperties": false, "required": ["shotId", "startS", "endS", "visual", "camera", "action", "continuity", "audio"], "properties": { "shotId": { "$ref": "#/$defs/id" }, "startS": { "type": "number", "minimum": 0 }, "endS": { "type": "number", "exclusiveMinimum": 0 }, "visual": { "$ref": "#/$defs/nonEmpty" }, "camera": { "$ref": "#/$defs/nonEmpty" }, "action": { "$ref": "#/$defs/nonEmpty" }, "continuity": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "audio": { "type": "array", "items": { "$ref": "#/$defs/audioCue" } }, "textOverlays": { "type": "array", "items": { "$ref": "#/$defs/textOverlay" } } } };
    var func15 = Object.prototype.hasOwnProperty;
    var schema48 = { "type": "object", "additionalProperties": false, "required": ["type", "description", "sourcePolicy"], "properties": { "type": { "enum": ["dialogue", "voiceover", "music", "sfx", "ambience", "silence"] }, "description": { "$ref": "#/$defs/nonEmpty" }, "sourcePolicy": { "enum": ["visible_diegetic", "implied_diegetic", "approved_nondiegetic", "intentional_silence"] }, "claimRef": { "$ref": "#/$defs/id" } } };
    function validate27(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate27.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.type === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.description === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.sourcePolicy === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "sourcePolicy" }, message: "must have required property 'sourcePolicy'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "type" || key0 === "description" || key0 === "sourcePolicy" || key0 === "claimRef")) {
            const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        }
        if (data.type !== void 0) {
          let data0 = data.type;
          if (!(data0 === "dialogue" || data0 === "voiceover" || data0 === "music" || data0 === "sfx" || data0 === "ambience" || data0 === "silence")) {
            const err4 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/enum", keyword: "enum", params: { allowedValues: schema48.properties.type.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
        }
        if (data.description !== void 0) {
          let data1 = data.description;
          if (typeof data1 === "string") {
            if (func1(data1) > 2e3) {
              const err5 = { instancePath: instancePath + "/description", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
            if (func1(data1) < 1) {
              const err6 = { instancePath: instancePath + "/description", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err6];
              } else {
                vErrors.push(err6);
              }
              errors++;
            }
          } else {
            const err7 = { instancePath: instancePath + "/description", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.sourcePolicy !== void 0) {
          let data2 = data.sourcePolicy;
          if (!(data2 === "visible_diegetic" || data2 === "implied_diegetic" || data2 === "approved_nondiegetic" || data2 === "intentional_silence")) {
            const err8 = { instancePath: instancePath + "/sourcePolicy", schemaPath: "#/properties/sourcePolicy/enum", keyword: "enum", params: { allowedValues: schema48.properties.sourcePolicy.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
        if (data.claimRef !== void 0) {
          let data3 = data.claimRef;
          if (typeof data3 === "string") {
            if (!pattern4.test(data3)) {
              const err9 = { instancePath: instancePath + "/claimRef", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          } else {
            const err10 = { instancePath: instancePath + "/claimRef", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
      } else {
        const err11 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      validate27.errors = vErrors;
      return errors === 0;
    }
    validate27.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    function validate26(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate26.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.shotId === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "shotId" }, message: "must have required property 'shotId'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.startS === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "startS" }, message: "must have required property 'startS'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.endS === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "endS" }, message: "must have required property 'endS'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.visual === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "visual" }, message: "must have required property 'visual'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.camera === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "camera" }, message: "must have required property 'camera'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.action === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "action" }, message: "must have required property 'action'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        if (data.continuity === void 0) {
          const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "continuity" }, message: "must have required property 'continuity'" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
        if (data.audio === void 0) {
          const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "audio" }, message: "must have required property 'audio'" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!func15.call(schema42.properties, key0)) {
            const err8 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
        if (data.shotId !== void 0) {
          let data0 = data.shotId;
          if (typeof data0 === "string") {
            if (!pattern4.test(data0)) {
              const err9 = { instancePath: instancePath + "/shotId", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          } else {
            const err10 = { instancePath: instancePath + "/shotId", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.startS !== void 0) {
          let data1 = data.startS;
          if (typeof data1 == "number") {
            if (data1 < 0 || isNaN(data1)) {
              const err11 = { instancePath: instancePath + "/startS", schemaPath: "#/properties/startS/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          } else {
            const err12 = { instancePath: instancePath + "/startS", schemaPath: "#/properties/startS/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data.endS !== void 0) {
          let data2 = data.endS;
          if (typeof data2 == "number") {
            if (data2 <= 0 || isNaN(data2)) {
              const err13 = { instancePath: instancePath + "/endS", schemaPath: "#/properties/endS/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
          } else {
            const err14 = { instancePath: instancePath + "/endS", schemaPath: "#/properties/endS/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
        if (data.visual !== void 0) {
          let data3 = data.visual;
          if (typeof data3 === "string") {
            if (func1(data3) > 2e3) {
              const err15 = { instancePath: instancePath + "/visual", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (func1(data3) < 1) {
              const err16 = { instancePath: instancePath + "/visual", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
          } else {
            const err17 = { instancePath: instancePath + "/visual", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
        if (data.camera !== void 0) {
          let data4 = data.camera;
          if (typeof data4 === "string") {
            if (func1(data4) > 2e3) {
              const err18 = { instancePath: instancePath + "/camera", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
            if (func1(data4) < 1) {
              const err19 = { instancePath: instancePath + "/camera", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
          } else {
            const err20 = { instancePath: instancePath + "/camera", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data.action !== void 0) {
          let data5 = data.action;
          if (typeof data5 === "string") {
            if (func1(data5) > 2e3) {
              const err21 = { instancePath: instancePath + "/action", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            if (func1(data5) < 1) {
              const err22 = { instancePath: instancePath + "/action", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
          } else {
            const err23 = { instancePath: instancePath + "/action", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
        }
        if (data.continuity !== void 0) {
          let data6 = data.continuity;
          if (Array.isArray(data6)) {
            if (data6.length < 1) {
              const err24 = { instancePath: instancePath + "/continuity", schemaPath: "#/properties/continuity/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            const len0 = data6.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data7 = data6[i0];
              if (typeof data7 === "string") {
                if (func1(data7) > 2e3) {
                  const err25 = { instancePath: instancePath + "/continuity/" + i0, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err25];
                  } else {
                    vErrors.push(err25);
                  }
                  errors++;
                }
                if (func1(data7) < 1) {
                  const err26 = { instancePath: instancePath + "/continuity/" + i0, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err26];
                  } else {
                    vErrors.push(err26);
                  }
                  errors++;
                }
              } else {
                const err27 = { instancePath: instancePath + "/continuity/" + i0, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
          } else {
            const err28 = { instancePath: instancePath + "/continuity", schemaPath: "#/properties/continuity/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err28];
            } else {
              vErrors.push(err28);
            }
            errors++;
          }
        }
        if (data.audio !== void 0) {
          let data8 = data.audio;
          if (Array.isArray(data8)) {
            const len1 = data8.length;
            for (let i1 = 0; i1 < len1; i1++) {
              if (!validate27(data8[i1], { instancePath: instancePath + "/audio/" + i1, parentData: data8, parentDataProperty: i1, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err29 = { instancePath: instancePath + "/audio", schemaPath: "#/properties/audio/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err29];
            } else {
              vErrors.push(err29);
            }
            errors++;
          }
        }
        if (data.textOverlays !== void 0) {
          let data10 = data.textOverlays;
          if (Array.isArray(data10)) {
            const len2 = data10.length;
            for (let i2 = 0; i2 < len2; i2++) {
              if (!validate22(data10[i2], { instancePath: instancePath + "/textOverlays/" + i2, parentData: data10, parentDataProperty: i2, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err30 = { instancePath: instancePath + "/textOverlays", schemaPath: "#/properties/textOverlays/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
      } else {
        const err31 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
      validate26.errors = vErrors;
      return errors === 0;
    }
    validate26.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    function validate25(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate25.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.kind === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.durationS === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "durationS" }, message: "must have required property 'durationS'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.fps === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "fps" }, message: "must have required property 'fps'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.continuityRules === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "continuityRules" }, message: "must have required property 'continuityRules'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.audioPolicy === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "audioPolicy" }, message: "must have required property 'audioPolicy'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.shots === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "shots" }, message: "must have required property 'shots'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "kind" || key0 === "durationS" || key0 === "fps" || key0 === "continuityRules" || key0 === "audioPolicy" || key0 === "shots")) {
            const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.kind !== void 0) {
          if ("video" !== data.kind) {
            const err7 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/const", keyword: "const", params: { allowedValue: "video" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.durationS !== void 0) {
          let data1 = data.durationS;
          if (typeof data1 == "number") {
            if (data1 > 180 || isNaN(data1)) {
              const err8 = { instancePath: instancePath + "/durationS", schemaPath: "#/properties/durationS/maximum", keyword: "maximum", params: { comparison: "<=", limit: 180 }, message: "must be <= 180" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (data1 <= 0 || isNaN(data1)) {
              const err9 = { instancePath: instancePath + "/durationS", schemaPath: "#/properties/durationS/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          } else {
            const err10 = { instancePath: instancePath + "/durationS", schemaPath: "#/properties/durationS/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.fps !== void 0) {
          let data2 = data.fps;
          if (!(data2 === 24 || data2 === 25 || data2 === 30 || data2 === 50 || data2 === 60)) {
            const err11 = { instancePath: instancePath + "/fps", schemaPath: "#/properties/fps/enum", keyword: "enum", params: { allowedValues: schema40.properties.fps.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data.continuityRules !== void 0) {
          let data3 = data.continuityRules;
          if (Array.isArray(data3)) {
            if (data3.length < 1) {
              const err12 = { instancePath: instancePath + "/continuityRules", schemaPath: "#/properties/continuityRules/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            const len0 = data3.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data4 = data3[i0];
              if (typeof data4 === "string") {
                if (func1(data4) > 2e3) {
                  const err13 = { instancePath: instancePath + "/continuityRules/" + i0, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err13];
                  } else {
                    vErrors.push(err13);
                  }
                  errors++;
                }
                if (func1(data4) < 1) {
                  const err14 = { instancePath: instancePath + "/continuityRules/" + i0, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err14];
                  } else {
                    vErrors.push(err14);
                  }
                  errors++;
                }
              } else {
                const err15 = { instancePath: instancePath + "/continuityRules/" + i0, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
          } else {
            const err16 = { instancePath: instancePath + "/continuityRules", schemaPath: "#/properties/continuityRules/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        if (data.audioPolicy !== void 0) {
          let data5 = data.audioPolicy;
          if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
            if (data5.allowInventedVoiceover === void 0) {
              const err17 = { instancePath: instancePath + "/audioPolicy", schemaPath: "#/properties/audioPolicy/required", keyword: "required", params: { missingProperty: "allowInventedVoiceover" }, message: "must have required property 'allowInventedVoiceover'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            if (data5.musicVocals === void 0) {
              const err18 = { instancePath: instancePath + "/audioPolicy", schemaPath: "#/properties/audioPolicy/required", keyword: "required", params: { missingProperty: "musicVocals" }, message: "must have required property 'musicVocals'" };
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
            if (data5.physicalSourceRequiredForDiegetic === void 0) {
              const err19 = { instancePath: instancePath + "/audioPolicy", schemaPath: "#/properties/audioPolicy/required", keyword: "required", params: { missingProperty: "physicalSourceRequiredForDiegetic" }, message: "must have required property 'physicalSourceRequiredForDiegetic'" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
            for (const key1 in data5) {
              if (!(key1 === "allowInventedVoiceover" || key1 === "musicVocals" || key1 === "physicalSourceRequiredForDiegetic")) {
                const err20 = { instancePath: instancePath + "/audioPolicy", schemaPath: "#/properties/audioPolicy/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data5.allowInventedVoiceover !== void 0) {
              if (false !== data5.allowInventedVoiceover) {
                const err21 = { instancePath: instancePath + "/audioPolicy/allowInventedVoiceover", schemaPath: "#/properties/audioPolicy/properties/allowInventedVoiceover/const", keyword: "const", params: { allowedValue: false }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
            if (data5.musicVocals !== void 0) {
              let data7 = data5.musicVocals;
              if (!(data7 === "none" || data7 === "approved_lyrics_only")) {
                const err22 = { instancePath: instancePath + "/audioPolicy/musicVocals", schemaPath: "#/properties/audioPolicy/properties/musicVocals/enum", keyword: "enum", params: { allowedValues: schema40.properties.audioPolicy.properties.musicVocals.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err22];
                } else {
                  vErrors.push(err22);
                }
                errors++;
              }
            }
            if (data5.physicalSourceRequiredForDiegetic !== void 0) {
              if (true !== data5.physicalSourceRequiredForDiegetic) {
                const err23 = { instancePath: instancePath + "/audioPolicy/physicalSourceRequiredForDiegetic", schemaPath: "#/properties/audioPolicy/properties/physicalSourceRequiredForDiegetic/const", keyword: "const", params: { allowedValue: true }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
          } else {
            const err24 = { instancePath: instancePath + "/audioPolicy", schemaPath: "#/properties/audioPolicy/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err24];
            } else {
              vErrors.push(err24);
            }
            errors++;
          }
        }
        if (data.shots !== void 0) {
          let data9 = data.shots;
          if (Array.isArray(data9)) {
            if (data9.length < 1) {
              const err25 = { instancePath: instancePath + "/shots", schemaPath: "#/properties/shots/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            const len1 = data9.length;
            for (let i1 = 0; i1 < len1; i1++) {
              if (!validate26(data9[i1], { instancePath: instancePath + "/shots/" + i1, parentData: data9, parentDataProperty: i1, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err26 = { instancePath: instancePath + "/shots", schemaPath: "#/properties/shots/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err26];
            } else {
              vErrors.push(err26);
            }
            errors++;
          }
        }
      } else {
        const err27 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
      validate25.errors = vErrors;
      return errors === 0;
    }
    validate25.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var pattern9 = new RegExp("^snap_[a-z0-9_-]{6,64}$", "u");
    var pattern7 = new RegExp("^mp_[a-z0-9][a-z0-9_-]{7,63}$", "u");
    function validate32(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate32.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.projectId === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "projectId" }, message: "must have required property 'projectId'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.sourceSnapshotId === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "sourceSnapshotId" }, message: "must have required property 'sourceSnapshotId'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.compilerContract === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "compilerContract" }, message: "must have required property 'compilerContract'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.providerPayloadPolicy === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "providerPayloadPolicy" }, message: "must have required property 'providerPayloadPolicy'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "projectId" || key0 === "sourceSnapshotId" || key0 === "compilerContract" || key0 === "providerPayloadPolicy" || key0 === "parentPromptId")) {
            const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
        }
        if (data.projectId !== void 0) {
          let data0 = data.projectId;
          if (typeof data0 === "string") {
            if (!pattern4.test(data0)) {
              const err5 = { instancePath: instancePath + "/projectId", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/projectId", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.sourceSnapshotId !== void 0) {
          let data1 = data.sourceSnapshotId;
          if (typeof data1 === "string") {
            if (!pattern9.test(data1)) {
              const err7 = { instancePath: instancePath + "/sourceSnapshotId", schemaPath: "#/properties/sourceSnapshotId/pattern", keyword: "pattern", params: { pattern: "^snap_[a-z0-9_-]{6,64}$" }, message: 'must match pattern "^snap_[a-z0-9_-]{6,64}$"' };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
          } else {
            const err8 = { instancePath: instancePath + "/sourceSnapshotId", schemaPath: "#/properties/sourceSnapshotId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
        if (data.compilerContract !== void 0) {
          if ("allowlisted-provider-adapter/v1" !== data.compilerContract) {
            const err9 = { instancePath: instancePath + "/compilerContract", schemaPath: "#/properties/compilerContract/const", keyword: "const", params: { allowedValue: "allowlisted-provider-adapter/v1" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        if (data.providerPayloadPolicy !== void 0) {
          if ("compile_known_fields_only" !== data.providerPayloadPolicy) {
            const err10 = { instancePath: instancePath + "/providerPayloadPolicy", schemaPath: "#/properties/providerPayloadPolicy/const", keyword: "const", params: { allowedValue: "compile_known_fields_only" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.parentPromptId !== void 0) {
          let data4 = data.parentPromptId;
          if (typeof data4 === "string") {
            if (!pattern7.test(data4)) {
              const err11 = { instancePath: instancePath + "/parentPromptId", schemaPath: "#/properties/parentPromptId/pattern", keyword: "pattern", params: { pattern: "^mp_[a-z0-9][a-z0-9_-]{7,63}$" }, message: 'must match pattern "^mp_[a-z0-9][a-z0-9_-]{7,63}$"' };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          } else {
            const err12 = { instancePath: instancePath + "/parentPromptId", schemaPath: "#/properties/parentPromptId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
      } else {
        const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      validate32.errors = vErrors;
      return errors === 0;
    }
    validate32.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var schema54 = { "type": "object", "additionalProperties": false, "required": ["evidenceId", "kind", "locator", "contentHash", "hashStatus", "productEvidence", "reviewStatus"], "properties": { "evidenceId": { "$ref": "#/$defs/id" }, "kind": { "enum": ["product_photo", "packaging_photo", "brand_asset", "specification", "approved_copy", "research_source", "trend_observation", "creative_reference", "app_screenshot"] }, "locator": { "type": "string", "minLength": 1, "maxLength": 2048 }, "contentHash": { "type": "string", "pattern": "^sha256:[a-f0-9]{64}$" }, "hashStatus": { "enum": ["verified_bytes", "illustrative_fixture"] }, "productEvidence": { "type": "boolean" }, "reviewStatus": { "enum": ["approved", "unverified", "rejected"] }, "note": { "type": "string", "maxLength": 500 } } };
    var pattern12 = new RegExp("^sha256:[a-f0-9]{64}$", "u");
    function validate34(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate34.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.evidenceId === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidenceId" }, message: "must have required property 'evidenceId'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.kind === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.locator === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "locator" }, message: "must have required property 'locator'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.contentHash === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "contentHash" }, message: "must have required property 'contentHash'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.hashStatus === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "hashStatus" }, message: "must have required property 'hashStatus'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.productEvidence === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "productEvidence" }, message: "must have required property 'productEvidence'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        if (data.reviewStatus === void 0) {
          const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "reviewStatus" }, message: "must have required property 'reviewStatus'" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "evidenceId" || key0 === "kind" || key0 === "locator" || key0 === "contentHash" || key0 === "hashStatus" || key0 === "productEvidence" || key0 === "reviewStatus" || key0 === "note")) {
            const err7 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.evidenceId !== void 0) {
          let data0 = data.evidenceId;
          if (typeof data0 === "string") {
            if (!pattern4.test(data0)) {
              const err8 = { instancePath: instancePath + "/evidenceId", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
          } else {
            const err9 = { instancePath: instancePath + "/evidenceId", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        if (data.kind !== void 0) {
          let data1 = data.kind;
          if (!(data1 === "product_photo" || data1 === "packaging_photo" || data1 === "brand_asset" || data1 === "specification" || data1 === "approved_copy" || data1 === "research_source" || data1 === "trend_observation" || data1 === "creative_reference" || data1 === "app_screenshot")) {
            const err10 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/enum", keyword: "enum", params: { allowedValues: schema54.properties.kind.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.locator !== void 0) {
          let data2 = data.locator;
          if (typeof data2 === "string") {
            if (func1(data2) > 2048) {
              const err11 = { instancePath: instancePath + "/locator", schemaPath: "#/properties/locator/maxLength", keyword: "maxLength", params: { limit: 2048 }, message: "must NOT have more than 2048 characters" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (func1(data2) < 1) {
              const err12 = { instancePath: instancePath + "/locator", schemaPath: "#/properties/locator/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
          } else {
            const err13 = { instancePath: instancePath + "/locator", schemaPath: "#/properties/locator/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data.contentHash !== void 0) {
          let data3 = data.contentHash;
          if (typeof data3 === "string") {
            if (!pattern12.test(data3)) {
              const err14 = { instancePath: instancePath + "/contentHash", schemaPath: "#/properties/contentHash/pattern", keyword: "pattern", params: { pattern: "^sha256:[a-f0-9]{64}$" }, message: 'must match pattern "^sha256:[a-f0-9]{64}$"' };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
          } else {
            const err15 = { instancePath: instancePath + "/contentHash", schemaPath: "#/properties/contentHash/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data.hashStatus !== void 0) {
          let data4 = data.hashStatus;
          if (!(data4 === "verified_bytes" || data4 === "illustrative_fixture")) {
            const err16 = { instancePath: instancePath + "/hashStatus", schemaPath: "#/properties/hashStatus/enum", keyword: "enum", params: { allowedValues: schema54.properties.hashStatus.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        if (data.productEvidence !== void 0) {
          if (typeof data.productEvidence !== "boolean") {
            const err17 = { instancePath: instancePath + "/productEvidence", schemaPath: "#/properties/productEvidence/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
        if (data.reviewStatus !== void 0) {
          let data6 = data.reviewStatus;
          if (!(data6 === "approved" || data6 === "unverified" || data6 === "rejected")) {
            const err18 = { instancePath: instancePath + "/reviewStatus", schemaPath: "#/properties/reviewStatus/enum", keyword: "enum", params: { allowedValues: schema54.properties.reviewStatus.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
        if (data.note !== void 0) {
          let data7 = data.note;
          if (typeof data7 === "string") {
            if (func1(data7) > 500) {
              const err19 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/maxLength", keyword: "maxLength", params: { limit: 500 }, message: "must NOT have more than 500 characters" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
          } else {
            const err20 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
      } else {
        const err21 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
      validate34.errors = vErrors;
      return errors === 0;
    }
    validate34.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var schema56 = { "type": "object", "additionalProperties": false, "required": ["claimId", "exactText", "status", "evidenceRefs"], "properties": { "claimId": { "$ref": "#/$defs/id" }, "exactText": { "type": "string", "minLength": 1, "maxLength": 500 }, "status": { "const": "approved" }, "evidenceRefs": { "$ref": "#/$defs/evidenceRefs" }, "allowedContexts": { "type": "array", "uniqueItems": true, "items": { "enum": ["hook", "body", "overlay", "endcard", "voiceover"] } } } };
    var func0 = require_equal().default;
    function validate37(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate37.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (Array.isArray(data)) {
        if (data.length < 1) {
          const err0 = { instancePath, schemaPath: "#/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        const len0 = data.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data0 = data[i0];
          if (typeof data0 === "string") {
            if (!pattern4.test(data0)) {
              const err1 = { instancePath: instancePath + "/" + i0, schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err1];
              } else {
                vErrors.push(err1);
              }
              errors++;
            }
          } else {
            const err2 = { instancePath: instancePath + "/" + i0, schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          }
        }
        let i1 = data.length;
        let j0;
        if (i1 > 1) {
          outer0: for (; i1--; ) {
            for (j0 = i1; j0--; ) {
              if (func0(data[i1], data[j0])) {
                const err3 = { instancePath, schemaPath: "#/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                if (vErrors === null) {
                  vErrors = [err3];
                } else {
                  vErrors.push(err3);
                }
                errors++;
                break outer0;
              }
            }
          }
        }
      } else {
        const err4 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
      validate37.errors = vErrors;
      return errors === 0;
    }
    validate37.evaluated = { "items": true, "dynamicProps": false, "dynamicItems": false };
    function validate36(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate36.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.claimId === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "claimId" }, message: "must have required property 'claimId'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.exactText === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "exactText" }, message: "must have required property 'exactText'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.status === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.evidenceRefs === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidenceRefs" }, message: "must have required property 'evidenceRefs'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "claimId" || key0 === "exactText" || key0 === "status" || key0 === "evidenceRefs" || key0 === "allowedContexts")) {
            const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
        }
        if (data.claimId !== void 0) {
          let data0 = data.claimId;
          if (typeof data0 === "string") {
            if (!pattern4.test(data0)) {
              const err5 = { instancePath: instancePath + "/claimId", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/claimId", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.exactText !== void 0) {
          let data1 = data.exactText;
          if (typeof data1 === "string") {
            if (func1(data1) > 500) {
              const err7 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/maxLength", keyword: "maxLength", params: { limit: 500 }, message: "must NOT have more than 500 characters" };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
            if (func1(data1) < 1) {
              const err8 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
          } else {
            const err9 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        if (data.status !== void 0) {
          if ("approved" !== data.status) {
            const err10 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/const", keyword: "const", params: { allowedValue: "approved" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.evidenceRefs !== void 0) {
          if (!validate37(data.evidenceRefs, { instancePath: instancePath + "/evidenceRefs", parentData: data, parentDataProperty: "evidenceRefs", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate37.errors : vErrors.concat(validate37.errors);
            errors = vErrors.length;
          }
        }
        if (data.allowedContexts !== void 0) {
          let data4 = data.allowedContexts;
          if (Array.isArray(data4)) {
            const len0 = data4.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data5 = data4[i0];
              if (!(data5 === "hook" || data5 === "body" || data5 === "overlay" || data5 === "endcard" || data5 === "voiceover")) {
                const err11 = { instancePath: instancePath + "/allowedContexts/" + i0, schemaPath: "#/properties/allowedContexts/items/enum", keyword: "enum", params: { allowedValues: schema56.properties.allowedContexts.items.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err11];
                } else {
                  vErrors.push(err11);
                }
                errors++;
              }
            }
            let i1 = data4.length;
            let j0;
            if (i1 > 1) {
              outer0: for (; i1--; ) {
                for (j0 = i1; j0--; ) {
                  if (func0(data4[i1], data4[j0])) {
                    const err12 = { instancePath: instancePath + "/allowedContexts", schemaPath: "#/properties/allowedContexts/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                    if (vErrors === null) {
                      vErrors = [err12];
                    } else {
                      vErrors.push(err12);
                    }
                    errors++;
                    break outer0;
                  }
                }
              }
            }
          } else {
            const err13 = { instancePath: instancePath + "/allowedContexts", schemaPath: "#/properties/allowedContexts/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
      validate36.errors = vErrors;
      return errors === 0;
    }
    validate36.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var schema60 = { "type": "object", "additionalProperties": false, "required": ["syntheticDemo", "identity", "geometry", "packaging", "logo", "exactText", "references"], "properties": { "syntheticDemo": { "type": "boolean" }, "identity": { "type": "string", "minLength": 1, "maxLength": 500 }, "geometry": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "materials": { "type": "array", "items": { "$ref": "#/$defs/nonEmpty" } }, "packaging": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "logo": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/nonEmpty" } }, "exactText": { "type": "array", "uniqueItems": true, "items": { "type": "string", "minLength": 1, "maxLength": 200 } }, "mutableAttributes": { "type": "array", "uniqueItems": true, "items": { "enum": ["background", "camera_angle", "lighting", "supporting_props", "human_context", "motion"] } }, "references": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/reference" } } } };
    var schema65 = { "type": "object", "additionalProperties": false, "required": ["referenceId", "evidenceRef", "role", "fidelity"], "properties": { "referenceId": { "$ref": "#/$defs/id" }, "evidenceRef": { "$ref": "#/$defs/id" }, "role": { "enum": ["product_identity", "packaging_identity", "logo_identity", "character_identity", "composition_inspiration", "lighting_inspiration", "motion_inspiration"] }, "fidelity": { "enum": ["exact", "high", "inspiration_only"] }, "usageNote": { "type": "string", "maxLength": 500 } } };
    function validate41(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate41.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.referenceId === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "referenceId" }, message: "must have required property 'referenceId'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.evidenceRef === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidenceRef" }, message: "must have required property 'evidenceRef'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.role === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "role" }, message: "must have required property 'role'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.fidelity === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "fidelity" }, message: "must have required property 'fidelity'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "referenceId" || key0 === "evidenceRef" || key0 === "role" || key0 === "fidelity" || key0 === "usageNote")) {
            const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
        }
        if (data.referenceId !== void 0) {
          let data0 = data.referenceId;
          if (typeof data0 === "string") {
            if (!pattern4.test(data0)) {
              const err5 = { instancePath: instancePath + "/referenceId", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/referenceId", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.evidenceRef !== void 0) {
          let data1 = data.evidenceRef;
          if (typeof data1 === "string") {
            if (!pattern4.test(data1)) {
              const err7 = { instancePath: instancePath + "/evidenceRef", schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
          } else {
            const err8 = { instancePath: instancePath + "/evidenceRef", schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
        if (data.role !== void 0) {
          let data2 = data.role;
          if (!(data2 === "product_identity" || data2 === "packaging_identity" || data2 === "logo_identity" || data2 === "character_identity" || data2 === "composition_inspiration" || data2 === "lighting_inspiration" || data2 === "motion_inspiration")) {
            const err9 = { instancePath: instancePath + "/role", schemaPath: "#/properties/role/enum", keyword: "enum", params: { allowedValues: schema65.properties.role.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        if (data.fidelity !== void 0) {
          let data3 = data.fidelity;
          if (!(data3 === "exact" || data3 === "high" || data3 === "inspiration_only")) {
            const err10 = { instancePath: instancePath + "/fidelity", schemaPath: "#/properties/fidelity/enum", keyword: "enum", params: { allowedValues: schema65.properties.fidelity.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.usageNote !== void 0) {
          let data4 = data.usageNote;
          if (typeof data4 === "string") {
            if (func1(data4) > 500) {
              const err11 = { instancePath: instancePath + "/usageNote", schemaPath: "#/properties/usageNote/maxLength", keyword: "maxLength", params: { limit: 500 }, message: "must NOT have more than 500 characters" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          } else {
            const err12 = { instancePath: instancePath + "/usageNote", schemaPath: "#/properties/usageNote/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
      } else {
        const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      validate41.errors = vErrors;
      return errors === 0;
    }
    validate41.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    function validate40(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate40.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.syntheticDemo === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "syntheticDemo" }, message: "must have required property 'syntheticDemo'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.identity === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "identity" }, message: "must have required property 'identity'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.geometry === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "geometry" }, message: "must have required property 'geometry'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.packaging === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "packaging" }, message: "must have required property 'packaging'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.logo === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "logo" }, message: "must have required property 'logo'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.exactText === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "exactText" }, message: "must have required property 'exactText'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        if (data.references === void 0) {
          const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "references" }, message: "must have required property 'references'" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!func15.call(schema60.properties, key0)) {
            const err7 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.syntheticDemo !== void 0) {
          if (typeof data.syntheticDemo !== "boolean") {
            const err8 = { instancePath: instancePath + "/syntheticDemo", schemaPath: "#/properties/syntheticDemo/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err8];
            } else {
              vErrors.push(err8);
            }
            errors++;
          }
        }
        if (data.identity !== void 0) {
          let data1 = data.identity;
          if (typeof data1 === "string") {
            if (func1(data1) > 500) {
              const err9 = { instancePath: instancePath + "/identity", schemaPath: "#/properties/identity/maxLength", keyword: "maxLength", params: { limit: 500 }, message: "must NOT have more than 500 characters" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            if (func1(data1) < 1) {
              const err10 = { instancePath: instancePath + "/identity", schemaPath: "#/properties/identity/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
          } else {
            const err11 = { instancePath: instancePath + "/identity", schemaPath: "#/properties/identity/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data.geometry !== void 0) {
          let data2 = data.geometry;
          if (Array.isArray(data2)) {
            if (data2.length < 1) {
              const err12 = { instancePath: instancePath + "/geometry", schemaPath: "#/properties/geometry/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            const len0 = data2.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data3 = data2[i0];
              if (typeof data3 === "string") {
                if (func1(data3) > 2e3) {
                  const err13 = { instancePath: instancePath + "/geometry/" + i0, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err13];
                  } else {
                    vErrors.push(err13);
                  }
                  errors++;
                }
                if (func1(data3) < 1) {
                  const err14 = { instancePath: instancePath + "/geometry/" + i0, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err14];
                  } else {
                    vErrors.push(err14);
                  }
                  errors++;
                }
              } else {
                const err15 = { instancePath: instancePath + "/geometry/" + i0, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
          } else {
            const err16 = { instancePath: instancePath + "/geometry", schemaPath: "#/properties/geometry/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        if (data.materials !== void 0) {
          let data4 = data.materials;
          if (Array.isArray(data4)) {
            const len1 = data4.length;
            for (let i1 = 0; i1 < len1; i1++) {
              let data5 = data4[i1];
              if (typeof data5 === "string") {
                if (func1(data5) > 2e3) {
                  const err17 = { instancePath: instancePath + "/materials/" + i1, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err17];
                  } else {
                    vErrors.push(err17);
                  }
                  errors++;
                }
                if (func1(data5) < 1) {
                  const err18 = { instancePath: instancePath + "/materials/" + i1, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err18];
                  } else {
                    vErrors.push(err18);
                  }
                  errors++;
                }
              } else {
                const err19 = { instancePath: instancePath + "/materials/" + i1, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
          } else {
            const err20 = { instancePath: instancePath + "/materials", schemaPath: "#/properties/materials/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data.packaging !== void 0) {
          let data6 = data.packaging;
          if (Array.isArray(data6)) {
            if (data6.length < 1) {
              const err21 = { instancePath: instancePath + "/packaging", schemaPath: "#/properties/packaging/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            const len2 = data6.length;
            for (let i2 = 0; i2 < len2; i2++) {
              let data7 = data6[i2];
              if (typeof data7 === "string") {
                if (func1(data7) > 2e3) {
                  const err22 = { instancePath: instancePath + "/packaging/" + i2, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err22];
                  } else {
                    vErrors.push(err22);
                  }
                  errors++;
                }
                if (func1(data7) < 1) {
                  const err23 = { instancePath: instancePath + "/packaging/" + i2, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err23];
                  } else {
                    vErrors.push(err23);
                  }
                  errors++;
                }
              } else {
                const err24 = { instancePath: instancePath + "/packaging/" + i2, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
            }
          } else {
            const err25 = { instancePath: instancePath + "/packaging", schemaPath: "#/properties/packaging/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err25];
            } else {
              vErrors.push(err25);
            }
            errors++;
          }
        }
        if (data.logo !== void 0) {
          let data8 = data.logo;
          if (Array.isArray(data8)) {
            if (data8.length < 1) {
              const err26 = { instancePath: instancePath + "/logo", schemaPath: "#/properties/logo/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err26];
              } else {
                vErrors.push(err26);
              }
              errors++;
            }
            const len3 = data8.length;
            for (let i3 = 0; i3 < len3; i3++) {
              let data9 = data8[i3];
              if (typeof data9 === "string") {
                if (func1(data9) > 2e3) {
                  const err27 = { instancePath: instancePath + "/logo/" + i3, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err27];
                  } else {
                    vErrors.push(err27);
                  }
                  errors++;
                }
                if (func1(data9) < 1) {
                  const err28 = { instancePath: instancePath + "/logo/" + i3, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err28];
                  } else {
                    vErrors.push(err28);
                  }
                  errors++;
                }
              } else {
                const err29 = { instancePath: instancePath + "/logo/" + i3, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
          } else {
            const err30 = { instancePath: instancePath + "/logo", schemaPath: "#/properties/logo/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
        if (data.exactText !== void 0) {
          let data10 = data.exactText;
          if (Array.isArray(data10)) {
            const len4 = data10.length;
            for (let i4 = 0; i4 < len4; i4++) {
              let data11 = data10[i4];
              if (typeof data11 === "string") {
                if (func1(data11) > 200) {
                  const err31 = { instancePath: instancePath + "/exactText/" + i4, schemaPath: "#/properties/exactText/items/maxLength", keyword: "maxLength", params: { limit: 200 }, message: "must NOT have more than 200 characters" };
                  if (vErrors === null) {
                    vErrors = [err31];
                  } else {
                    vErrors.push(err31);
                  }
                  errors++;
                }
                if (func1(data11) < 1) {
                  const err32 = { instancePath: instancePath + "/exactText/" + i4, schemaPath: "#/properties/exactText/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err32];
                  } else {
                    vErrors.push(err32);
                  }
                  errors++;
                }
              } else {
                const err33 = { instancePath: instancePath + "/exactText/" + i4, schemaPath: "#/properties/exactText/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            let i5 = data10.length;
            let j0;
            if (i5 > 1) {
              const indices0 = {};
              for (; i5--; ) {
                let item0 = data10[i5];
                if (typeof item0 !== "string") {
                  continue;
                }
                if (typeof indices0[item0] == "number") {
                  j0 = indices0[item0];
                  const err34 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/uniqueItems", keyword: "uniqueItems", params: { i: i5, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i5 + " are identical)" };
                  if (vErrors === null) {
                    vErrors = [err34];
                  } else {
                    vErrors.push(err34);
                  }
                  errors++;
                  break;
                }
                indices0[item0] = i5;
              }
            }
          } else {
            const err35 = { instancePath: instancePath + "/exactText", schemaPath: "#/properties/exactText/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err35];
            } else {
              vErrors.push(err35);
            }
            errors++;
          }
        }
        if (data.mutableAttributes !== void 0) {
          let data12 = data.mutableAttributes;
          if (Array.isArray(data12)) {
            const len5 = data12.length;
            for (let i6 = 0; i6 < len5; i6++) {
              let data13 = data12[i6];
              if (!(data13 === "background" || data13 === "camera_angle" || data13 === "lighting" || data13 === "supporting_props" || data13 === "human_context" || data13 === "motion")) {
                const err36 = { instancePath: instancePath + "/mutableAttributes/" + i6, schemaPath: "#/properties/mutableAttributes/items/enum", keyword: "enum", params: { allowedValues: schema60.properties.mutableAttributes.items.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err36];
                } else {
                  vErrors.push(err36);
                }
                errors++;
              }
            }
            let i7 = data12.length;
            let j1;
            if (i7 > 1) {
              outer0: for (; i7--; ) {
                for (j1 = i7; j1--; ) {
                  if (func0(data12[i7], data12[j1])) {
                    const err37 = { instancePath: instancePath + "/mutableAttributes", schemaPath: "#/properties/mutableAttributes/uniqueItems", keyword: "uniqueItems", params: { i: i7, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i7 + " are identical)" };
                    if (vErrors === null) {
                      vErrors = [err37];
                    } else {
                      vErrors.push(err37);
                    }
                    errors++;
                    break outer0;
                  }
                }
              }
            }
          } else {
            const err38 = { instancePath: instancePath + "/mutableAttributes", schemaPath: "#/properties/mutableAttributes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err38];
            } else {
              vErrors.push(err38);
            }
            errors++;
          }
        }
        if (data.references !== void 0) {
          let data14 = data.references;
          if (Array.isArray(data14)) {
            if (data14.length < 1) {
              const err39 = { instancePath: instancePath + "/references", schemaPath: "#/properties/references/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err39];
              } else {
                vErrors.push(err39);
              }
              errors++;
            }
            const len6 = data14.length;
            for (let i8 = 0; i8 < len6; i8++) {
              if (!validate41(data14[i8], { instancePath: instancePath + "/references/" + i8, parentData: data14, parentDataProperty: i8, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err40 = { instancePath: instancePath + "/references", schemaPath: "#/properties/references/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err40];
            } else {
              vErrors.push(err40);
            }
            errors++;
          }
        }
      } else {
        const err41 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err41];
        } else {
          vErrors.push(err41);
        }
        errors++;
      }
      validate40.errors = vErrors;
      return errors === 0;
    }
    validate40.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var schema68 = { "type": "object", "additionalProperties": false, "required": ["objective", "audience", "motivator", "painPoint", "useCase", "hook"], "properties": { "objective": { "enum": ["stop_scroll", "click", "consideration", "conversion_test", "concept_replication"] }, "audience": { "$ref": "#/$defs/hypothesis" }, "motivator": { "$ref": "#/$defs/hypothesis" }, "painPoint": { "$ref": "#/$defs/hypothesis" }, "useCase": { "$ref": "#/$defs/hypothesis" }, "trend": { "$ref": "#/$defs/hypothesis" }, "hook": { "type": "object", "additionalProperties": false, "required": ["mechanism", "promise", "claimRefs"], "properties": { "mechanism": { "enum": ["pain_interrupt", "use_case_recognition", "demonstration", "contrast", "curiosity", "social_proof", "identity_signal"] }, "promise": { "$ref": "#/$defs/nonEmpty" }, "claimRefs": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" } } } } } };
    var schema69 = { "type": "object", "additionalProperties": false, "required": ["statement", "status", "evidenceRefs"], "properties": { "statement": { "$ref": "#/$defs/nonEmpty" }, "status": { "enum": ["observed", "supported_hypothesis", "untested_hypothesis"] }, "evidenceRefs": { "type": "array", "uniqueItems": true, "items": { "$ref": "#/$defs/id" } }, "testMethod": { "type": "string", "minLength": 1, "maxLength": 1e3 } } };
    function validate45(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate45.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.statement === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "statement" }, message: "must have required property 'statement'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.status === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "status" }, message: "must have required property 'status'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.evidenceRefs === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "evidenceRefs" }, message: "must have required property 'evidenceRefs'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "statement" || key0 === "status" || key0 === "evidenceRefs" || key0 === "testMethod")) {
            const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        }
        if (data.statement !== void 0) {
          let data0 = data.statement;
          if (typeof data0 === "string") {
            if (func1(data0) > 2e3) {
              const err4 = { instancePath: instancePath + "/statement", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err4];
              } else {
                vErrors.push(err4);
              }
              errors++;
            }
            if (func1(data0) < 1) {
              const err5 = { instancePath: instancePath + "/statement", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
          } else {
            const err6 = { instancePath: instancePath + "/statement", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.status !== void 0) {
          let data1 = data.status;
          if (!(data1 === "observed" || data1 === "supported_hypothesis" || data1 === "untested_hypothesis")) {
            const err7 = { instancePath: instancePath + "/status", schemaPath: "#/properties/status/enum", keyword: "enum", params: { allowedValues: schema69.properties.status.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.evidenceRefs !== void 0) {
          let data2 = data.evidenceRefs;
          if (Array.isArray(data2)) {
            const len0 = data2.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data3 = data2[i0];
              if (typeof data3 === "string") {
                if (!pattern4.test(data3)) {
                  const err8 = { instancePath: instancePath + "/evidenceRefs/" + i0, schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
                  if (vErrors === null) {
                    vErrors = [err8];
                  } else {
                    vErrors.push(err8);
                  }
                  errors++;
                }
              } else {
                const err9 = { instancePath: instancePath + "/evidenceRefs/" + i0, schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err9];
                } else {
                  vErrors.push(err9);
                }
                errors++;
              }
            }
            let i1 = data2.length;
            let j0;
            if (i1 > 1) {
              outer0: for (; i1--; ) {
                for (j0 = i1; j0--; ) {
                  if (func0(data2[i1], data2[j0])) {
                    const err10 = { instancePath: instancePath + "/evidenceRefs", schemaPath: "#/properties/evidenceRefs/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                    if (vErrors === null) {
                      vErrors = [err10];
                    } else {
                      vErrors.push(err10);
                    }
                    errors++;
                    break outer0;
                  }
                }
              }
            }
          } else {
            const err11 = { instancePath: instancePath + "/evidenceRefs", schemaPath: "#/properties/evidenceRefs/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data.testMethod !== void 0) {
          let data4 = data.testMethod;
          if (typeof data4 === "string") {
            if (func1(data4) > 1e3) {
              const err12 = { instancePath: instancePath + "/testMethod", schemaPath: "#/properties/testMethod/maxLength", keyword: "maxLength", params: { limit: 1e3 }, message: "must NOT have more than 1000 characters" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            if (func1(data4) < 1) {
              const err13 = { instancePath: instancePath + "/testMethod", schemaPath: "#/properties/testMethod/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
          } else {
            const err14 = { instancePath: instancePath + "/testMethod", schemaPath: "#/properties/testMethod/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
      } else {
        const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      validate45.errors = vErrors;
      return errors === 0;
    }
    validate45.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    function validate44(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate44.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.objective === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "objective" }, message: "must have required property 'objective'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.audience === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "audience" }, message: "must have required property 'audience'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.motivator === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "motivator" }, message: "must have required property 'motivator'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.painPoint === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "painPoint" }, message: "must have required property 'painPoint'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.useCase === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "useCase" }, message: "must have required property 'useCase'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.hook === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "hook" }, message: "must have required property 'hook'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "objective" || key0 === "audience" || key0 === "motivator" || key0 === "painPoint" || key0 === "useCase" || key0 === "trend" || key0 === "hook")) {
            const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.objective !== void 0) {
          let data0 = data.objective;
          if (!(data0 === "stop_scroll" || data0 === "click" || data0 === "consideration" || data0 === "conversion_test" || data0 === "concept_replication")) {
            const err7 = { instancePath: instancePath + "/objective", schemaPath: "#/properties/objective/enum", keyword: "enum", params: { allowedValues: schema68.properties.objective.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
        }
        if (data.audience !== void 0) {
          if (!validate45(data.audience, { instancePath: instancePath + "/audience", parentData: data, parentDataProperty: "audience", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
        if (data.motivator !== void 0) {
          if (!validate45(data.motivator, { instancePath: instancePath + "/motivator", parentData: data, parentDataProperty: "motivator", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
        if (data.painPoint !== void 0) {
          if (!validate45(data.painPoint, { instancePath: instancePath + "/painPoint", parentData: data, parentDataProperty: "painPoint", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
        if (data.useCase !== void 0) {
          if (!validate45(data.useCase, { instancePath: instancePath + "/useCase", parentData: data, parentDataProperty: "useCase", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
        if (data.trend !== void 0) {
          if (!validate45(data.trend, { instancePath: instancePath + "/trend", parentData: data, parentDataProperty: "trend", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
        if (data.hook !== void 0) {
          let data6 = data.hook;
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.mechanism === void 0) {
              const err8 = { instancePath: instancePath + "/hook", schemaPath: "#/properties/hook/required", keyword: "required", params: { missingProperty: "mechanism" }, message: "must have required property 'mechanism'" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (data6.promise === void 0) {
              const err9 = { instancePath: instancePath + "/hook", schemaPath: "#/properties/hook/required", keyword: "required", params: { missingProperty: "promise" }, message: "must have required property 'promise'" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            if (data6.claimRefs === void 0) {
              const err10 = { instancePath: instancePath + "/hook", schemaPath: "#/properties/hook/required", keyword: "required", params: { missingProperty: "claimRefs" }, message: "must have required property 'claimRefs'" };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
            for (const key1 in data6) {
              if (!(key1 === "mechanism" || key1 === "promise" || key1 === "claimRefs")) {
                const err11 = { instancePath: instancePath + "/hook", schemaPath: "#/properties/hook/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err11];
                } else {
                  vErrors.push(err11);
                }
                errors++;
              }
            }
            if (data6.mechanism !== void 0) {
              let data7 = data6.mechanism;
              if (!(data7 === "pain_interrupt" || data7 === "use_case_recognition" || data7 === "demonstration" || data7 === "contrast" || data7 === "curiosity" || data7 === "social_proof" || data7 === "identity_signal")) {
                const err12 = { instancePath: instancePath + "/hook/mechanism", schemaPath: "#/properties/hook/properties/mechanism/enum", keyword: "enum", params: { allowedValues: schema68.properties.hook.properties.mechanism.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
            if (data6.promise !== void 0) {
              let data8 = data6.promise;
              if (typeof data8 === "string") {
                if (func1(data8) > 2e3) {
                  const err13 = { instancePath: instancePath + "/hook/promise", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err13];
                  } else {
                    vErrors.push(err13);
                  }
                  errors++;
                }
                if (func1(data8) < 1) {
                  const err14 = { instancePath: instancePath + "/hook/promise", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err14];
                  } else {
                    vErrors.push(err14);
                  }
                  errors++;
                }
              } else {
                const err15 = { instancePath: instancePath + "/hook/promise", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
            if (data6.claimRefs !== void 0) {
              let data9 = data6.claimRefs;
              if (Array.isArray(data9)) {
                const len0 = data9.length;
                for (let i0 = 0; i0 < len0; i0++) {
                  let data10 = data9[i0];
                  if (typeof data10 === "string") {
                    if (!pattern4.test(data10)) {
                      const err16 = { instancePath: instancePath + "/hook/claimRefs/" + i0, schemaPath: "#/$defs/id/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
                      if (vErrors === null) {
                        vErrors = [err16];
                      } else {
                        vErrors.push(err16);
                      }
                      errors++;
                    }
                  } else {
                    const err17 = { instancePath: instancePath + "/hook/claimRefs/" + i0, schemaPath: "#/$defs/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err17];
                    } else {
                      vErrors.push(err17);
                    }
                    errors++;
                  }
                }
                let i1 = data9.length;
                let j0;
                if (i1 > 1) {
                  outer0: for (; i1--; ) {
                    for (j0 = i1; j0--; ) {
                      if (func0(data9[i1], data9[j0])) {
                        const err18 = { instancePath: instancePath + "/hook/claimRefs", schemaPath: "#/properties/hook/properties/claimRefs/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                        if (vErrors === null) {
                          vErrors = [err18];
                        } else {
                          vErrors.push(err18);
                        }
                        errors++;
                        break outer0;
                      }
                    }
                  }
                }
              } else {
                const err19 = { instancePath: instancePath + "/hook/claimRefs", schemaPath: "#/properties/hook/properties/claimRefs/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
          } else {
            const err20 = { instancePath: instancePath + "/hook", schemaPath: "#/properties/hook/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
      } else {
        const err21 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
      validate44.errors = vErrors;
      return errors === 0;
    }
    validate44.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var pattern19 = new RegExp("^#[A-Fa-f0-9]{6}$", "u");
    function validate52(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate52.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.direction === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "direction" }, message: "must have required property 'direction'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.mood === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "mood" }, message: "must have required property 'mood'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.palette === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "palette" }, message: "must have required property 'palette'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.lighting === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "lighting" }, message: "must have required property 'lighting'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.photography === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "photography" }, message: "must have required property 'photography'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.antiGenericRules === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "antiGenericRules" }, message: "must have required property 'antiGenericRules'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "direction" || key0 === "mood" || key0 === "palette" || key0 === "lighting" || key0 === "photography" || key0 === "antiGenericRules")) {
            const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.direction !== void 0) {
          let data0 = data.direction;
          if (typeof data0 === "string") {
            if (func1(data0) > 2e3) {
              const err7 = { instancePath: instancePath + "/direction", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err7];
              } else {
                vErrors.push(err7);
              }
              errors++;
            }
            if (func1(data0) < 1) {
              const err8 = { instancePath: instancePath + "/direction", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
          } else {
            const err9 = { instancePath: instancePath + "/direction", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        if (data.mood !== void 0) {
          let data1 = data.mood;
          if (Array.isArray(data1)) {
            if (data1.length < 1) {
              const err10 = { instancePath: instancePath + "/mood", schemaPath: "#/properties/mood/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
            const len0 = data1.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data2 = data1[i0];
              if (typeof data2 === "string") {
                if (func1(data2) > 80) {
                  const err11 = { instancePath: instancePath + "/mood/" + i0, schemaPath: "#/properties/mood/items/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" };
                  if (vErrors === null) {
                    vErrors = [err11];
                  } else {
                    vErrors.push(err11);
                  }
                  errors++;
                }
                if (func1(data2) < 1) {
                  const err12 = { instancePath: instancePath + "/mood/" + i0, schemaPath: "#/properties/mood/items/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err12];
                  } else {
                    vErrors.push(err12);
                  }
                  errors++;
                }
              } else {
                const err13 = { instancePath: instancePath + "/mood/" + i0, schemaPath: "#/properties/mood/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
            }
            let i1 = data1.length;
            let j0;
            if (i1 > 1) {
              const indices0 = {};
              for (; i1--; ) {
                let item0 = data1[i1];
                if (typeof item0 !== "string") {
                  continue;
                }
                if (typeof indices0[item0] == "number") {
                  j0 = indices0[item0];
                  const err14 = { instancePath: instancePath + "/mood", schemaPath: "#/properties/mood/uniqueItems", keyword: "uniqueItems", params: { i: i1, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i1 + " are identical)" };
                  if (vErrors === null) {
                    vErrors = [err14];
                  } else {
                    vErrors.push(err14);
                  }
                  errors++;
                  break;
                }
                indices0[item0] = i1;
              }
            }
          } else {
            const err15 = { instancePath: instancePath + "/mood", schemaPath: "#/properties/mood/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data.palette !== void 0) {
          let data3 = data.palette;
          if (Array.isArray(data3)) {
            if (data3.length < 1) {
              const err16 = { instancePath: instancePath + "/palette", schemaPath: "#/properties/palette/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            const len1 = data3.length;
            for (let i2 = 0; i2 < len1; i2++) {
              let data4 = data3[i2];
              if (typeof data4 === "string") {
                if (!pattern19.test(data4)) {
                  const err17 = { instancePath: instancePath + "/palette/" + i2, schemaPath: "#/properties/palette/items/pattern", keyword: "pattern", params: { pattern: "^#[A-Fa-f0-9]{6}$" }, message: 'must match pattern "^#[A-Fa-f0-9]{6}$"' };
                  if (vErrors === null) {
                    vErrors = [err17];
                  } else {
                    vErrors.push(err17);
                  }
                  errors++;
                }
              } else {
                const err18 = { instancePath: instancePath + "/palette/" + i2, schemaPath: "#/properties/palette/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            let i3 = data3.length;
            let j1;
            if (i3 > 1) {
              const indices1 = {};
              for (; i3--; ) {
                let item1 = data3[i3];
                if (typeof item1 !== "string") {
                  continue;
                }
                if (typeof indices1[item1] == "number") {
                  j1 = indices1[item1];
                  const err19 = { instancePath: instancePath + "/palette", schemaPath: "#/properties/palette/uniqueItems", keyword: "uniqueItems", params: { i: i3, j: j1 }, message: "must NOT have duplicate items (items ## " + j1 + " and " + i3 + " are identical)" };
                  if (vErrors === null) {
                    vErrors = [err19];
                  } else {
                    vErrors.push(err19);
                  }
                  errors++;
                  break;
                }
                indices1[item1] = i3;
              }
            }
          } else {
            const err20 = { instancePath: instancePath + "/palette", schemaPath: "#/properties/palette/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data.lighting !== void 0) {
          let data5 = data.lighting;
          if (typeof data5 === "string") {
            if (func1(data5) > 2e3) {
              const err21 = { instancePath: instancePath + "/lighting", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            if (func1(data5) < 1) {
              const err22 = { instancePath: instancePath + "/lighting", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
          } else {
            const err23 = { instancePath: instancePath + "/lighting", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
        }
        if (data.photography !== void 0) {
          let data6 = data.photography;
          if (typeof data6 === "string") {
            if (func1(data6) > 2e3) {
              const err24 = { instancePath: instancePath + "/photography", schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (func1(data6) < 1) {
              const err25 = { instancePath: instancePath + "/photography", schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
          } else {
            const err26 = { instancePath: instancePath + "/photography", schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err26];
            } else {
              vErrors.push(err26);
            }
            errors++;
          }
        }
        if (data.antiGenericRules !== void 0) {
          let data7 = data.antiGenericRules;
          if (Array.isArray(data7)) {
            if (data7.length < 1) {
              const err27 = { instancePath: instancePath + "/antiGenericRules", schemaPath: "#/properties/antiGenericRules/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err27];
              } else {
                vErrors.push(err27);
              }
              errors++;
            }
            const len2 = data7.length;
            for (let i4 = 0; i4 < len2; i4++) {
              let data8 = data7[i4];
              if (typeof data8 === "string") {
                if (func1(data8) > 2e3) {
                  const err28 = { instancePath: instancePath + "/antiGenericRules/" + i4, schemaPath: "#/$defs/nonEmpty/maxLength", keyword: "maxLength", params: { limit: 2e3 }, message: "must NOT have more than 2000 characters" };
                  if (vErrors === null) {
                    vErrors = [err28];
                  } else {
                    vErrors.push(err28);
                  }
                  errors++;
                }
                if (func1(data8) < 1) {
                  const err29 = { instancePath: instancePath + "/antiGenericRules/" + i4, schemaPath: "#/$defs/nonEmpty/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err29];
                  } else {
                    vErrors.push(err29);
                  }
                  errors++;
                }
              } else {
                const err30 = { instancePath: instancePath + "/antiGenericRules/" + i4, schemaPath: "#/$defs/nonEmpty/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
          } else {
            const err31 = { instancePath: instancePath + "/antiGenericRules", schemaPath: "#/properties/antiGenericRules/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
      } else {
        const err32 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
      validate52.errors = vErrors;
      return errors === 0;
    }
    validate52.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var schema79 = { "type": "object", "additionalProperties": false, "required": ["aspectRatio", "widthPx", "heightPx", "safeZones", "colorSpace"], "properties": { "aspectRatio": { "enum": ["1:1", "4:5", "9:16", "16:9"] }, "widthPx": { "type": "integer", "minimum": 256, "maximum": 8192 }, "heightPx": { "type": "integer", "minimum": 256, "maximum": 8192 }, "safeZones": { "$ref": "#/$defs/safeZones" }, "colorSpace": { "enum": ["sRGB", "Display-P3"] } } };
    function validate54(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate54.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.aspectRatio === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "aspectRatio" }, message: "must have required property 'aspectRatio'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.widthPx === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "widthPx" }, message: "must have required property 'widthPx'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.heightPx === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "heightPx" }, message: "must have required property 'heightPx'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.safeZones === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "safeZones" }, message: "must have required property 'safeZones'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.colorSpace === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "colorSpace" }, message: "must have required property 'colorSpace'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!(key0 === "aspectRatio" || key0 === "widthPx" || key0 === "heightPx" || key0 === "safeZones" || key0 === "colorSpace")) {
            const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err5];
            } else {
              vErrors.push(err5);
            }
            errors++;
          }
        }
        if (data.aspectRatio !== void 0) {
          let data0 = data.aspectRatio;
          if (!(data0 === "1:1" || data0 === "4:5" || data0 === "9:16" || data0 === "16:9")) {
            const err6 = { instancePath: instancePath + "/aspectRatio", schemaPath: "#/properties/aspectRatio/enum", keyword: "enum", params: { allowedValues: schema79.properties.aspectRatio.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
        }
        if (data.widthPx !== void 0) {
          let data1 = data.widthPx;
          if (!(typeof data1 == "number" && (!(data1 % 1) && !isNaN(data1)))) {
            const err7 = { instancePath: instancePath + "/widthPx", schemaPath: "#/properties/widthPx/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
          if (typeof data1 == "number") {
            if (data1 > 8192 || isNaN(data1)) {
              const err8 = { instancePath: instancePath + "/widthPx", schemaPath: "#/properties/widthPx/maximum", keyword: "maximum", params: { comparison: "<=", limit: 8192 }, message: "must be <= 8192" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (data1 < 256 || isNaN(data1)) {
              const err9 = { instancePath: instancePath + "/widthPx", schemaPath: "#/properties/widthPx/minimum", keyword: "minimum", params: { comparison: ">=", limit: 256 }, message: "must be >= 256" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          }
        }
        if (data.heightPx !== void 0) {
          let data2 = data.heightPx;
          if (!(typeof data2 == "number" && (!(data2 % 1) && !isNaN(data2)))) {
            const err10 = { instancePath: instancePath + "/heightPx", schemaPath: "#/properties/heightPx/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
          if (typeof data2 == "number") {
            if (data2 > 8192 || isNaN(data2)) {
              const err11 = { instancePath: instancePath + "/heightPx", schemaPath: "#/properties/heightPx/maximum", keyword: "maximum", params: { comparison: "<=", limit: 8192 }, message: "must be <= 8192" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (data2 < 256 || isNaN(data2)) {
              const err12 = { instancePath: instancePath + "/heightPx", schemaPath: "#/properties/heightPx/minimum", keyword: "minimum", params: { comparison: ">=", limit: 256 }, message: "must be >= 256" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
          }
        }
        if (data.safeZones !== void 0) {
          let data3 = data.safeZones;
          if (data3 && typeof data3 == "object" && !Array.isArray(data3)) {
            if (data3.topPct === void 0) {
              const err13 = { instancePath: instancePath + "/safeZones", schemaPath: "#/$defs/safeZones/required", keyword: "required", params: { missingProperty: "topPct" }, message: "must have required property 'topPct'" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
            if (data3.rightPct === void 0) {
              const err14 = { instancePath: instancePath + "/safeZones", schemaPath: "#/$defs/safeZones/required", keyword: "required", params: { missingProperty: "rightPct" }, message: "must have required property 'rightPct'" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            if (data3.bottomPct === void 0) {
              const err15 = { instancePath: instancePath + "/safeZones", schemaPath: "#/$defs/safeZones/required", keyword: "required", params: { missingProperty: "bottomPct" }, message: "must have required property 'bottomPct'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data3.leftPct === void 0) {
              const err16 = { instancePath: instancePath + "/safeZones", schemaPath: "#/$defs/safeZones/required", keyword: "required", params: { missingProperty: "leftPct" }, message: "must have required property 'leftPct'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key1 in data3) {
              if (!(key1 === "topPct" || key1 === "rightPct" || key1 === "bottomPct" || key1 === "leftPct")) {
                const err17 = { instancePath: instancePath + "/safeZones", schemaPath: "#/$defs/safeZones/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data3.topPct !== void 0) {
              let data4 = data3.topPct;
              if (typeof data4 == "number") {
                if (data4 > 40 || isNaN(data4)) {
                  const err18 = { instancePath: instancePath + "/safeZones/topPct", schemaPath: "#/$defs/safeZones/properties/topPct/maximum", keyword: "maximum", params: { comparison: "<=", limit: 40 }, message: "must be <= 40" };
                  if (vErrors === null) {
                    vErrors = [err18];
                  } else {
                    vErrors.push(err18);
                  }
                  errors++;
                }
                if (data4 < 0 || isNaN(data4)) {
                  const err19 = { instancePath: instancePath + "/safeZones/topPct", schemaPath: "#/$defs/safeZones/properties/topPct/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
                  if (vErrors === null) {
                    vErrors = [err19];
                  } else {
                    vErrors.push(err19);
                  }
                  errors++;
                }
              } else {
                const err20 = { instancePath: instancePath + "/safeZones/topPct", schemaPath: "#/$defs/safeZones/properties/topPct/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data3.rightPct !== void 0) {
              let data5 = data3.rightPct;
              if (typeof data5 == "number") {
                if (data5 > 40 || isNaN(data5)) {
                  const err21 = { instancePath: instancePath + "/safeZones/rightPct", schemaPath: "#/$defs/safeZones/properties/rightPct/maximum", keyword: "maximum", params: { comparison: "<=", limit: 40 }, message: "must be <= 40" };
                  if (vErrors === null) {
                    vErrors = [err21];
                  } else {
                    vErrors.push(err21);
                  }
                  errors++;
                }
                if (data5 < 0 || isNaN(data5)) {
                  const err22 = { instancePath: instancePath + "/safeZones/rightPct", schemaPath: "#/$defs/safeZones/properties/rightPct/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
                  if (vErrors === null) {
                    vErrors = [err22];
                  } else {
                    vErrors.push(err22);
                  }
                  errors++;
                }
              } else {
                const err23 = { instancePath: instancePath + "/safeZones/rightPct", schemaPath: "#/$defs/safeZones/properties/rightPct/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
            if (data3.bottomPct !== void 0) {
              let data6 = data3.bottomPct;
              if (typeof data6 == "number") {
                if (data6 > 40 || isNaN(data6)) {
                  const err24 = { instancePath: instancePath + "/safeZones/bottomPct", schemaPath: "#/$defs/safeZones/properties/bottomPct/maximum", keyword: "maximum", params: { comparison: "<=", limit: 40 }, message: "must be <= 40" };
                  if (vErrors === null) {
                    vErrors = [err24];
                  } else {
                    vErrors.push(err24);
                  }
                  errors++;
                }
                if (data6 < 0 || isNaN(data6)) {
                  const err25 = { instancePath: instancePath + "/safeZones/bottomPct", schemaPath: "#/$defs/safeZones/properties/bottomPct/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
                  if (vErrors === null) {
                    vErrors = [err25];
                  } else {
                    vErrors.push(err25);
                  }
                  errors++;
                }
              } else {
                const err26 = { instancePath: instancePath + "/safeZones/bottomPct", schemaPath: "#/$defs/safeZones/properties/bottomPct/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data3.leftPct !== void 0) {
              let data7 = data3.leftPct;
              if (typeof data7 == "number") {
                if (data7 > 40 || isNaN(data7)) {
                  const err27 = { instancePath: instancePath + "/safeZones/leftPct", schemaPath: "#/$defs/safeZones/properties/leftPct/maximum", keyword: "maximum", params: { comparison: "<=", limit: 40 }, message: "must be <= 40" };
                  if (vErrors === null) {
                    vErrors = [err27];
                  } else {
                    vErrors.push(err27);
                  }
                  errors++;
                }
                if (data7 < 0 || isNaN(data7)) {
                  const err28 = { instancePath: instancePath + "/safeZones/leftPct", schemaPath: "#/$defs/safeZones/properties/leftPct/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" };
                  if (vErrors === null) {
                    vErrors = [err28];
                  } else {
                    vErrors.push(err28);
                  }
                  errors++;
                }
              } else {
                const err29 = { instancePath: instancePath + "/safeZones/leftPct", schemaPath: "#/$defs/safeZones/properties/leftPct/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
          } else {
            const err30 = { instancePath: instancePath + "/safeZones", schemaPath: "#/$defs/safeZones/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
        if (data.colorSpace !== void 0) {
          let data8 = data.colorSpace;
          if (!(data8 === "sRGB" || data8 === "Display-P3")) {
            const err31 = { instancePath: instancePath + "/colorSpace", schemaPath: "#/properties/colorSpace/enum", keyword: "enum", params: { allowedValues: schema79.properties.colorSpace.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
      } else {
        const err32 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
      validate54.errors = vErrors;
      return errors === 0;
    }
    validate54.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    var formats0 = require_formats().fullFormats["date-time"];
    function validate20(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      ;
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate20.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      const _errs2 = errors;
      let valid1 = true;
      const _errs3 = errors;
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.mediaType !== void 0) {
          if ("image" !== data.mediaType) {
            const err0 = {};
            if (vErrors === null) {
              vErrors = [err0];
            } else {
              vErrors.push(err0);
            }
            errors++;
          }
        }
      }
      var _valid0 = _errs3 === errors;
      errors = _errs2;
      if (vErrors !== null) {
        if (_errs2) {
          vErrors.length = _errs2;
        } else {
          vErrors = null;
        }
      }
      if (_valid0) {
        const _errs5 = errors;
        if (data && typeof data == "object" && !Array.isArray(data)) {
          if (data.creative !== void 0) {
            if (!validate21(data.creative, { instancePath: instancePath + "/creative", parentData: data, parentDataProperty: "creative", rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
              errors = vErrors.length;
            }
          }
        }
        var _valid0 = _errs5 === errors;
        valid1 = _valid0;
        if (valid1) {
          var props0 = {};
          props0.creative = true;
          props0.mediaType = true;
        }
      }
      if (!valid1) {
        const err1 = { instancePath, schemaPath: "#/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
      const _errs8 = errors;
      let valid4 = true;
      const _errs9 = errors;
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.mediaType !== void 0) {
          if ("video" !== data.mediaType) {
            const err2 = {};
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          }
        }
      }
      var _valid1 = _errs9 === errors;
      errors = _errs8;
      if (vErrors !== null) {
        if (_errs8) {
          vErrors.length = _errs8;
        } else {
          vErrors = null;
        }
      }
      if (_valid1) {
        const _errs11 = errors;
        if (data && typeof data == "object" && !Array.isArray(data)) {
          if (data.creative !== void 0) {
            if (!validate25(data.creative, { instancePath: instancePath + "/creative", parentData: data, parentDataProperty: "creative", rootData, dynamicAnchors })) {
              vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
              errors = vErrors.length;
            }
          }
        }
        var _valid1 = _errs11 === errors;
        valid4 = _valid1;
        if (valid4) {
          var props1 = {};
          props1.creative = true;
          props1.mediaType = true;
        }
      }
      if (!valid4) {
        const err3 = { instancePath, schemaPath: "#/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if (props0 !== true && props1 !== void 0) {
        if (props1 === true) {
          props0 = true;
        } else {
          props0 = props0 || {};
          Object.assign(props0, props1);
        }
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.schemaVersion === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schemaVersion" }, message: "must have required property 'schemaVersion'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.promptId === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "promptId" }, message: "must have required property 'promptId'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        if (data.revision === void 0) {
          const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "revision" }, message: "must have required property 'revision'" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
        if (data.mediaType === void 0) {
          const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "mediaType" }, message: "must have required property 'mediaType'" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data.authorship === void 0) {
          const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "authorship" }, message: "must have required property 'authorship'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data.provenance === void 0) {
          const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "provenance" }, message: "must have required property 'provenance'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data.sourceEvidence === void 0) {
          const err10 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "sourceEvidence" }, message: "must have required property 'sourceEvidence'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data.approvedClaims === void 0) {
          const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "approvedClaims" }, message: "must have required property 'approvedClaims'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (data.productLock === void 0) {
          const err12 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "productLock" }, message: "must have required property 'productLock'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        if (data.strategy === void 0) {
          const err13 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "strategy" }, message: "must have required property 'strategy'" };
          if (vErrors === null) {
            vErrors = [err13];
          } else {
            vErrors.push(err13);
          }
          errors++;
        }
        if (data.taste === void 0) {
          const err14 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "taste" }, message: "must have required property 'taste'" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
        if (data.output === void 0) {
          const err15 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "output" }, message: "must have required property 'output'" };
          if (vErrors === null) {
            vErrors = [err15];
          } else {
            vErrors.push(err15);
          }
          errors++;
        }
        if (data.creative === void 0) {
          const err16 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "creative" }, message: "must have required property 'creative'" };
          if (vErrors === null) {
            vErrors = [err16];
          } else {
            vErrors.push(err16);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!func15.call(schema31.properties, key0)) {
            const err17 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
        if (data.schemaVersion !== void 0) {
          if ("creative-hook-lab.mega-prompt/1.0.0" !== data.schemaVersion) {
            const err18 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: "creative-hook-lab.mega-prompt/1.0.0" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
        if (data.promptId !== void 0) {
          let data5 = data.promptId;
          if (typeof data5 === "string") {
            if (!pattern7.test(data5)) {
              const err19 = { instancePath: instancePath + "/promptId", schemaPath: "#/properties/promptId/pattern", keyword: "pattern", params: { pattern: "^mp_[a-z0-9][a-z0-9_-]{7,63}$" }, message: 'must match pattern "^mp_[a-z0-9][a-z0-9_-]{7,63}$"' };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
          } else {
            const err20 = { instancePath: instancePath + "/promptId", schemaPath: "#/properties/promptId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data.revision !== void 0) {
          let data6 = data.revision;
          if (!(typeof data6 == "number" && (!(data6 % 1) && !isNaN(data6)))) {
            const err21 = { instancePath: instancePath + "/revision", schemaPath: "#/properties/revision/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
            if (vErrors === null) {
              vErrors = [err21];
            } else {
              vErrors.push(err21);
            }
            errors++;
          }
          if (typeof data6 == "number") {
            if (data6 < 1 || isNaN(data6)) {
              const err22 = { instancePath: instancePath + "/revision", schemaPath: "#/properties/revision/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
          }
        }
        if (data.mediaType !== void 0) {
          let data7 = data.mediaType;
          if (!(data7 === "image" || data7 === "video")) {
            const err23 = { instancePath: instancePath + "/mediaType", schemaPath: "#/properties/mediaType/enum", keyword: "enum", params: { allowedValues: schema31.properties.mediaType.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
        }
        if (data.authorship !== void 0) {
          let data8 = data.authorship;
          if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
            if (data8.modelFamily === void 0) {
              const err24 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "modelFamily" }, message: "must have required property 'modelFamily'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data8.authoringMode === void 0) {
              const err25 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "authoringMode" }, message: "must have required property 'authoringMode'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            if (data8.authoredAt === void 0) {
              const err26 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "authoredAt" }, message: "must have required property 'authoredAt'" };
              if (vErrors === null) {
                vErrors = [err26];
              } else {
                vErrors.push(err26);
              }
              errors++;
            }
            if (data8.verificationStatus === void 0) {
              const err27 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "verificationStatus" }, message: "must have required property 'verificationStatus'" };
              if (vErrors === null) {
                vErrors = [err27];
              } else {
                vErrors.push(err27);
              }
              errors++;
            }
            if (data8.invocationRef === void 0) {
              const err28 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "invocationRef" }, message: "must have required property 'invocationRef'" };
              if (vErrors === null) {
                vErrors = [err28];
              } else {
                vErrors.push(err28);
              }
              errors++;
            }
            for (const key1 in data8) {
              if (!(key1 === "modelFamily" || key1 === "authoringMode" || key1 === "authoredAt" || key1 === "verificationStatus" || key1 === "invocationRef" || key1 === "humanEditor")) {
                const err29 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
            if (data8.modelFamily !== void 0) {
              let data9 = data8.modelFamily;
              if (!(data9 === "claude-opus-5.5" || data9 === "gpt-6.1-sol")) {
                const err30 = { instancePath: instancePath + "/authorship/modelFamily", schemaPath: "#/$defs/authorship/properties/modelFamily/enum", keyword: "enum", params: { allowedValues: schema51.properties.modelFamily.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data8.authoringMode !== void 0) {
              let data10 = data8.authoringMode;
              if (!(data10 === "model_authored" || data10 === "model_authored_human_edited")) {
                const err31 = { instancePath: instancePath + "/authorship/authoringMode", schemaPath: "#/$defs/authorship/properties/authoringMode/enum", keyword: "enum", params: { allowedValues: schema51.properties.authoringMode.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data8.authoredAt !== void 0) {
              let data11 = data8.authoredAt;
              if (typeof data11 === "string") {
                if (!formats0.validate(data11)) {
                  const err32 = { instancePath: instancePath + "/authorship/authoredAt", schemaPath: "#/$defs/authorship/properties/authoredAt/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
                  if (vErrors === null) {
                    vErrors = [err32];
                  } else {
                    vErrors.push(err32);
                  }
                  errors++;
                }
              } else {
                const err33 = { instancePath: instancePath + "/authorship/authoredAt", schemaPath: "#/$defs/authorship/properties/authoredAt/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            if (data8.verificationStatus !== void 0) {
              let data12 = data8.verificationStatus;
              if (!(data12 === "actual_invocation_verified" || data12 === "synthetic_fixture")) {
                const err34 = { instancePath: instancePath + "/authorship/verificationStatus", schemaPath: "#/$defs/authorship/properties/verificationStatus/enum", keyword: "enum", params: { allowedValues: schema51.properties.verificationStatus.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err34];
                } else {
                  vErrors.push(err34);
                }
                errors++;
              }
            }
            if (data8.invocationRef !== void 0) {
              let data13 = data8.invocationRef;
              if (typeof data13 === "string") {
                if (func1(data13) > 200) {
                  const err35 = { instancePath: instancePath + "/authorship/invocationRef", schemaPath: "#/$defs/authorship/properties/invocationRef/maxLength", keyword: "maxLength", params: { limit: 200 }, message: "must NOT have more than 200 characters" };
                  if (vErrors === null) {
                    vErrors = [err35];
                  } else {
                    vErrors.push(err35);
                  }
                  errors++;
                }
                if (func1(data13) < 1) {
                  const err36 = { instancePath: instancePath + "/authorship/invocationRef", schemaPath: "#/$defs/authorship/properties/invocationRef/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err36];
                  } else {
                    vErrors.push(err36);
                  }
                  errors++;
                }
              } else {
                const err37 = { instancePath: instancePath + "/authorship/invocationRef", schemaPath: "#/$defs/authorship/properties/invocationRef/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err37];
                } else {
                  vErrors.push(err37);
                }
                errors++;
              }
            }
            if (data8.humanEditor !== void 0) {
              let data14 = data8.humanEditor;
              if (typeof data14 === "string") {
                if (func1(data14) > 120) {
                  const err38 = { instancePath: instancePath + "/authorship/humanEditor", schemaPath: "#/$defs/authorship/properties/humanEditor/maxLength", keyword: "maxLength", params: { limit: 120 }, message: "must NOT have more than 120 characters" };
                  if (vErrors === null) {
                    vErrors = [err38];
                  } else {
                    vErrors.push(err38);
                  }
                  errors++;
                }
                if (func1(data14) < 1) {
                  const err39 = { instancePath: instancePath + "/authorship/humanEditor", schemaPath: "#/$defs/authorship/properties/humanEditor/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err39];
                  } else {
                    vErrors.push(err39);
                  }
                  errors++;
                }
              } else {
                const err40 = { instancePath: instancePath + "/authorship/humanEditor", schemaPath: "#/$defs/authorship/properties/humanEditor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err40];
                } else {
                  vErrors.push(err40);
                }
                errors++;
              }
            }
          } else {
            const err41 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err41];
            } else {
              vErrors.push(err41);
            }
            errors++;
          }
        }
        if (data.provenance !== void 0) {
          if (!validate32(data.provenance, { instancePath: instancePath + "/provenance", parentData: data, parentDataProperty: "provenance", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
            errors = vErrors.length;
          }
        }
        if (data.sourceEvidence !== void 0) {
          let data16 = data.sourceEvidence;
          if (Array.isArray(data16)) {
            if (data16.length < 1) {
              const err42 = { instancePath: instancePath + "/sourceEvidence", schemaPath: "#/properties/sourceEvidence/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err42];
              } else {
                vErrors.push(err42);
              }
              errors++;
            }
            const len0 = data16.length;
            for (let i0 = 0; i0 < len0; i0++) {
              if (!validate34(data16[i0], { instancePath: instancePath + "/sourceEvidence/" + i0, parentData: data16, parentDataProperty: i0, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate34.errors : vErrors.concat(validate34.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err43 = { instancePath: instancePath + "/sourceEvidence", schemaPath: "#/properties/sourceEvidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err43];
            } else {
              vErrors.push(err43);
            }
            errors++;
          }
        }
        if (data.approvedClaims !== void 0) {
          let data18 = data.approvedClaims;
          if (Array.isArray(data18)) {
            const len1 = data18.length;
            for (let i1 = 0; i1 < len1; i1++) {
              if (!validate36(data18[i1], { instancePath: instancePath + "/approvedClaims/" + i1, parentData: data18, parentDataProperty: i1, rootData, dynamicAnchors })) {
                vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err44 = { instancePath: instancePath + "/approvedClaims", schemaPath: "#/properties/approvedClaims/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
        if (data.productLock !== void 0) {
          if (!validate40(data.productLock, { instancePath: instancePath + "/productLock", parentData: data, parentDataProperty: "productLock", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
            errors = vErrors.length;
          }
        }
        if (data.strategy !== void 0) {
          if (!validate44(data.strategy, { instancePath: instancePath + "/strategy", parentData: data, parentDataProperty: "strategy", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
            errors = vErrors.length;
          }
        }
        if (data.taste !== void 0) {
          if (!validate52(data.taste, { instancePath: instancePath + "/taste", parentData: data, parentDataProperty: "taste", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate52.errors : vErrors.concat(validate52.errors);
            errors = vErrors.length;
          }
        }
        if (data.output !== void 0) {
          if (!validate54(data.output, { instancePath: instancePath + "/output", parentData: data, parentDataProperty: "output", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
            errors = vErrors.length;
          }
        }
        if (data.creative !== void 0) {
          let data24 = data.creative;
          const _errs45 = errors;
          let valid14 = false;
          let passing0 = null;
          const _errs46 = errors;
          if (!validate21(data24, { instancePath: instancePath + "/creative", parentData: data, parentDataProperty: "creative", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
            errors = vErrors.length;
          }
          var _valid2 = _errs46 === errors;
          if (_valid2) {
            valid14 = true;
            passing0 = 0;
            var props2 = true;
          }
          const _errs47 = errors;
          if (!validate25(data24, { instancePath: instancePath + "/creative", parentData: data, parentDataProperty: "creative", rootData, dynamicAnchors })) {
            vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
            errors = vErrors.length;
          }
          var _valid2 = _errs47 === errors;
          if (_valid2 && valid14) {
            valid14 = false;
            passing0 = [passing0, 1];
          } else {
            if (_valid2) {
              valid14 = true;
              passing0 = 1;
              if (props2 !== true) {
                props2 = true;
              }
            }
          }
          if (!valid14) {
            const err45 = { instancePath: instancePath + "/creative", schemaPath: "#/properties/creative/oneOf", keyword: "oneOf", params: { passingSchemas: passing0 }, message: "must match exactly one schema in oneOf" };
            if (vErrors === null) {
              vErrors = [err45];
            } else {
              vErrors.push(err45);
            }
            errors++;
          } else {
            errors = _errs45;
            if (vErrors !== null) {
              if (_errs45) {
                vErrors.length = _errs45;
              } else {
                vErrors = null;
              }
            }
          }
        }
      } else {
        const err46 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err46];
        } else {
          vErrors.push(err46);
        }
        errors++;
      }
      validate20.errors = vErrors;
      return errors === 0;
    }
    validate20.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
    exports.validateNegative = validate58;
    var schema81 = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://creative-hook-lab.invalid/schemas/negative-prompt.schema.json", "title": "Creative Hook Lab provider-neutral NEGATIVE PROMPT", "type": "object", "additionalProperties": false, "required": ["schemaVersion", "negativePromptId", "revision", "megaPromptId", "megaPromptRevision", "mediaType", "authorship", "provenance", "policy", "constraints"], "properties": { "schemaVersion": { "const": "creative-hook-lab.negative-prompt/1.0.0" }, "negativePromptId": { "type": "string", "pattern": "^np_[a-z0-9][a-z0-9_-]{7,63}$" }, "revision": { "type": "integer", "minimum": 1 }, "megaPromptId": { "type": "string", "pattern": "^mp_[a-z0-9][a-z0-9_-]{7,63}$" }, "megaPromptRevision": { "type": "integer", "minimum": 1 }, "mediaType": { "enum": ["image", "video"] }, "authorship": { "$ref": "#/$defs/authorship" }, "provenance": { "$ref": "#/$defs/provenance" }, "policy": { "type": "object", "additionalProperties": false, "required": ["providerNeutral", "unsupportedHandling", "adapterAuditRequired"], "properties": { "providerNeutral": { "const": true }, "unsupportedHandling": { "enum": ["compile_into_positive_prompt", "omit_and_report", "fail_closed"] }, "adapterAuditRequired": { "const": true } } }, "constraints": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["constraintId", "category", "severity", "instruction", "scope", "source"], "properties": { "constraintId": { "type": "string", "pattern": "^neg_[a-z0-9][a-z0-9_-]{4,63}$" }, "category": { "enum": ["product_geometry", "packaging", "logo", "text", "physics", "anatomy", "continuity", "camera_motion", "audio", "ui_artifact", "watermark", "unsupported_claim", "safety", "style_drift", "background_clutter"] }, "severity": { "enum": ["must_not", "avoid"] }, "instruction": { "type": "string", "minLength": 3, "maxLength": 500 }, "scope": { "type": "object", "additionalProperties": false, "required": ["type"], "properties": { "type": { "enum": ["global", "shot"] }, "shotRefs": { "type": "array", "minItems": 1, "uniqueItems": true, "items": { "type": "string", "pattern": "^[a-z][a-z0-9_-]{2,63}$" } } }, "allOf": [{ "if": { "properties": { "type": { "const": "shot" } } }, "then": { "required": ["shotRefs"] } }, { "if": { "properties": { "type": { "const": "global" } } }, "then": { "not": { "required": ["shotRefs"] } } }] }, "source": { "type": "object", "additionalProperties": false, "required": ["type", "ref"], "properties": { "type": { "enum": ["product_lock", "approved_claims", "creative_plan", "quality_policy", "safety_policy"] }, "ref": { "type": "string", "minLength": 1, "maxLength": 200 } } } } } } }, "$defs": { "authorship": { "type": "object", "additionalProperties": false, "required": ["modelFamily", "authoringMode", "authoredAt", "verificationStatus", "invocationRef"], "properties": { "modelFamily": { "enum": ["claude-opus-5.5", "gpt-6.1-sol"] }, "authoringMode": { "enum": ["model_authored", "model_authored_human_edited"] }, "authoredAt": { "type": "string", "format": "date-time" }, "verificationStatus": { "enum": ["actual_invocation_verified", "synthetic_fixture"] }, "invocationRef": { "type": "string", "minLength": 1, "maxLength": 200 }, "humanEditor": { "type": "string", "minLength": 1, "maxLength": 120 } } }, "provenance": { "type": "object", "additionalProperties": false, "required": ["projectId", "sourceSnapshotId", "compilerContract", "providerPayloadPolicy"], "properties": { "projectId": { "type": "string", "pattern": "^[a-z][a-z0-9_-]{2,63}$" }, "sourceSnapshotId": { "type": "string", "pattern": "^snap_[a-z0-9_-]{6,64}$" }, "compilerContract": { "const": "allowlisted-provider-adapter/v1" }, "providerPayloadPolicy": { "const": "compile_known_fields_only" } } } } };
    var schema82 = { "type": "object", "additionalProperties": false, "required": ["modelFamily", "authoringMode", "authoredAt", "verificationStatus", "invocationRef"], "properties": { "modelFamily": { "enum": ["claude-opus-5.5", "gpt-6.1-sol"] }, "authoringMode": { "enum": ["model_authored", "model_authored_human_edited"] }, "authoredAt": { "type": "string", "format": "date-time" }, "verificationStatus": { "enum": ["actual_invocation_verified", "synthetic_fixture"] }, "invocationRef": { "type": "string", "minLength": 1, "maxLength": 200 }, "humanEditor": { "type": "string", "minLength": 1, "maxLength": 120 } } };
    var pattern20 = new RegExp("^np_[a-z0-9][a-z0-9_-]{7,63}$", "u");
    var pattern24 = new RegExp("^neg_[a-z0-9][a-z0-9_-]{4,63}$", "u");
    function validate58(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
      ;
      let vErrors = null;
      let errors = 0;
      const evaluated0 = validate58.evaluated;
      if (evaluated0.dynamicProps) {
        evaluated0.props = void 0;
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = void 0;
      }
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.schemaVersion === void 0) {
          const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schemaVersion" }, message: "must have required property 'schemaVersion'" };
          if (vErrors === null) {
            vErrors = [err0];
          } else {
            vErrors.push(err0);
          }
          errors++;
        }
        if (data.negativePromptId === void 0) {
          const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "negativePromptId" }, message: "must have required property 'negativePromptId'" };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
        }
        if (data.revision === void 0) {
          const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "revision" }, message: "must have required property 'revision'" };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
        if (data.megaPromptId === void 0) {
          const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "megaPromptId" }, message: "must have required property 'megaPromptId'" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        if (data.megaPromptRevision === void 0) {
          const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "megaPromptRevision" }, message: "must have required property 'megaPromptRevision'" };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
        if (data.mediaType === void 0) {
          const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "mediaType" }, message: "must have required property 'mediaType'" };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
        if (data.authorship === void 0) {
          const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "authorship" }, message: "must have required property 'authorship'" };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
        if (data.provenance === void 0) {
          const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "provenance" }, message: "must have required property 'provenance'" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data.policy === void 0) {
          const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "policy" }, message: "must have required property 'policy'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data.constraints === void 0) {
          const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "constraints" }, message: "must have required property 'constraints'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        for (const key0 in data) {
          if (!func15.call(schema81.properties, key0)) {
            const err10 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data.schemaVersion !== void 0) {
          if ("creative-hook-lab.negative-prompt/1.0.0" !== data.schemaVersion) {
            const err11 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: "creative-hook-lab.negative-prompt/1.0.0" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data.negativePromptId !== void 0) {
          let data1 = data.negativePromptId;
          if (typeof data1 === "string") {
            if (!pattern20.test(data1)) {
              const err12 = { instancePath: instancePath + "/negativePromptId", schemaPath: "#/properties/negativePromptId/pattern", keyword: "pattern", params: { pattern: "^np_[a-z0-9][a-z0-9_-]{7,63}$" }, message: 'must match pattern "^np_[a-z0-9][a-z0-9_-]{7,63}$"' };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
          } else {
            const err13 = { instancePath: instancePath + "/negativePromptId", schemaPath: "#/properties/negativePromptId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data.revision !== void 0) {
          let data2 = data.revision;
          if (!(typeof data2 == "number" && (!(data2 % 1) && !isNaN(data2)))) {
            const err14 = { instancePath: instancePath + "/revision", schemaPath: "#/properties/revision/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
          if (typeof data2 == "number") {
            if (data2 < 1 || isNaN(data2)) {
              const err15 = { instancePath: instancePath + "/revision", schemaPath: "#/properties/revision/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
          }
        }
        if (data.megaPromptId !== void 0) {
          let data3 = data.megaPromptId;
          if (typeof data3 === "string") {
            if (!pattern7.test(data3)) {
              const err16 = { instancePath: instancePath + "/megaPromptId", schemaPath: "#/properties/megaPromptId/pattern", keyword: "pattern", params: { pattern: "^mp_[a-z0-9][a-z0-9_-]{7,63}$" }, message: 'must match pattern "^mp_[a-z0-9][a-z0-9_-]{7,63}$"' };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
          } else {
            const err17 = { instancePath: instancePath + "/megaPromptId", schemaPath: "#/properties/megaPromptId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
        if (data.megaPromptRevision !== void 0) {
          let data4 = data.megaPromptRevision;
          if (!(typeof data4 == "number" && (!(data4 % 1) && !isNaN(data4)))) {
            const err18 = { instancePath: instancePath + "/megaPromptRevision", schemaPath: "#/properties/megaPromptRevision/type", keyword: "type", params: { type: "integer" }, message: "must be integer" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
          if (typeof data4 == "number") {
            if (data4 < 1 || isNaN(data4)) {
              const err19 = { instancePath: instancePath + "/megaPromptRevision", schemaPath: "#/properties/megaPromptRevision/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
          }
        }
        if (data.mediaType !== void 0) {
          let data5 = data.mediaType;
          if (!(data5 === "image" || data5 === "video")) {
            const err20 = { instancePath: instancePath + "/mediaType", schemaPath: "#/properties/mediaType/enum", keyword: "enum", params: { allowedValues: schema81.properties.mediaType.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data.authorship !== void 0) {
          let data6 = data.authorship;
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.modelFamily === void 0) {
              const err21 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "modelFamily" }, message: "must have required property 'modelFamily'" };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
            if (data6.authoringMode === void 0) {
              const err22 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "authoringMode" }, message: "must have required property 'authoringMode'" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            if (data6.authoredAt === void 0) {
              const err23 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "authoredAt" }, message: "must have required property 'authoredAt'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data6.verificationStatus === void 0) {
              const err24 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "verificationStatus" }, message: "must have required property 'verificationStatus'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data6.invocationRef === void 0) {
              const err25 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/required", keyword: "required", params: { missingProperty: "invocationRef" }, message: "must have required property 'invocationRef'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            for (const key1 in data6) {
              if (!(key1 === "modelFamily" || key1 === "authoringMode" || key1 === "authoredAt" || key1 === "verificationStatus" || key1 === "invocationRef" || key1 === "humanEditor")) {
                const err26 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data6.modelFamily !== void 0) {
              let data7 = data6.modelFamily;
              if (!(data7 === "claude-opus-5.5" || data7 === "gpt-6.1-sol")) {
                const err27 = { instancePath: instancePath + "/authorship/modelFamily", schemaPath: "#/$defs/authorship/properties/modelFamily/enum", keyword: "enum", params: { allowedValues: schema82.properties.modelFamily.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data6.authoringMode !== void 0) {
              let data8 = data6.authoringMode;
              if (!(data8 === "model_authored" || data8 === "model_authored_human_edited")) {
                const err28 = { instancePath: instancePath + "/authorship/authoringMode", schemaPath: "#/$defs/authorship/properties/authoringMode/enum", keyword: "enum", params: { allowedValues: schema82.properties.authoringMode.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data6.authoredAt !== void 0) {
              let data9 = data6.authoredAt;
              if (typeof data9 === "string") {
                if (!formats0.validate(data9)) {
                  const err29 = { instancePath: instancePath + "/authorship/authoredAt", schemaPath: "#/$defs/authorship/properties/authoredAt/format", keyword: "format", params: { format: "date-time" }, message: 'must match format "date-time"' };
                  if (vErrors === null) {
                    vErrors = [err29];
                  } else {
                    vErrors.push(err29);
                  }
                  errors++;
                }
              } else {
                const err30 = { instancePath: instancePath + "/authorship/authoredAt", schemaPath: "#/$defs/authorship/properties/authoredAt/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data6.verificationStatus !== void 0) {
              let data10 = data6.verificationStatus;
              if (!(data10 === "actual_invocation_verified" || data10 === "synthetic_fixture")) {
                const err31 = { instancePath: instancePath + "/authorship/verificationStatus", schemaPath: "#/$defs/authorship/properties/verificationStatus/enum", keyword: "enum", params: { allowedValues: schema82.properties.verificationStatus.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data6.invocationRef !== void 0) {
              let data11 = data6.invocationRef;
              if (typeof data11 === "string") {
                if (func1(data11) > 200) {
                  const err32 = { instancePath: instancePath + "/authorship/invocationRef", schemaPath: "#/$defs/authorship/properties/invocationRef/maxLength", keyword: "maxLength", params: { limit: 200 }, message: "must NOT have more than 200 characters" };
                  if (vErrors === null) {
                    vErrors = [err32];
                  } else {
                    vErrors.push(err32);
                  }
                  errors++;
                }
                if (func1(data11) < 1) {
                  const err33 = { instancePath: instancePath + "/authorship/invocationRef", schemaPath: "#/$defs/authorship/properties/invocationRef/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err33];
                  } else {
                    vErrors.push(err33);
                  }
                  errors++;
                }
              } else {
                const err34 = { instancePath: instancePath + "/authorship/invocationRef", schemaPath: "#/$defs/authorship/properties/invocationRef/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err34];
                } else {
                  vErrors.push(err34);
                }
                errors++;
              }
            }
            if (data6.humanEditor !== void 0) {
              let data12 = data6.humanEditor;
              if (typeof data12 === "string") {
                if (func1(data12) > 120) {
                  const err35 = { instancePath: instancePath + "/authorship/humanEditor", schemaPath: "#/$defs/authorship/properties/humanEditor/maxLength", keyword: "maxLength", params: { limit: 120 }, message: "must NOT have more than 120 characters" };
                  if (vErrors === null) {
                    vErrors = [err35];
                  } else {
                    vErrors.push(err35);
                  }
                  errors++;
                }
                if (func1(data12) < 1) {
                  const err36 = { instancePath: instancePath + "/authorship/humanEditor", schemaPath: "#/$defs/authorship/properties/humanEditor/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                  if (vErrors === null) {
                    vErrors = [err36];
                  } else {
                    vErrors.push(err36);
                  }
                  errors++;
                }
              } else {
                const err37 = { instancePath: instancePath + "/authorship/humanEditor", schemaPath: "#/$defs/authorship/properties/humanEditor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err37];
                } else {
                  vErrors.push(err37);
                }
                errors++;
              }
            }
          } else {
            const err38 = { instancePath: instancePath + "/authorship", schemaPath: "#/$defs/authorship/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err38];
            } else {
              vErrors.push(err38);
            }
            errors++;
          }
        }
        if (data.provenance !== void 0) {
          let data13 = data.provenance;
          if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
            if (data13.projectId === void 0) {
              const err39 = { instancePath: instancePath + "/provenance", schemaPath: "#/$defs/provenance/required", keyword: "required", params: { missingProperty: "projectId" }, message: "must have required property 'projectId'" };
              if (vErrors === null) {
                vErrors = [err39];
              } else {
                vErrors.push(err39);
              }
              errors++;
            }
            if (data13.sourceSnapshotId === void 0) {
              const err40 = { instancePath: instancePath + "/provenance", schemaPath: "#/$defs/provenance/required", keyword: "required", params: { missingProperty: "sourceSnapshotId" }, message: "must have required property 'sourceSnapshotId'" };
              if (vErrors === null) {
                vErrors = [err40];
              } else {
                vErrors.push(err40);
              }
              errors++;
            }
            if (data13.compilerContract === void 0) {
              const err41 = { instancePath: instancePath + "/provenance", schemaPath: "#/$defs/provenance/required", keyword: "required", params: { missingProperty: "compilerContract" }, message: "must have required property 'compilerContract'" };
              if (vErrors === null) {
                vErrors = [err41];
              } else {
                vErrors.push(err41);
              }
              errors++;
            }
            if (data13.providerPayloadPolicy === void 0) {
              const err42 = { instancePath: instancePath + "/provenance", schemaPath: "#/$defs/provenance/required", keyword: "required", params: { missingProperty: "providerPayloadPolicy" }, message: "must have required property 'providerPayloadPolicy'" };
              if (vErrors === null) {
                vErrors = [err42];
              } else {
                vErrors.push(err42);
              }
              errors++;
            }
            for (const key2 in data13) {
              if (!(key2 === "projectId" || key2 === "sourceSnapshotId" || key2 === "compilerContract" || key2 === "providerPayloadPolicy")) {
                const err43 = { instancePath: instancePath + "/provenance", schemaPath: "#/$defs/provenance/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err43];
                } else {
                  vErrors.push(err43);
                }
                errors++;
              }
            }
            if (data13.projectId !== void 0) {
              let data14 = data13.projectId;
              if (typeof data14 === "string") {
                if (!pattern4.test(data14)) {
                  const err44 = { instancePath: instancePath + "/provenance/projectId", schemaPath: "#/$defs/provenance/properties/projectId/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
                  if (vErrors === null) {
                    vErrors = [err44];
                  } else {
                    vErrors.push(err44);
                  }
                  errors++;
                }
              } else {
                const err45 = { instancePath: instancePath + "/provenance/projectId", schemaPath: "#/$defs/provenance/properties/projectId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err45];
                } else {
                  vErrors.push(err45);
                }
                errors++;
              }
            }
            if (data13.sourceSnapshotId !== void 0) {
              let data15 = data13.sourceSnapshotId;
              if (typeof data15 === "string") {
                if (!pattern9.test(data15)) {
                  const err46 = { instancePath: instancePath + "/provenance/sourceSnapshotId", schemaPath: "#/$defs/provenance/properties/sourceSnapshotId/pattern", keyword: "pattern", params: { pattern: "^snap_[a-z0-9_-]{6,64}$" }, message: 'must match pattern "^snap_[a-z0-9_-]{6,64}$"' };
                  if (vErrors === null) {
                    vErrors = [err46];
                  } else {
                    vErrors.push(err46);
                  }
                  errors++;
                }
              } else {
                const err47 = { instancePath: instancePath + "/provenance/sourceSnapshotId", schemaPath: "#/$defs/provenance/properties/sourceSnapshotId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err47];
                } else {
                  vErrors.push(err47);
                }
                errors++;
              }
            }
            if (data13.compilerContract !== void 0) {
              if ("allowlisted-provider-adapter/v1" !== data13.compilerContract) {
                const err48 = { instancePath: instancePath + "/provenance/compilerContract", schemaPath: "#/$defs/provenance/properties/compilerContract/const", keyword: "const", params: { allowedValue: "allowlisted-provider-adapter/v1" }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err48];
                } else {
                  vErrors.push(err48);
                }
                errors++;
              }
            }
            if (data13.providerPayloadPolicy !== void 0) {
              if ("compile_known_fields_only" !== data13.providerPayloadPolicy) {
                const err49 = { instancePath: instancePath + "/provenance/providerPayloadPolicy", schemaPath: "#/$defs/provenance/properties/providerPayloadPolicy/const", keyword: "const", params: { allowedValue: "compile_known_fields_only" }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err49];
                } else {
                  vErrors.push(err49);
                }
                errors++;
              }
            }
          } else {
            const err50 = { instancePath: instancePath + "/provenance", schemaPath: "#/$defs/provenance/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err50];
            } else {
              vErrors.push(err50);
            }
            errors++;
          }
        }
        if (data.policy !== void 0) {
          let data18 = data.policy;
          if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
            if (data18.providerNeutral === void 0) {
              const err51 = { instancePath: instancePath + "/policy", schemaPath: "#/properties/policy/required", keyword: "required", params: { missingProperty: "providerNeutral" }, message: "must have required property 'providerNeutral'" };
              if (vErrors === null) {
                vErrors = [err51];
              } else {
                vErrors.push(err51);
              }
              errors++;
            }
            if (data18.unsupportedHandling === void 0) {
              const err52 = { instancePath: instancePath + "/policy", schemaPath: "#/properties/policy/required", keyword: "required", params: { missingProperty: "unsupportedHandling" }, message: "must have required property 'unsupportedHandling'" };
              if (vErrors === null) {
                vErrors = [err52];
              } else {
                vErrors.push(err52);
              }
              errors++;
            }
            if (data18.adapterAuditRequired === void 0) {
              const err53 = { instancePath: instancePath + "/policy", schemaPath: "#/properties/policy/required", keyword: "required", params: { missingProperty: "adapterAuditRequired" }, message: "must have required property 'adapterAuditRequired'" };
              if (vErrors === null) {
                vErrors = [err53];
              } else {
                vErrors.push(err53);
              }
              errors++;
            }
            for (const key3 in data18) {
              if (!(key3 === "providerNeutral" || key3 === "unsupportedHandling" || key3 === "adapterAuditRequired")) {
                const err54 = { instancePath: instancePath + "/policy", schemaPath: "#/properties/policy/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err54];
                } else {
                  vErrors.push(err54);
                }
                errors++;
              }
            }
            if (data18.providerNeutral !== void 0) {
              if (true !== data18.providerNeutral) {
                const err55 = { instancePath: instancePath + "/policy/providerNeutral", schemaPath: "#/properties/policy/properties/providerNeutral/const", keyword: "const", params: { allowedValue: true }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err55];
                } else {
                  vErrors.push(err55);
                }
                errors++;
              }
            }
            if (data18.unsupportedHandling !== void 0) {
              let data20 = data18.unsupportedHandling;
              if (!(data20 === "compile_into_positive_prompt" || data20 === "omit_and_report" || data20 === "fail_closed")) {
                const err56 = { instancePath: instancePath + "/policy/unsupportedHandling", schemaPath: "#/properties/policy/properties/unsupportedHandling/enum", keyword: "enum", params: { allowedValues: schema81.properties.policy.properties.unsupportedHandling.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err56];
                } else {
                  vErrors.push(err56);
                }
                errors++;
              }
            }
            if (data18.adapterAuditRequired !== void 0) {
              if (true !== data18.adapterAuditRequired) {
                const err57 = { instancePath: instancePath + "/policy/adapterAuditRequired", schemaPath: "#/properties/policy/properties/adapterAuditRequired/const", keyword: "const", params: { allowedValue: true }, message: "must be equal to constant" };
                if (vErrors === null) {
                  vErrors = [err57];
                } else {
                  vErrors.push(err57);
                }
                errors++;
              }
            }
          } else {
            const err58 = { instancePath: instancePath + "/policy", schemaPath: "#/properties/policy/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err58];
            } else {
              vErrors.push(err58);
            }
            errors++;
          }
        }
        if (data.constraints !== void 0) {
          let data22 = data.constraints;
          if (Array.isArray(data22)) {
            if (data22.length < 1) {
              const err59 = { instancePath: instancePath + "/constraints", schemaPath: "#/properties/constraints/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
              if (vErrors === null) {
                vErrors = [err59];
              } else {
                vErrors.push(err59);
              }
              errors++;
            }
            const len0 = data22.length;
            for (let i0 = 0; i0 < len0; i0++) {
              let data23 = data22[i0];
              if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                if (data23.constraintId === void 0) {
                  const err60 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/required", keyword: "required", params: { missingProperty: "constraintId" }, message: "must have required property 'constraintId'" };
                  if (vErrors === null) {
                    vErrors = [err60];
                  } else {
                    vErrors.push(err60);
                  }
                  errors++;
                }
                if (data23.category === void 0) {
                  const err61 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/required", keyword: "required", params: { missingProperty: "category" }, message: "must have required property 'category'" };
                  if (vErrors === null) {
                    vErrors = [err61];
                  } else {
                    vErrors.push(err61);
                  }
                  errors++;
                }
                if (data23.severity === void 0) {
                  const err62 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/required", keyword: "required", params: { missingProperty: "severity" }, message: "must have required property 'severity'" };
                  if (vErrors === null) {
                    vErrors = [err62];
                  } else {
                    vErrors.push(err62);
                  }
                  errors++;
                }
                if (data23.instruction === void 0) {
                  const err63 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/required", keyword: "required", params: { missingProperty: "instruction" }, message: "must have required property 'instruction'" };
                  if (vErrors === null) {
                    vErrors = [err63];
                  } else {
                    vErrors.push(err63);
                  }
                  errors++;
                }
                if (data23.scope === void 0) {
                  const err64 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/required", keyword: "required", params: { missingProperty: "scope" }, message: "must have required property 'scope'" };
                  if (vErrors === null) {
                    vErrors = [err64];
                  } else {
                    vErrors.push(err64);
                  }
                  errors++;
                }
                if (data23.source === void 0) {
                  const err65 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
                  if (vErrors === null) {
                    vErrors = [err65];
                  } else {
                    vErrors.push(err65);
                  }
                  errors++;
                }
                for (const key4 in data23) {
                  if (!(key4 === "constraintId" || key4 === "category" || key4 === "severity" || key4 === "instruction" || key4 === "scope" || key4 === "source")) {
                    const err66 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
                    if (vErrors === null) {
                      vErrors = [err66];
                    } else {
                      vErrors.push(err66);
                    }
                    errors++;
                  }
                }
                if (data23.constraintId !== void 0) {
                  let data24 = data23.constraintId;
                  if (typeof data24 === "string") {
                    if (!pattern24.test(data24)) {
                      const err67 = { instancePath: instancePath + "/constraints/" + i0 + "/constraintId", schemaPath: "#/properties/constraints/items/properties/constraintId/pattern", keyword: "pattern", params: { pattern: "^neg_[a-z0-9][a-z0-9_-]{4,63}$" }, message: 'must match pattern "^neg_[a-z0-9][a-z0-9_-]{4,63}$"' };
                      if (vErrors === null) {
                        vErrors = [err67];
                      } else {
                        vErrors.push(err67);
                      }
                      errors++;
                    }
                  } else {
                    const err68 = { instancePath: instancePath + "/constraints/" + i0 + "/constraintId", schemaPath: "#/properties/constraints/items/properties/constraintId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err68];
                    } else {
                      vErrors.push(err68);
                    }
                    errors++;
                  }
                }
                if (data23.category !== void 0) {
                  let data25 = data23.category;
                  if (!(data25 === "product_geometry" || data25 === "packaging" || data25 === "logo" || data25 === "text" || data25 === "physics" || data25 === "anatomy" || data25 === "continuity" || data25 === "camera_motion" || data25 === "audio" || data25 === "ui_artifact" || data25 === "watermark" || data25 === "unsupported_claim" || data25 === "safety" || data25 === "style_drift" || data25 === "background_clutter")) {
                    const err69 = { instancePath: instancePath + "/constraints/" + i0 + "/category", schemaPath: "#/properties/constraints/items/properties/category/enum", keyword: "enum", params: { allowedValues: schema81.properties.constraints.items.properties.category.enum }, message: "must be equal to one of the allowed values" };
                    if (vErrors === null) {
                      vErrors = [err69];
                    } else {
                      vErrors.push(err69);
                    }
                    errors++;
                  }
                }
                if (data23.severity !== void 0) {
                  let data26 = data23.severity;
                  if (!(data26 === "must_not" || data26 === "avoid")) {
                    const err70 = { instancePath: instancePath + "/constraints/" + i0 + "/severity", schemaPath: "#/properties/constraints/items/properties/severity/enum", keyword: "enum", params: { allowedValues: schema81.properties.constraints.items.properties.severity.enum }, message: "must be equal to one of the allowed values" };
                    if (vErrors === null) {
                      vErrors = [err70];
                    } else {
                      vErrors.push(err70);
                    }
                    errors++;
                  }
                }
                if (data23.instruction !== void 0) {
                  let data27 = data23.instruction;
                  if (typeof data27 === "string") {
                    if (func1(data27) > 500) {
                      const err71 = { instancePath: instancePath + "/constraints/" + i0 + "/instruction", schemaPath: "#/properties/constraints/items/properties/instruction/maxLength", keyword: "maxLength", params: { limit: 500 }, message: "must NOT have more than 500 characters" };
                      if (vErrors === null) {
                        vErrors = [err71];
                      } else {
                        vErrors.push(err71);
                      }
                      errors++;
                    }
                    if (func1(data27) < 3) {
                      const err72 = { instancePath: instancePath + "/constraints/" + i0 + "/instruction", schemaPath: "#/properties/constraints/items/properties/instruction/minLength", keyword: "minLength", params: { limit: 3 }, message: "must NOT have fewer than 3 characters" };
                      if (vErrors === null) {
                        vErrors = [err72];
                      } else {
                        vErrors.push(err72);
                      }
                      errors++;
                    }
                  } else {
                    const err73 = { instancePath: instancePath + "/constraints/" + i0 + "/instruction", schemaPath: "#/properties/constraints/items/properties/instruction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err73];
                    } else {
                      vErrors.push(err73);
                    }
                    errors++;
                  }
                }
                if (data23.scope !== void 0) {
                  let data28 = data23.scope;
                  const _errs55 = errors;
                  let valid10 = true;
                  const _errs56 = errors;
                  if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                    if (data28.type !== void 0) {
                      if ("shot" !== data28.type) {
                        const err74 = {};
                        if (vErrors === null) {
                          vErrors = [err74];
                        } else {
                          vErrors.push(err74);
                        }
                        errors++;
                      }
                    }
                  }
                  var _valid0 = _errs56 === errors;
                  errors = _errs55;
                  if (vErrors !== null) {
                    if (_errs55) {
                      vErrors.length = _errs55;
                    } else {
                      vErrors = null;
                    }
                  }
                  if (_valid0) {
                    const _errs58 = errors;
                    if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                      if (data28.shotRefs === void 0) {
                        const err75 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/allOf/0/then/required", keyword: "required", params: { missingProperty: "shotRefs" }, message: "must have required property 'shotRefs'" };
                        if (vErrors === null) {
                          vErrors = [err75];
                        } else {
                          vErrors.push(err75);
                        }
                        errors++;
                      }
                    }
                    var _valid0 = _errs58 === errors;
                    valid10 = _valid0;
                  }
                  if (!valid10) {
                    const err76 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                    if (vErrors === null) {
                      vErrors = [err76];
                    } else {
                      vErrors.push(err76);
                    }
                    errors++;
                  }
                  const _errs60 = errors;
                  let valid12 = true;
                  const _errs61 = errors;
                  if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                    if (data28.type !== void 0) {
                      if ("global" !== data28.type) {
                        const err77 = {};
                        if (vErrors === null) {
                          vErrors = [err77];
                        } else {
                          vErrors.push(err77);
                        }
                        errors++;
                      }
                    }
                  }
                  var _valid1 = _errs61 === errors;
                  errors = _errs60;
                  if (vErrors !== null) {
                    if (_errs60) {
                      vErrors.length = _errs60;
                    } else {
                      vErrors = null;
                    }
                  }
                  if (_valid1) {
                    const _errs63 = errors;
                    const _errs64 = errors;
                    const _errs65 = errors;
                    if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                      let missing0;
                      if (data28.shotRefs === void 0 && (missing0 = "shotRefs")) {
                        const err78 = {};
                        if (vErrors === null) {
                          vErrors = [err78];
                        } else {
                          vErrors.push(err78);
                        }
                        errors++;
                      }
                    }
                    var valid14 = _errs65 === errors;
                    if (valid14) {
                      const err79 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/allOf/1/then/not", keyword: "not", params: {}, message: "must NOT be valid" };
                      if (vErrors === null) {
                        vErrors = [err79];
                      } else {
                        vErrors.push(err79);
                      }
                      errors++;
                    } else {
                      errors = _errs64;
                      if (vErrors !== null) {
                        if (_errs64) {
                          vErrors.length = _errs64;
                        } else {
                          vErrors = null;
                        }
                      }
                    }
                    var _valid1 = _errs63 === errors;
                    valid12 = _valid1;
                  }
                  if (!valid12) {
                    const err80 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                    if (vErrors === null) {
                      vErrors = [err80];
                    } else {
                      vErrors.push(err80);
                    }
                    errors++;
                  }
                  if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                    if (data28.type === void 0) {
                      const err81 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
                      if (vErrors === null) {
                        vErrors = [err81];
                      } else {
                        vErrors.push(err81);
                      }
                      errors++;
                    }
                    for (const key5 in data28) {
                      if (!(key5 === "type" || key5 === "shotRefs")) {
                        const err82 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key5 }, message: "must NOT have additional properties" };
                        if (vErrors === null) {
                          vErrors = [err82];
                        } else {
                          vErrors.push(err82);
                        }
                        errors++;
                      }
                    }
                    if (data28.type !== void 0) {
                      let data31 = data28.type;
                      if (!(data31 === "global" || data31 === "shot")) {
                        const err83 = { instancePath: instancePath + "/constraints/" + i0 + "/scope/type", schemaPath: "#/properties/constraints/items/properties/scope/properties/type/enum", keyword: "enum", params: { allowedValues: schema81.properties.constraints.items.properties.scope.properties.type.enum }, message: "must be equal to one of the allowed values" };
                        if (vErrors === null) {
                          vErrors = [err83];
                        } else {
                          vErrors.push(err83);
                        }
                        errors++;
                      }
                    }
                    if (data28.shotRefs !== void 0) {
                      let data32 = data28.shotRefs;
                      if (Array.isArray(data32)) {
                        if (data32.length < 1) {
                          const err84 = { instancePath: instancePath + "/constraints/" + i0 + "/scope/shotRefs", schemaPath: "#/properties/constraints/items/properties/scope/properties/shotRefs/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" };
                          if (vErrors === null) {
                            vErrors = [err84];
                          } else {
                            vErrors.push(err84);
                          }
                          errors++;
                        }
                        const len1 = data32.length;
                        for (let i1 = 0; i1 < len1; i1++) {
                          let data33 = data32[i1];
                          if (typeof data33 === "string") {
                            if (!pattern4.test(data33)) {
                              const err85 = { instancePath: instancePath + "/constraints/" + i0 + "/scope/shotRefs/" + i1, schemaPath: "#/properties/constraints/items/properties/scope/properties/shotRefs/items/pattern", keyword: "pattern", params: { pattern: "^[a-z][a-z0-9_-]{2,63}$" }, message: 'must match pattern "^[a-z][a-z0-9_-]{2,63}$"' };
                              if (vErrors === null) {
                                vErrors = [err85];
                              } else {
                                vErrors.push(err85);
                              }
                              errors++;
                            }
                          } else {
                            const err86 = { instancePath: instancePath + "/constraints/" + i0 + "/scope/shotRefs/" + i1, schemaPath: "#/properties/constraints/items/properties/scope/properties/shotRefs/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                            if (vErrors === null) {
                              vErrors = [err86];
                            } else {
                              vErrors.push(err86);
                            }
                            errors++;
                          }
                        }
                        let i2 = data32.length;
                        let j0;
                        if (i2 > 1) {
                          const indices0 = {};
                          for (; i2--; ) {
                            let item0 = data32[i2];
                            if (typeof item0 !== "string") {
                              continue;
                            }
                            if (typeof indices0[item0] == "number") {
                              j0 = indices0[item0];
                              const err87 = { instancePath: instancePath + "/constraints/" + i0 + "/scope/shotRefs", schemaPath: "#/properties/constraints/items/properties/scope/properties/shotRefs/uniqueItems", keyword: "uniqueItems", params: { i: i2, j: j0 }, message: "must NOT have duplicate items (items ## " + j0 + " and " + i2 + " are identical)" };
                              if (vErrors === null) {
                                vErrors = [err87];
                              } else {
                                vErrors.push(err87);
                              }
                              errors++;
                              break;
                            }
                            indices0[item0] = i2;
                          }
                        }
                      } else {
                        const err88 = { instancePath: instancePath + "/constraints/" + i0 + "/scope/shotRefs", schemaPath: "#/properties/constraints/items/properties/scope/properties/shotRefs/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                        if (vErrors === null) {
                          vErrors = [err88];
                        } else {
                          vErrors.push(err88);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err89 = { instancePath: instancePath + "/constraints/" + i0 + "/scope", schemaPath: "#/properties/constraints/items/properties/scope/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                    if (vErrors === null) {
                      vErrors = [err89];
                    } else {
                      vErrors.push(err89);
                    }
                    errors++;
                  }
                }
                if (data23.source !== void 0) {
                  let data34 = data23.source;
                  if (data34 && typeof data34 == "object" && !Array.isArray(data34)) {
                    if (data34.type === void 0) {
                      const err90 = { instancePath: instancePath + "/constraints/" + i0 + "/source", schemaPath: "#/properties/constraints/items/properties/source/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
                      if (vErrors === null) {
                        vErrors = [err90];
                      } else {
                        vErrors.push(err90);
                      }
                      errors++;
                    }
                    if (data34.ref === void 0) {
                      const err91 = { instancePath: instancePath + "/constraints/" + i0 + "/source", schemaPath: "#/properties/constraints/items/properties/source/required", keyword: "required", params: { missingProperty: "ref" }, message: "must have required property 'ref'" };
                      if (vErrors === null) {
                        vErrors = [err91];
                      } else {
                        vErrors.push(err91);
                      }
                      errors++;
                    }
                    for (const key6 in data34) {
                      if (!(key6 === "type" || key6 === "ref")) {
                        const err92 = { instancePath: instancePath + "/constraints/" + i0 + "/source", schemaPath: "#/properties/constraints/items/properties/source/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key6 }, message: "must NOT have additional properties" };
                        if (vErrors === null) {
                          vErrors = [err92];
                        } else {
                          vErrors.push(err92);
                        }
                        errors++;
                      }
                    }
                    if (data34.type !== void 0) {
                      let data35 = data34.type;
                      if (!(data35 === "product_lock" || data35 === "approved_claims" || data35 === "creative_plan" || data35 === "quality_policy" || data35 === "safety_policy")) {
                        const err93 = { instancePath: instancePath + "/constraints/" + i0 + "/source/type", schemaPath: "#/properties/constraints/items/properties/source/properties/type/enum", keyword: "enum", params: { allowedValues: schema81.properties.constraints.items.properties.source.properties.type.enum }, message: "must be equal to one of the allowed values" };
                        if (vErrors === null) {
                          vErrors = [err93];
                        } else {
                          vErrors.push(err93);
                        }
                        errors++;
                      }
                    }
                    if (data34.ref !== void 0) {
                      let data36 = data34.ref;
                      if (typeof data36 === "string") {
                        if (func1(data36) > 200) {
                          const err94 = { instancePath: instancePath + "/constraints/" + i0 + "/source/ref", schemaPath: "#/properties/constraints/items/properties/source/properties/ref/maxLength", keyword: "maxLength", params: { limit: 200 }, message: "must NOT have more than 200 characters" };
                          if (vErrors === null) {
                            vErrors = [err94];
                          } else {
                            vErrors.push(err94);
                          }
                          errors++;
                        }
                        if (func1(data36) < 1) {
                          const err95 = { instancePath: instancePath + "/constraints/" + i0 + "/source/ref", schemaPath: "#/properties/constraints/items/properties/source/properties/ref/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" };
                          if (vErrors === null) {
                            vErrors = [err95];
                          } else {
                            vErrors.push(err95);
                          }
                          errors++;
                        }
                      } else {
                        const err96 = { instancePath: instancePath + "/constraints/" + i0 + "/source/ref", schemaPath: "#/properties/constraints/items/properties/source/properties/ref/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err96];
                        } else {
                          vErrors.push(err96);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err97 = { instancePath: instancePath + "/constraints/" + i0 + "/source", schemaPath: "#/properties/constraints/items/properties/source/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                    if (vErrors === null) {
                      vErrors = [err97];
                    } else {
                      vErrors.push(err97);
                    }
                    errors++;
                  }
                }
              } else {
                const err98 = { instancePath: instancePath + "/constraints/" + i0, schemaPath: "#/properties/constraints/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                if (vErrors === null) {
                  vErrors = [err98];
                } else {
                  vErrors.push(err98);
                }
                errors++;
              }
            }
          } else {
            const err99 = { instancePath: instancePath + "/constraints", schemaPath: "#/properties/constraints/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err99];
            } else {
              vErrors.push(err99);
            }
            errors++;
          }
        }
      } else {
        const err100 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err100];
        } else {
          vErrors.push(err100);
        }
        errors++;
      }
      validate58.errors = vErrors;
      return errors === 0;
    }
    validate58.evaluated = { "props": true, "dynamicProps": false, "dynamicItems": false };
  }
});
export default require_prompt_validators();
