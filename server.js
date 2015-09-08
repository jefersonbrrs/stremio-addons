var _ = require("lodash");
var url = require("url");
var needle = require("needle");

var SESSION_LIVE = 2*60*60*1000; // 2 hrs

function Server(methods, options, manifest)
{	
	options = _.extend({ 
		allow: [ module.parent.CENTRAL ], // default stremio central
		secret: "8417fe936f0374fbd16a699668e8f3c4aa405d9f" // default secret for testing add-ons
	}, options || { });

	Object.keys(methods).forEach(function(key) {
		if (typeof(methods[key]) != "function") throw Error(key+" should be a function");
	});

	// Introspect the addon
	function meta(cb) {
		cb(null, {
			methods: Object.keys(methods),
			manifest: _.extend({ methods: Object.keys(methods) }, manifest || {})
		});
	};

	var sessions = { };
	function checkSession(auth, cb) {
		if (options.allow && options.allow.indexOf(auth[0])==-1) return cb({ message: "not allowed to auth via that server", code: 2 });

		if (sessions[auth[1]]) return cb(null, sessions[auth[1]]);

		needle.get(auth[0]+"/stremio/service/"+options.secret+"/"+encodeURIComponent(auth[1]), function(err, resp) {
			if (err) return cb({ message: "failed to connect to center", code: 5 });
			if (resp.statusCode==200) {
				sessions[auth[1]] = resp.body;
				setTimeout(function() { delete sessions[auth[1]] }, SESSION_LIVE);
				return cb(null, resp.body);
			};

			if (!resp.body.message) console.error("auth server returned",resp.body);
			return cb(resp.body.message ? resp.body : { message: "unknown error reaching auth server", code: 8 }); // error
		})
	};

	this.middleware = function(req, res, next) {
		// Only serves stremio endpoint - currently /stremio/v1
		var parsed = url.parse(req.url);
		if (parsed.pathname != module.parent.STREMIO_PATH) return next(); 
		
		if (req.method === "OPTIONS") {
			var headers = {};
			headers["Access-Control-Allow-Origin"] = "*";
			headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
			headers["Access-Control-Allow-Credentials"] = false;
			headers["Access-Control-Max-Age"] = "86400"; // 24 hours
			headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
			res.writeHead(200, headers);
			res.end();
			return;
		};	
		if (req.method == "GET") { // unsupported by JSON-RPC, it uses post
			res.writeHead(301, { "Location": req.url.replace("http://", "stremio://") });
			res.end();
			return;
		}
		
		if (req.method == "POST") return serveRPC(req, res, function(method, params, cb) {
			if (method == "meta") return meta(cb);
			if (! methods[method]) return cb({ message: "method not supported", code: -32601 }, null);

			var auth = params[0], args = params[1];
			if (!(auth && auth[1]) && methods[method].noauth) return methods[method](args, cb, { noauth: true }); // the function is allowed without auth
			if (! auth) return cb({ message: "auth not specified", code: 1 });
			
			checkSession(auth, function(err, session) {
				if (err && methods[method].noauth) return methods[method](args, cb, { noauth: true }); // the function is allowed without auth
				if (err) return callback(err);
				methods[method](args, cb, session);
			});
		});

		res.writeHead(405); // method not allowed
		res.end();
	};

	function serveRPC(req, res, handle) {
		if (! req.headers["content-type"].match("^application/json")) return res.writeHead(415); // unsupported media type
		res.setHeader("Access-Control-Allow-Origin", "*");
		
		var b = "";
		req.setEncoding("utf8");
		req.on("data", function(buf) { b+=buf });
		req.on("error", function() { res.writeHead(400); res.end() });
		req.on("end", function() {
			var respond = function(response) {
				res.setHeader("Content-Type", "application/json");
				res.setHeader("Content-Length", Buffer.byteLength(response, "utf8"));
				res.end(response);
			};

			var body;
			try { body = JSON.parse(b) } catch(e) { return respond({ error: { code: -32700, message: "parse error" } }) }

			handle(body.method, body.params, function(err, result) {
				var respBody = { jsonrpc: "2.0", id: body.id };
				if (err) respBody.error = { message: err.message, code: err.code || -32603 };
				else respBody.result = result;
				respond(JSON.stringify(respBody));
			});
		});
	};
};

module.exports = Server;
