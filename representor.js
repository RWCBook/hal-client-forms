/*******************************************************
 * TPS - Task Processing Service
 * representation router (server)
 * May 2015
 * Mike Amundsen (@mamund)
 * Soundtrack : Complete Collection : B.B. King (2008)
 *******************************************************/

// handles internal representation routing (based on conneg)

// load representors
//var html = require('./representors/html.js');
var json = require('./representors/json.js');
var haljson = require('./representors/haljson.js');
var wstljson = require('./representors/wstljson.js');

var defaultFormat = "application/vnd.hal+json";

module.exports = main;

function main(object, mimeType, root) {
  var doc;

  // clueless? assume JSON
  if (!mimeType) {
    mimeType = defaultFormat;
  }

  // dispatch to requested representor
  switch (mimeType.toLowerCase()) {
    case "application/vnd.wstl+json":
      doc = wstljson(object, root);
      break;
    case "application/json":
      doc = json(object, root);
      break;
    case "application/vnd.hal+json":
      doc = haljson(object, root);
      break;
    default:
      doc = haljson(object, root);
      break;
  }

  return doc;
}

// EOF

