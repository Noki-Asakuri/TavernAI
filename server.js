var express = require("express");
var app = express();
var fs = require("fs");
const readline = require("readline");
const open = require("open");
const uuid = require("uuid");
var rimraf = require("rimraf");
const multer = require("multer");
const https = require("https");
const http = require("http");

//const PNG = require('pngjs').PNG;
const extract = require("png-chunks-extract");
const encode = require("png-chunks-encode");
const PNGtext = require("png-chunk-text");
const ExifReader = require("exifreader");

const url = require("url");

const sharp = require("sharp");
sharp.cache(false);

const path = require("path");

const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const ipaddr = require("ipaddr.js");
const json5 = require("json5");
var sanitize_filename = require("sanitize-filename");

const { TextEncoder, TextDecoder } = require("util");
const utf8Encode = new TextEncoder();
const utf8Decode = new TextDecoder("utf-8", { ignoreBOM: true });

const config = require(path.join(process.cwd(), "./config.conf"));
const server_port = config.port;
const whitelist = config.whitelist;
const whitelistMode = config.whitelistMode;
let listenIp = config.listenIp || "127.0.0.1";

if (!whitelistMode || whitelist.length > 1) {
	listenIp = "0.0.0.0";
}

const autorun = config.autorun;
const characterFormat = config.characterFormat;
const charaCloudMode = config.charaCloudMode;
const charaCloudServer = config.charaCloudServer;
const connectionTimeoutMS = config.connectionTimeoutMS;
const getStatusInterval = config.getStatusInterval;
const csrf_token = config.csrf_token;

global.BETA_KEY = undefined;

var Client = require("node-rest-client").Client;
var client = new Client();

var api_server = ""; //"http://127.0.0.1:5000";
//var server_port = 8000;

const api_novelai = "https://api.novelai.net";
const api_openai = "https://api.openai.com/v1";
const api_horde = "https://stablehorde.net/api";

const { encode: encodeGPT } = require("gpt-tokenizer/cjs/model/gpt-3.5-turbo");

var hordeActive = false;
var hordeQueue;
var hordeData = {};
var hordeError = null;
var hordeTicker = 0;

var response_get_story;
var response_generate;
var response_generate_novel;
var response_generate_openai;
var request_promt;
var response_promt;
var response_characloud_loadcard;
var characters = {};
var character_i = 0;
var response_create;
var response_edit;
var response_dw_bg;
var response_getstatus;
var response_getstatus_novel;
var response_getstatus_openai;
var response_getlastversion;
var api_key_novel;
var api_key_openai;
var api_url_openai;

var is_colab = false;
var charactersPath = "public/characters/";
var worldPath = "public/worlds/";
var chatsPath = "public/chats/";
var UserAvatarsPath = "public/User Avatars/";
var roomsPath = "public/rooms/";
if (is_colab && process.env.googledrive == 2) {
	charactersPath = "/content/drive/MyDrive/TavernAI/characters/";
	chatsPath = "/content/drive/MyDrive/TavernAI/chats/";
	UserAvatarsPath = "/content/drive/MyDrive/TavernAI/User Avatars/";
}
const jsonParser = express.json({ limit: "100mb" });
const urlencodedParser = express.urlencoded({ extended: true, limit: "100mb" });

// CSRF Protection //
const doubleCsrf = require("csrf-csrf").doubleCsrf;

const CSRF_SECRET = crypto.randomBytes(8).toString("hex");
const COOKIES_SECRET = crypto.randomBytes(8).toString("hex");

const { invalidCsrfTokenError, generateToken, doubleCsrfProtection } = doubleCsrf({
	getSecret: () => CSRF_SECRET,
	cookieName: "X-CSRF-Token",
	cookieOptions: {
		httpOnly: true,
		sameSite: "strict",
		secure: false,
	},
	size: 64,
	getTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

if (listenIp && !config.whitelistMode && !config.basicAuthMode) {
	console.error(
		"Your TavernAI is currently unsecurely open to the public. Enable whitelisting or basic authentication to continue.",
	);
	process.exit(1);
}

const unauthorizedResponse = (res) => {
	res.set("WWW-Authenticate", 'Basic realm="TavernAI", charset="UTF-8"');
	return res.status(401).send("Authentication required");
};
/**
 * @author Cohee1207 <https://github.com/SillyTavern/SillyTavern>
 */
if (listenIp && config.basicAuthMode)
	app.use((req, res, next) => {
		const authHeader = req.headers.authorization;

		if (!authHeader) {
			return unauthorizedResponse(res);
		}

		const [scheme, credentials] = authHeader.split(" ");

		if (scheme !== "Basic" || !credentials) {
			return unauthorizedResponse(res);
		}

		const [username, password] = Buffer.from(credentials, "base64").toString("utf8").split(":");

		if (
			username === config.basicAuthUser.username &&
			password === config.basicAuthUser.password
		) {
			return next();
		} else {
			return unauthorizedResponse(res);
		}
	});

app.get("/csrf-token", (req, res) => {
	res.json({
		token: generateToken(res, req),
	});
});

app.get("/timeout", (req, res) => {
	res.json({
		timeout: connectionTimeoutMS,
		getStatusInterval: getStatusInterval,
	});
});

if (csrf_token && process.env.NODE_ENV !== "development") {
	app.use((req, res, next) => cookieParser(COOKIES_SECRET)(req, res, next));
	app.use(doubleCsrfProtection);
}

// CORS Settings //
const cors = require("cors");
const CORS = cors({
	origin: "null",
	methods: ["OPTIONS"],
});
if (csrf_token && process.env.NODE_ENV !== "development") {
	app.use(CORS);
}
app.use(function (req, res, next) {
	//Security
	let clientIp = req.socket.remoteAddress;
	if (clientIp) {
		let ip = ipaddr.parse(clientIp);
		// Check if the IP address is IPv4-mapped IPv6 address

		if (ip.kind() === "ipv6" && ip instanceof ipaddr.IPv6 && ip.isIPv4MappedAddress()) {
			const ipv4 = ip.toIPv4Address().toString();
			clientIp = ipv4;
		} else {
			clientIp = ip.toString();
		}
	}

	//clientIp = req.connection.remoteAddress.split(':').pop();
	if (whitelistMode === true && !whitelist.includes(clientIp)) {
		console.log(
			"Forbidden: Connection attempt from " +
				clientIp +
				". If you are attempting to connect, please add your IP address in whitelist or disable whitelist mode in config.conf in root of TavernAI folder.\n",
		);
		return res
			.status(403)
			.send(
				"<b>Forbidden</b>: Connection attempt from <b>" +
					clientIp +
					"</b>. If you are attempting to connect, please add your IP address in whitelist or disable whitelist mode in config.conf in root of TavernAI folder.",
			);
	}
	next();
});

app.use((req, res, next) => {
	if (req.url.startsWith("/characters/") && is_colab && process.env.googledrive == 2) {
		let requestUrl = new URL(req.url);
		const filePath = path.join(
			charactersPath,
			decodeURIComponent(requestUrl.pathname.substring("/characters".length)),
		);
		fs.access(filePath, fs.constants.R_OK, (err) => {
			if (!err) {
				res.sendFile(filePath);
			} else {
				res.send("Character not found: " + filePath);
				//next();
			}
		});
	} else {
		next();
	}
});
app.use((req, res, next) => {
	if (req.url.startsWith("/User%20Avatars/") && is_colab && process.env.googledrive == 2) {
		let requestUrl = new URL(req.url);
		const filePath = path.join(
			UserAvatarsPath,
			decodeURIComponent(requestUrl.pathname.substr("/User%20Avatars".length)),
		);
		fs.access(filePath, fs.constants.R_OK, (err) => {
			if (!err) {
				res.sendFile(filePath);
			} else {
				res.send("Avatar not found: " + filePath);
				//next();
			}
		});
	} else {
		next();
	}
});
app.use(express.static(__dirname + "/public", { refresh: true }));

app.use("/backgrounds", (req, res) => {
	const filePath = decodeURIComponent(
		path.join(process.cwd(), "public/backgrounds", req.url.replace(/%20/g, " ")),
	);
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.status(404).send("File not found");
			return;
		}
		//res.contentType('image/jpeg');
		res.send(data);
	});
});
app.use("/characters", (req, res) => {
	let filePath = decodeURIComponent(
		path.join(process.cwd(), charactersPath, req.url.replace(/%20/g, " ")),
	);
	filePath = filePath.split("?v=")[0];
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.status(404).send("File not found");
			return;
		}
		//res.contentType('image/jpeg');
		res.send(data);
	});
});
app.use("/cardeditor", (req, res) => {
	const requestUrl = new URL(req.url);
	const filePath = decodeURIComponent(
		path.join(process.cwd(), "public/cardeditor", requestUrl.pathname.replace(/%20/g, " ")),
	);
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.status(404).send("File not found");
			return;
		}
		//res.contentType('image/jpeg');
		res.send(data);
	});
});
app.use("/User%20Avatars", (req, res) => {
	const requestUrl = new URL(req.url);
	const filePath = decodeURIComponent(
		path.join(process.cwd(), UserAvatarsPath, requestUrl.pathname.replace(/%20/g, " ")),
	);
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.status(404).send("File not found ");
			return;
		}
		//res.contentType('image/jpeg');
		res.send(data);
	});
});

app.use(multer({ dest: "uploads" }).single("avatar"));
app.get("/", function (request, response) {
	response.sendFile(__dirname + "/public/index.html"); //response.send("<h1>Главная страница</h1>");
});
app.get("/notes/*", function (request, response) {
	response.sendFile(__dirname + "/public" + request.url + ".html"); //response.send("<h1>Главная страница</h1>");
});
app.post("/getlastversion", jsonParser, function (request, response_getlastversion) {
	if (!request.body) return response_getlastversion.sendStatus(400);

	const repo = "TavernAI/TavernAI";
	let req;
	req = https.request(
		{
			hostname: "github.com",
			path: `/${repo}/releases/latest`,
			method: "HEAD",
		},
		(res) => {
			if (res.statusCode === 302) {
				const glocation = res.headers.location;
				const versionStartIndex = glocation.lastIndexOf("@") + 1;
				const version = glocation.substring(versionStartIndex);
				//console.log(version);
				response_getlastversion.send({ version: version });
			} else {
				response_getlastversion.send({ version: "error" });
			}
		},
	);

	req.on("error", (error) => {
		console.error(error);
		response_getlastversion.send({ version: "error" });
	});

	req.end();
});
//**************Kobold api
app.post("/generate", jsonParser, function (request, response_generate = response) {
	if (!request.body) return response_generate.sendStatus(400); //console.log(request.body.prompt);
	//const dataJson = json5.parse(request.body);
	request_promt = request.body.prompt;

	//console.log(request.body);
	var this_settings = {
		prompt: request_promt,
		use_story: false,
		use_memory: false,
		use_authors_note: false,
		use_world_info: false,
		max_context_length: request.body.max_context_length,
		//temperature: request.body.temperature,
		//max_length: request.body.max_length
	};
	if (request.body.singleline) {
		this_settings.singleline = true;
	}

	if (request.body.gui_settings == false) {
		var sampler_order = [
			request.body.s1,
			request.body.s2,
			request.body.s3,
			request.body.s4,
			request.body.s5,
			request.body.s6,
			request.body.s7,
		];
		this_settings = {
			prompt: request_promt,
			use_story: false,
			use_memory: false,
			use_authors_note: false,
			use_world_info: false,
			max_context_length: request.body.max_context_length,
			max_length: request.body.max_length,
			rep_pen: request.body.rep_pen,
			rep_pen_range: request.body.rep_pen_range,
			rep_pen_slope: request.body.rep_pen_slope,
			temperature: request.body.temperature,
			tfs: request.body.tfs,
			top_a: request.body.top_a,
			top_k: request.body.top_k,
			top_p: request.body.top_p,
			typical: request.body.typical,
			sampler_order: sampler_order,
		};
		if (request.body.singleline) {
			this_settings.singleline = true;
		}
	}

	console.log(this_settings);
	var args = {
		data: this_settings,
		headers: { "Content-Type": "application/json" },
		requestConfig: {
			timeout: connectionTimeoutMS,
		},
	};
	client
		.post(api_server + "/v1/generate", args, function (data, response) {
			if (response.statusCode == 200) {
				console.log(data);
				response_generate.send(data);
			}
			if (response.statusCode == 422) {
				console.log("Validation error");
				response_generate.send({ error: true, error_message: "Validation error" });
			}
			if (
				response.statusCode == 501 ||
				response.statusCode == 503 ||
				response.statusCode == 507
			) {
				console.log(data);
				if (data.detail && data.detail.msg) {
					response_generate.send({ error: true, error_message: data.detail.msg });
				} else {
					response_generate.send({
						error: true,
						error_message: "Error. Status code: " + response.statusCode,
					});
				}
			}
		})
		.on("error", function (err) {
			console.log(err);
			//console.log('something went wrong on the request', err.request.options);
			response_generate.send({
				error: true,
				error_message: "Unspecified error while sending the request.\n" + err,
			});
		});
});
app.post("/savechat", jsonParser, function (request, response) {
	//console.log(request.data);
	//console.log(request.body.bg);
	//const data = request.body;
	//console.log(request);
	//console.log(request.body.chat);
	//var bg = "body {background-image: linear-gradient(rgba(19,21,44,0.75), rgba(19,21,44,0.75)), url(../backgrounds/"+request.body.bg+");}";
	var dir_name = String(request.body.card_filename).replace(`.${characterFormat}`, "");
	let chat_data = request.body.chat;
	let jsonlData = chat_data.map(JSON.stringify).join("\n");
	fs.writeFile(
		chatsPath + dir_name + "/" + request.body.file_name + ".jsonl",
		jsonlData,
		"utf8",
		function (err) {
			if (err) {
				response.send(err);
				return console.log(err);
				//response.send(err);
			} else {
				//response.redirect("/");
				response.send({ result: "ok" });
			}
		},
	);
});
app.post("/getchat", jsonParser, function (request, response) {
	//console.log(request.data);
	//console.log(request.body.bg);
	//const data = request.body;
	//console.log(request);
	//console.log(request.body.chat);
	//var bg = "body {background-image: linear-gradient(rgba(19,21,44,0.75), rgba(19,21,44,0.75)), url(../backgrounds/"+request.body.bg+");}";
	var dir_name = String(request.body.card_filename).replace(`.${characterFormat}`, "");

	fs.stat(chatsPath + dir_name, function (err, stat) {
		if (stat === undefined) {
			fs.mkdirSync(chatsPath + dir_name);
			response.send({});
			return;
		} else {
			if (err === null) {
				fs.stat(
					chatsPath + dir_name + "/" + request.body.file_name + ".jsonl",
					function (err, stat) {
						if (err === null) {
							if (stat !== undefined) {
								fs.readFile(
									chatsPath + dir_name + "/" + request.body.file_name + ".jsonl",
									"utf8",
									(err, data) => {
										if (err) {
											console.error(err);
											response.send(err);
											return;
										}
										//console.log(data);
										const lines = data.split("\n");

										// Iterate through the array of strings and parse each line as JSON
										const jsonData = lines.map(json5.parse);
										response.send(jsonData);
									},
								);
							}
						} else {
							response.send({});
							//return console.log(err);
							return;
						}
					},
				);
			} else {
				console.error(err);
				response.send({});
				return;
			}
		}
	});
});
app.post("/savechatroom", jsonParser, function (request, response) {
	//console.log(request.data);
	//console.log(request.body.bg);
	//const data = request.body;
	//console.log(request);
	//console.log(request.body.chat);
	//var bg = "body {background-image: linear-gradient(rgba(19,21,44,0.75), rgba(19,21,44,0.75)), url(../backgrounds/"+request.body.bg+");}";
	var dir_name = String(request.body.filename);
	let chat_data = request.body.chat;
	let jsonlData = chat_data.map(JSON.stringify).join("\n");
	fs.writeFile(
		roomsPath + "/" + request.body.filename + ".jsonl",
		jsonlData,
		"utf8",
		function (err) {
			if (err) {
				response.send(err);
				return console.log(err);
				//response.send(err);
			} else {
				//response.redirect("/");
				response.send({ result: "ok" });
			}
		},
	);
});
app.post("/getchatroom", jsonParser, function (request, response) {
	// Expected: request.body.room_filename is the .jsonl file name (WITHOUT the extension) representing the room referred

	var dir_name = String(request.body.room_filename);

	fs.stat(roomsPath + dir_name + ".jsonl", function (err, stat) {
		if (stat === undefined) {
			fs.mkdirSync(roomsPath + dir_name + ".jsonl");
			response.send({});
			return;
		} else {
			if (err === null) {
				fs.stat(roomsPath + request.body.room_filename + ".jsonl", function (err, stat) {
					if (err === null) {
						if (stat !== undefined) {
							fs.readFile(
								roomsPath + request.body.room_filename + ".jsonl",
								"utf8",
								(err, data) => {
									if (err) {
										console.error(err);
										response.send(err);
										return;
									}
									//console.log(data);
									const lines = data.split("\n");

									// Iterate through the array of strings and parse each line as JSON
									const jsonData = lines.map(json5.parse);
									response.send(jsonData);
								},
							);
						}
					} else {
						response.send({});
						//return console.log(err);
						return;
					}
				});
			} else {
				console.error(err);
				response.send({});
				return;
			}
		}
	});
});

app.post("/getstatus", jsonParser, function (request, response_getstatus = response) {
	if (!request.body) return response_getstatus.sendStatus(400);
	api_server = request.body.api_server;
	if (api_server.indexOf("localhost") != -1) {
		api_server = api_server.replace("localhost", "127.0.0.1");
	}
	var args = {
		headers: { "Content-Type": "application/json" },
	};
	client
		.get(api_server + "/v1/model", args, function (data, response) {
			if (response.statusCode == 200) {
				if (data.result != "ReadOnly") {
					//response_getstatus.send(data.result);
				} else {
					data.result = "no_connection";
				}
			} else {
				data.result = "no_connection";
			}
			response_getstatus.send(data);
			//console.log(response.statusCode);
			//console.log(data);
			//response_getstatus.send(data);
			//data.results[0].text
		})
		.on("error", function (err) {
			//console.log('');
			//console.log('something went wrong on the request', err.request.options);
			response_getstatus.send({ result: "no_connection" });
		});
});

function checkServer() {
	//console.log('Check run###################################################');
	api_server = "http://127.0.0.1:5000";
	var args = {
		headers: { "Content-Type": "application/json" },
	};
	client
		.get(api_server + "/v1/model", args, function (data, response) {
			console.log(data.result);
			//console.log('###################################################');
			console.log(data);
		})
		.on("error", function (err) {
			console.log(err);
			//console.log('');
			//console.log('something went wrong on the request', err.request.options);
			//console.log('errorrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr');
		});
}

//***************** Main functions
function checkCharaProp(prop) {
	return (String(prop) || "").replace(/[\u2018\u2019‘’]/g, "'").replace(/[\u201C\u201D“”]/g, '"');
}

function charaFormatData(data) {
	let name;
	if (data.ch_name === undefined) {
		name = data.name;
	} else {
		name = data.ch_name;
	}
	name = checkCharaProp(name);
	if (name.length === 0) {
		name = "null";
	}
	let categories;
	let last_action_date;
	let create_date_online;
	let edit_date_online;
	if (data.create_date_online === undefined) {
		create_date_online = Date.now();
	} else {
		create_date_online = data.create_date_online;
	}
	if (data.edit_date_online === undefined) {
		edit_date_online = Date.now();
	} else {
		edit_date_online = data.edit_date_online;
	}
	if (data.last_action_date === undefined) {
		last_action_date = Date.now();
	} else {
		last_action_date = data.last_action_date;
	}

	let create_date_local;
	let edit_date_local;
	if (data.create_date_local === undefined) {
		create_date_local = Date.now();
	} else {
		create_date_local = data.create_date_local;
	}
	if (data.edit_date_local === undefined) {
		edit_date_local = Date.now();
	} else {
		edit_date_local = data.edit_date_local;
	}
	if (data.add_date_local === undefined) {
		add_date_local = Date.now();
	} else {
		add_date_local = data.add_date_local;
	}

	if (data.categories === undefined) {
		categories = [];
	} else {
		categories = data.categories;
	}

	if (data.nsfw === undefined) {
		data.nsfw = false;
	} else if (data.nsfw !== false) {
		data.nsfw = true;
	}
	let short_description;
	if (data.short_description === undefined) {
		short_description = "";
	} else {
		short_description = data.short_description;
	}
	let char = {
		public_id: checkCharaProp(data.public_id),
		public_id_short: checkCharaProp(data.public_id_short),
		user_name: checkCharaProp(data.user_name),
		user_name_view: checkCharaProp(data.user_name_view),
		name: name,
		description: checkCharaProp(data.description),
		short_description: checkCharaProp(short_description),
		personality: checkCharaProp(data.personality),
		first_mes: checkCharaProp(data.first_mes),
		chat: Date.now(),
		mes_example: checkCharaProp(data.mes_example),
		scenario: checkCharaProp(data.scenario),
		categories: categories,
		create_date_online: create_date_online,
		edit_date_online: edit_date_online,
		create_date_local: create_date_local,
		edit_date_local: edit_date_local,
		add_date_local: add_date_local,
		last_action_date: last_action_date,
		online: data.online,
		nsfw: data.nsfw,
	};
	// Filtration
	if (data.public_id === undefined) {
		char.public_id = uuid.v4().replace(/-/g, "");
	} else {
		if (data.public_id == "undefined" || data.public_id.length === 0) {
			char.public_id = uuid.v4().replace(/-/g, "");
		}
	}
	if (data.public_id_short === undefined) {
		delete char.public_id_short;
	}
	if (data.user_name === undefined) {
		delete char.user_name;
	}
	if (data.user_name_view === undefined) {
		delete char.user_name_view;
	}
	if (data.online != true) {
		delete char.online;
	}
	return char;
}
app.post("/createcharacter", urlencodedParser, async function (request, response) {
	let target_img = setCardName(request.body.ch_name);

	if (!request.body) return response.sendStatus(400);
	if (!fs.existsSync(charactersPath + target_img + `.${characterFormat}`)) {
		if (!fs.existsSync(chatsPath + target_img)) fs.mkdirSync(chatsPath + target_img);

		let filedata = request.file;
		var fileType = ".png";
		var img_file = "ai";
		var img_path = "public/img/";

		var char = charaFormatData(request.body); //{"name": target_img, "description": request.body.description, "personality": request.body.personality, "first_mes": request.body.first_mes, "avatar": 'none', "chat": Date.now(), "last_mes": '', "mes_example": ''};
		char = JSON.stringify(char);
		if (!filedata) {
			await charaWrite(
				"./public/img/fluffy.png",
				char,
				charactersPath + target_img,
				characterFormat,
				response,
			);
		} else {
			img_path = "./uploads/";
			img_file = filedata.filename;
			if (filedata.mimetype == "image/jpeg") fileType = ".jpeg";
			if (filedata.mimetype == "image/png") fileType = ".png";
			if (filedata.mimetype == "image/gif") fileType = ".gif";
			if (filedata.mimetype == "image/bmp") fileType = ".bmp";
			if (filedata.mimetype == "image/webp") fileType = ".webp";
			await charaWrite(
				img_path + img_file,
				char,
				charactersPath + target_img,
				characterFormat,
			);
		}
		response.status(200).send({ file_name: target_img });
		//console.log("The file was saved.");
	} else {
		response.send("Error: A character with that name already exists.");
	} //console.log(request.body); //response.send(target_img);

	//response.redirect("https://metanit.com")
});

app.post("/createroom", urlencodedParser, async function (request, response) {
	// let target_img = setCardName(request.body.ch_name);

	// since we are planning to re-use existing code, ch_name == filename (jsonl filename), since changing vvariables means we need
	// to also change the html file's form's input "name" attributes
	let target_file = request.body.ch_name;
	let characterNames = request.body.room_characters;
	let scenario = request.body.room_scenario;
	const fileExtension = ".jsonl";

	if (!request.body) return response.sendStatus(400);
	if (!request.body.room_characters) return response.sendStatus(400); // A room needs to have at least one character
	if (!fs.existsSync(roomsPath + target_file + fileExtension)) {
		if (!scenario) await roomWrite(target_file, characterNames);
		else
			await roomWrite(
				target_file,
				characterNames,
				"You",
				Date.now(),
				"",
				"discr",
				scenario,
				[],
			);

		response.status(200).send({ file_name: target_file });
		//console.log("The file was saved.");
	} else {
		response.send("Error: A room with that name already exists.");
	} //console.log(request.body); //response.send(target_img);

	//response.redirect("https://metanit.com")
});

app.post("/editcharacter", urlencodedParser, async function (request, response) {
	try {
		if (!request.body) return response.sendStatus(400);

		let card_filename = request.body.filename;

		let filedata = request.file;
		var fileType = ".png";
		var img_file = "ai";
		var img_path = charactersPath;

		let old_char_data_json = await charaRead(charactersPath + card_filename);
		let old_char_data = JSON.parse(old_char_data_json);
		let new_char_data = request.body;

		let merged_char_data = Object.assign({}, old_char_data, new_char_data);

		var char = charaFormatData(merged_char_data); //{"name": request.body.ch_name, "description": request.body.description, "personality": request.body.personality, "first_mes": request.body.first_mes, "avatar": request.body.avatar_url, "chat": request.body.chat, "last_mes": request.body.last_mes, "mes_example": ''};

		char.chat = request.body.chat;
		char.create_date_local = request.body.create_date_local;
		if (old_char_data.add_date_local !== undefined) {
			char.add_date_local = old_char_data.add_date_local;
		} else {
			char.add_date_local = old_char_data.create_date_local;
		}

		char.edit_date_local = Date.now();

		char = JSON.stringify(char);
		let target_img = card_filename.replace(`.${characterFormat}`, "");
		if (!filedata) {
			await charaWrite(
				img_path + card_filename,
				char,
				charactersPath + target_img,
				characterFormat,
			);
		} else {
			//console.log(filedata.filename);
			img_path = "uploads/";
			img_file = filedata.filename;

			await charaWrite(
				img_path + img_file,
				char,
				charactersPath + target_img,
				characterFormat,
			);
			//response.send('Character saved');
		}
		return response.status(200).send("Character saved");
	} catch (err) {
		console.log(err);
		return response.status(400).json({ error: err.toString() });
	}
});
app.post("/deletecharacter", jsonParser, function (request, response) {
	try {
		if (!request.body) {
			return response.sendStatus(400).json({ error: "Validation body error" });
		}
		let filename = request.body.filename;
		rimraf.sync(charactersPath + filename);
		let dir_name = filename;
		rimraf.sync(chatsPath + dir_name.replace(`.${characterFormat}`, ""));
		return response.status(200).json({});
	} catch (err) {
		console.log(err);
		return response.status(400).json({ error: err.toString() });
	}
});

app.post("/editroom", urlencodedParser, async function (request, response) {
	try {
		if (!request.body) return response.sendStatus(400);

		let filename = request.body.filename;

		// let filedata = request.file; // No file data for rooms, since rooms do not have any avatar/image associated with them
		var fileExtension = ".jsonl";
		var img_file = "ai";
		var img_path = roomsPath;

		let old_room_data = await roomRead(filename + fileExtension);
		let old_room_metadata = old_room_data[0];
		let room_data_array = Object.values(old_room_data); // Convert JSON object (of JSON objects) into an array (of JSON objects)
		room_data_array.shift(); // The first line is metadata, so need to remove it first
		let room_chat_data = room_data_array;
		// let old_char_data = JSON.parse(old_char_data_json); // No need for this line, since roomRead() already returns a JSON object (not as string)
		let new_room_metadata = request.body;

		let merged_room_metadata = Object.assign({}, old_room_metadata, new_room_metadata);

		await roomWrite(
			filename,
			merged_room_metadata.character_names,
			merged_room_metadata.user_name,
			merged_room_metadata.create_date,
			merged_room_metadata.notes,
			merged_room_metadata.notes_types,
			merged_room_metadata.scenario,
			room_chat_data,
		);

		return response.status(200).send("Room saved");
	} catch (err) {
		console.log(err);
		return response.status(400).json({ error: err.toString() });
	}
});

// Expected filename without the extension
app.post("/deleteroom", jsonParser, function (request, response) {
	try {
		if (!request.body) {
			return response.sendStatus(400).json({ error: "Validation body error" });
		}
		let extension = ".jsonl";
		let filename = request.body.filename + extension;
		rimraf.sync(roomsPath + filename);
		// let dir_name = filename;
		// rimraf.sync(chatsPath + dir_name.replace(`.${characterFormat}`, ''));
		return response.status(200).json({});
	} catch (err) {
		console.log(err);
		return response.status(400).json({ error: err.toString() });
	}
});

async function charaWrite(source_img, data, target_img, format = "webp") {
	try {
		// Load the image in any format
		sharp.cache(false);
		switch (format) {
			case "webp":
				const imageBuffer = fs.readFileSync(source_img);
				let stringByteArray = utf8Encode.encode(data).toString();
				const processedImage = await sharp(imageBuffer)
					.resize(400, 600)
					.webp({ quality: 95 })
					.withMetadata({
						exif: {
							IFD0: {
								UserComment: stringByteArray,
							},
						},
					})
					.toBuffer();
				fs.writeFileSync(target_img + ".webp", processedImage);

				break;
			case "png":
				var image = await sharp(source_img).resize(400, 600).toFormat("png").toBuffer(); // old 170 234

				// Get the chunks
				var chunks = extract(image);
				var tEXtChunks = chunks.filter((chunk) => chunk.name === "tEXt");

				// Remove all existing tEXt chunks
				for (var tEXtChunk of tEXtChunks) {
					chunks.splice(chunks.indexOf(tEXtChunk), 1);
				}
				// Add new chunks before the IEND chunk
				var base64EncodedData = Buffer.from(data, "utf8").toString("base64");
				chunks.splice(-1, 0, PNGtext.encode("chara", base64EncodedData));

				fs.writeFileSync(target_img + ".png", new Buffer.from(encode(chunks)));
				break;
			default:
				break;
		}
	} catch (err) {
		throw err;
	}
}

async function charaRead(img_url, input_format) {
	let format;
	sharp.cache(false);
	if (input_format === undefined) {
		if (img_url.indexOf(".webp") !== -1) {
			format = "webp";
		} else {
			format = "png";
		}
	} else {
		format = input_format;
	}

	switch (format) {
		case "webp":
			try {
				sharp.cache(false);
				let char_data;
				const exif_data = await ExifReader.load(fs.readFileSync(img_url));

				if (exif_data["UserComment"]["description"]) {
					let description = exif_data["UserComment"]["description"];
					try {
						JSON.parse(description);
						char_data = description;
					} catch {
						const byteArr = description.split(",").map(Number);
						const uint8Array = new Uint8Array(byteArr);
						const char_data_string = utf8Decode.decode(uint8Array);
						char_data = char_data_string;
					}
				} else {
					console.log("No description found in EXIF data.");
					return false;
				}
				return char_data;
			} catch (err) {
				console.log(err);
				return false;
			}
		case "png":
			const buffer = fs.readFileSync(img_url);
			const chunks = extract(buffer);
			const textChunks = chunks
				.filter(function (chunk) {
					return chunk.name === "tEXt";
				})
				.map(function (chunk) {
					return PNGtext.decode(chunk.data);
				});
			var base64DecodedData = Buffer.from(textChunks[0].text, "base64").toString("utf8");
			return base64DecodedData;
		default:
			break;
	}
}

// The function already appends the roomsPath before filedir (filename), and the .jsonl extension after the filedir
async function roomWrite(
	filedir,
	characterNames,
	user_name = "You",
	create_date = "",
	notes = "",
	notes_type = "discr",
	scenario = "",
	chat = [],
) {
	try {
		const fileExtension = ".jsonl";
		let fileContent = ""; // In string form
		let createDate = create_date ? create_date : Date.now();

		// let characterNamesArray = characterNames.isArray() ? characterNames : [characterNames];
		if (!Array.isArray(characterNames)) {
			// Convert character names into an array if not already (happens when user selected only one character for a room)
			characterNames = [characterNames];
		}

		let firstLine =
			'{"user_name":"' +
			user_name +
			'","character_names":' +
			JSON.stringify(characterNames) +
			',"create_date":' +
			createDate +
			',"notes":"' +
			notes +
			'","notes_type":"' +
			notes_type +
			'","scenario":"' +
			scenario +
			'"}';
		fileContent += firstLine;
		fileContent += chat.length ? "\n" : "";
		chat.forEach(function (chat_msg, i) {
			if (i < chat.length - 1)
				// If the current chat message is not the last message
				fileContent += JSON.stringify(chat_msg) + "\n";
			else fileContent += JSON.stringify(chat_msg);
		});
		fs.writeFileSync(roomsPath + filedir + fileExtension, fileContent);
		// console.log(firstLine);
	} catch (err) {
		throw err;
	}
}

app.post("/getcharacters", jsonParser, async function (request, response) {
	try {
		const files = await fs.promises.readdir(charactersPath);
		let imgFiles = files.filter((file) => file.endsWith(`.${characterFormat}`));
		if (request.body && request.body.filename) {
			imgFiles = imgFiles.filter(
				(file) =>
					file.replace(/\.[^\.]*/, "").toLowerCase() ===
					request.body.filename.toLowerCase(),
			);
		}
		const characters = {};
		let i = 0;

		for (const item of imgFiles) {
			const imgData = await charaRead(charactersPath + item);
			let jsonObject;
			try {
				jsonObject = json5.parse(imgData);
				jsonObject.filename = item;
				characters[i] = jsonObject;
				i++;
			} catch (error) {
				if (error instanceof SyntaxError) {
					console.error("Character info from index " + i + " is not valid JSON!", error);
				} else {
					console.error(
						"An unexpected error loading character index " + i + " occurred.",
						error,
					);
				}
				console.error("Pre-parsed character data:");
				console.error(imgData);
			}
		}

		response.send(JSON.stringify(characters));
	} catch (error) {
		console.error(error);
		response.sendStatus(500);
	}
});

// The function already appends the roomsPath before the roomFile value, expected with extension
async function roomRead(roomFile) {
	// console.log(roomsPath+roomFile);
	return fs
		.readFileSync(roomsPath + roomFile, { encoding: "utf8" })
		.split("\n")
		.map(json5.parse);
}

app.post("/getrooms", jsonParser, async function (request, response) {
	try {
		// const files = fs.readdirSync(roomsPath, {encoding: 'utf8'});
		const files = await fs.promises.readdir(roomsPath);
		let roomFiles = files.filter((file) => file.endsWith(".jsonl"));
		if (request.body && request.body.filename) {
			roomFiles = roomFiles.filter(
				(file) =>
					file.replace(/\.[^\.]*/, "").toLowerCase() ===
					request.body.filename.toLowerCase(),
			);
		}
		const rooms = {};
		let i = 0;

		for (const item of roomFiles) {
			let jsonObject = {};

			// fs.readFileSync(roomsPath+item, 'utf8', (err, data) => {
			//     if (err) {
			//         response.send(err);
			//         return;
			//     }
			//     //console.log(data);
			//     const lines = data.split('\n');

			//     // Iterate through the array of strings and parse each line as JSON
			//     jsonObject.chat = lines.map(json5.parse);
			//     try {
			//         jsonObject.filename = item;
			//         rooms[i] = jsonObject;
			//         i++;
			//     } catch (error) {
			//         if (error instanceof SyntaxError) {
			//             console.error("Room info from index " +i+ " is not valid JSON!", error);
			//         } else {
			//             console.error("An unexpected error loading room index " +i+ " occurred.", error);
			//         }
			//         console.error("Pre-parsed room data:");
			//         console.error(jsonObject);
			//     }

			//     console.log(rooms);
			// });

			const stats = await fs.promises.stat(roomsPath + item);
			if (!stats.isDirectory()) {
				jsonObject.chat = await roomRead(item);
				// jsonObject = (await fs.promises.readFile(roomsPath+item, {encoding: 'utf8'})).split('\n').map(json5.parse);
				jsonObject.filename = item;
				rooms[i] = jsonObject;
				// console.log(rooms);
				i++;
				// console.log(rooms);
			}
		}

		// console.log(rooms);
		response.send(JSON.stringify(rooms));
	} catch (error) {
		console.error(error);
		response.sendStatus(500);
	}
});

app.post("/getworldnames", jsonParser, async function (request, response) {
	try {
		const files = await fs.promises.readdir(worldPath);
		const jsonFiles = files.filter((file) => file.endsWith(".json"));
		const reply = { world_names: [] };

		jsonFiles.forEach((key) => {
			reply.world_names.push(key.replace(/\.json$/g, ""));
		});

		response.send(JSON.stringify(reply));
	} catch (error) {
		console.error(error);
		response.sendStatus(500);
	}
});

app.post("/saveworld", jsonParser, function (request, response) {
	if (!request.body.world_name) {
		console.error("No world_name given in saveworld request");
		return response.sendStatus(400);
	}
	if (!request.body.data || !request.body.data.entries) {
		return response.sendStatus(406);
	}
	const path = worldPath + request.body.world_name + ".json";
	const data = JSON.stringify(request.body.data, null, "  ");
	fs.writeFile(path, data, "utf8", function (err) {
		if (err) {
			response.send(err);
			return console.log(err);
		} else {
			response.send({ result: "ok" });
		}
	});
});
app.post("/loadworld", jsonParser, function (request, response) {
	if (!request.body.world_name) {
		console.error("No world_name given in saveworld request");
		return response.sendStatus(400);
	}
	const path = worldPath + request.body.world_name + ".json";

	fs.stat(path, function (err, stat) {
		if (err === null) {
			fs.readFile(path, "utf8", (err, data) => {
				if (err) {
					console.error(err);
					response.send(err);
					return;
				}
				response.send(data);
			});
		} else {
			console.error(err);
			response.send({});
			return;
		}
	});
});
app.post("/deleteworld", jsonParser, function (request, response) {
	if (!request.body.world_name) {
		console.error("No world_name given in saveworld request");
		return response.sendStatus(400);
	}
	const path = worldPath + request.body.world_name.replace(/\.\.[\/\\]/g, "") + ".json";

	fs.stat(path, function (err, stat) {
		if (err === null) {
			fs.rm(path, () => {});
			response.send({ result: "ok" });
		} else {
			response.send(err);
			return;
		}
	});
});
app.post("/importworld", urlencodedParser, async function (request, response) {
	if (!request.body) {
		return response.sendStatus(400);
	}

	let filedata = request.file;
	if (filedata) {
		fs.readFile("./uploads/" + filedata.filename, "utf8", (err, data) => {
			if (err) {
				console.log(err);
				response.send({ error: "Unable to access file." });
				response.sendStatus(400);
				return;
			}
			const jsonData = json5.parse(data);
			let filename = request.body.filename
				.replace(/\.json$/, "")
				.trim()
				.replace(/s+/g, " ")
				.replace(/ /g, "_");

			if (!jsonData.entries || typeof jsonData.entries !== "object") {
				return response.sendStatus(406);
			}
			fs.writeFile(worldPath + filename + ".json", data, "utf8", function (err) {
				if (err) {
					response.send(err);
					return console.log(err);
				} else {
					response.send({ result: "ok", world_name: filename });
				}
				fs.rm("./uploads/" + filedata.filename, () => {});
			});
		});
	}
});

app.post("/getbackgrounds", jsonParser, function (request, response) {
	var images = getImages("public/backgrounds");
	if (is_colab === true) {
		images = ["tavern.png"];
	}
	response.send(JSON.stringify(images));
});
app.post("/iscolab", jsonParser, function (request, response) {
	let url;
	if (process.env.colaburl !== undefined) {
		url = String(process.env.colaburl).trim();
	}
	let type = undefined;

	if (process.env.colab == 2) {
		type = "kobold_model";
	} else if (process.env.colab == 3) {
		type = "kobold_horde";
	} else if (process.env.colab == 4) {
		type = "openai";
	} else if (process.env.colab == 5) {
		type = "free_launch";
	}
	response.send({ colaburl: url, colab_type: type });
});
app.post("/getuseravatars", jsonParser, function (request, response) {
	var images = getImages(UserAvatarsPath);
	response.send(JSON.stringify(images));
});
app.post("/adduseravatar", urlencodedParser, function (request, response) {
	try {
		response_dw_bg = response;
		if (!request.body) return response.sendStatus(400);

		let filedata = request.file;
		let fileType = ".webp";
		let img_file;

		let img_path = "uploads/";
		img_file = filedata.filename;

		sharp(img_path + img_file)
			.resize(400, 600)
			.toFormat("webp")
			.toFile(`${UserAvatarsPath}${img_file}${fileType}`, (err) => {
				if (err) {
					console.log(err);
					return response.status(400).send(err);
				} else {
					//console.log(img_file+fileType);
					return response.status(200).send(img_file + fileType);
				}
			});
	} catch (err) {
		console.log(err);
		return response.status(400).send(err);
	}
});
app.post("/deleteuseravatar", jsonParser, function (request, response) {
	try {
		let filename = request.body.filename;
		let filePath = `${UserAvatarsPath}${filename}`;
		fs.unlinkSync(filePath);
		return response.status(200).json({});
	} catch (err) {
		console.log(err);
		return response.status(400).json({ error: err.toString() });
	}
});
app.post("/setbackground", jsonParser, function (request, response) {
	//console.log(request.data);
	//console.log(request.body.bg);
	//const data = request.body;
	//console.log(request);
	//console.log(1);
	let bg;
	if (request.body.bg == "none") {
		bg = "body {display: none;}";
	} else {
		bg = "body {background-image: " + request.body.bg + ";}";
	}
	fs.writeFile("public/css/bg_load.css", bg, "utf8", function (err) {
		if (err) {
			response.send(err);
			return console.log(err);
		} else {
			//response.redirect("/");
			response.send({ result: "ok" });
		}
	});
});

app.post("/delbackground", jsonParser, function (request, response) {
	if (!request.body) return response.sendStatus(400);
	rimraf("public/backgrounds/" + request.body.bg.replace(/\.\.[\/\\]/g, ""), (err) => {
		if (err) {
			response.send(err);
			return console.log(err);
		} else {
			//response.redirect("/");
			response.send("ok");
		}
	});
});
app.post("/downloadbackground", urlencodedParser, function (request, response) {
	response_dw_bg = response;
	if (!request.body) return response.sendStatus(400);

	let filedata = request.file; //console.log(filedata.mimetype);
	var fileType = ".png";
	var img_file = "ai";
	var img_path = "public/img/";

	img_path = "uploads/";
	img_file = filedata.filename;
	if (filedata.mimetype == "image/jpeg") fileType = ".jpeg";
	if (filedata.mimetype == "image/png") fileType = ".png";
	if (filedata.mimetype == "image/gif") fileType = ".gif";
	if (filedata.mimetype == "image/bmp") fileType = ".bmp";
	if (filedata.mimetype == "image/webp") fileType = ".webp";
	fs.copyFile(img_path + img_file, "public/backgrounds/" + img_file + fileType, (err) => {
		if (err) {
			return console.log(err);
		} else {
			//console.log(img_file+fileType);
			response_dw_bg.send(img_file + fileType);
		}
		//console.log('The image was copied from temp directory.');
	});
});

app.post("/savesettings", jsonParser, function (request, response) {
	const settings = request.body;

	if (BETA_KEY !== undefined) {
		request.body.BETA_KEY = BETA_KEY;
	}

	let error;

	fs.writeFile(
		"public/settings.json",
		JSON.stringify(request.body, null, 4),
		"utf8",
		function (err) {
			if (err) error = err;
		},
	);

	if (settings.api.main_api === "openai") {
		let { perset_settings_openai, ...openai_settings } = settings.openAI;

		fs.writeFile(
			`public/OpenAI Settings/${perset_settings_openai}.settings`,
			JSON.stringify(openai_settings, null, 4),
			(err) => {
				if (err) error = err;
			},
		);
	}

	if (error) return response.status(501).json({ error });

	return response.json({ status: "ok" });
});

function updateSettings(newSettings) {
	// Read the settings file
	const settingsData = fs.readFileSync("public/settings.json", "utf8");
	const settings = JSON.parse(settingsData);

	// Update the settings object with new data
	Object.assign(settings, newSettings);

	// Write the updated settings object back to the file
	fs.writeFileSync("public/settings.json", JSON.stringify(settings, null, 4));
}

app.post("/get_openai_perset", jsonParser, (request, response) => {
	const perset_name = request.body.name;

	// Return only 1 perset
	if (perset_name) {
		const OpenAI_setting = fs.readFileSync(
			`public/OpenAI Settings/${perset_name}.settings`,
			"utf8",
			(err, data) => {
				if (err) return response.sendStatus(500);

				return data;
			},
		);

		return response.send({
			openai_setting: OpenAI_setting,
			openai_setting_name: perset_name.replace(/\.[^/.]+$/, ""),
		});
	}

	// Return all perset
	const openai_settings = [];
	const openai_setting_names = [];

	const OpenAI_files = fs
		.readdirSync("public/OpenAI Settings")
		.sort(
			(a, b) =>
				new Date(fs.statSync(`public/OpenAI Settings/${b}`).mtime) -
				new Date(fs.statSync(`public/OpenAI Settings/${a}`).mtime),
		);

	OpenAI_files.forEach((item) => {
		const OpenAI_setting = fs.readFileSync(
			`public/OpenAI Settings/${item}`,
			"utf8",
			(err, data) => {
				if (err) return response.sendStatus(500);

				return data;
			},
		);

		openai_settings.push(OpenAI_setting);
		openai_setting_names.push(item.replace(/\.[^/.]+$/, ""));
	});

	return response.send({ openai_settings, openai_setting_names });
});

app.post("/getsettings", jsonParser, (request, response) => {
	//Wintermute's code
	const koboldai_settings = [],
		koboldai_setting_names = [];

	const novelai_settings = [],
		novelai_setting_names = [];

	const openai_settings = [],
		openai_setting_names = [];

	let settingsBuffer = fs.readFileSync("public/settings.json", "utf8", (err, data) => {
		if (err) return response.sendStatus(500);

		return data;
	});

	let settingsJSON = JSON.parse(settingsBuffer);
	if (settingsJSON.BETA_KEY !== undefined) {
		BETA_KEY = settingsJSON.BETA_KEY;
		delete settingsJSON.BETA_KEY;
	}

	let settings = JSON.stringify(settingsJSON);

	//Kobold
	const KoboldAI_files = fs
		.readdirSync("public/KoboldAI Settings")
		.sort(
			(a, b) =>
				new Date(fs.statSync(`public/KoboldAI Settings/${b}`).mtime) -
				new Date(fs.statSync(`public/KoboldAI Settings/${a}`).mtime),
		);

	KoboldAI_files.forEach((item) => {
		const KoboldAI_setting = fs.readFileSync(
			`public/KoboldAI Settings/${item}`,
			"utf8",
			(err, data) => {
				if (err) return response.sendStatus(500);

				return data;
			},
		);
		koboldai_settings.push(KoboldAI_setting);
		koboldai_setting_names.push(item.replace(/\.[^/.]+$/, ""));
	});

	//Novel
	const NovelAI_files = fs
		.readdirSync("public/NovelAI Settings")
		.sort(
			(a, b) =>
				new Date(fs.statSync(`public/NovelAI Settings/${b}`).mtime) -
				new Date(fs.statSync(`public/NovelAI Settings/${a}`).mtime),
		);

	NovelAI_files.forEach((item) => {
		const NovelAI_setting = fs.readFileSync(
			`public/NovelAI Settings/${item}`,
			"utf8",
			(err, data) => {
				if (err) return response.sendStatus(500);

				return data;
			},
		);

		novelai_settings.push(NovelAI_setting);
		novelai_setting_names.push(item.replace(/\.[^/.]+$/, ""));
	});

	// OpenAI
	const OpenAI_files = fs.readdirSync("public/OpenAI Settings").sort((a, b) => {
		if (a === "Default.settings") return -1;
		if (b === "Default.settings") return 1;

		return a.localeCompare(b);
	});

	OpenAI_files.forEach((item) => {
		const OpenAI_setting = fs.readFileSync(
			`public/OpenAI Settings/${item}`,
			"utf8",
			(err, data) => {
				if (err) return response.sendStatus(500);

				return data;
			},
		);

		openai_settings.push(OpenAI_setting);
		openai_setting_names.push(item.replace(/\.[^/.]+$/, ""));
	});

	//Styles
	const templates = fs
		.readdirSync("public/templates")
		.filter((file) => file.endsWith(".css"))
		.sort();

	return response.send({
		charaCloudMode,
		charaCloudServer,
		characterFormat,

		settings,
		templates,

		koboldai_settings,
		koboldai_setting_names,

		novelai_settings,
		novelai_setting_names,

		openai_settings,
		openai_setting_names,
	});
});

app.post("/savefolders", jsonParser, function (request, response) {
	fs.writeFile(
		`${charactersPath}folders.json`,
		JSON.stringify(request.body, null, 2),
		"utf8",
		function (err) {
			if (err) {
				response.send(err);
				return console.log(err);
			} else {
				response.send({ result: "ok" });
			}
		},
	);
});

app.post("/loadfolders", jsonParser, (request, response) => {
	fs.readFile(`${charactersPath}folders.json`, "utf8", (err, data) => {
		if (err) return response.sendStatus(500);
		return response.send(data);
	});
});

app.post("/savestyle", jsonParser, function (request, response) {
	const this_style = request.body.style;
	let file_data = '@import "../templates/classic.css";';
	if (this_style != "classic.css") {
		file_data = '@import "../templates/classic.css";@import "../templates/' + this_style + '";';
	}

	fs.writeFile("public/css/templates.css", file_data, "utf8", function (err) {
		if (err) {
			response.send(err);
			return console.log(err);
			//response.send(err);
		} else {
			//response.redirect("/");
			response.send({ result: "ok" });
		}
	});
});

app.post("/add_openai_perset", jsonParser, function (request, response) {
	const perset = request.body.perset_name;

	if (!perset) {
		return response.status(400).json({ error: "Bad Request! Missing perset name!" });
	}

	const defaultSettings = fs.readFileSync(
		`public/OpenAI Settings/Default.settings`,
		"utf8",
		(err, data) => {
			if (err) return response.status(500);
			return data;
		},
	);

	fs.writeFile(`public/OpenAI Settings/${perset}.settings`, defaultSettings, (error) => {
		if (error) return response.status(500).json({ error });
		return response.json({ status: "ok" });
	});
});

app.post("/edit_openai_perset", jsonParser, function (request, response) {
	const { perset_name: perset, new_name } = request.body;

	if (!perset || !new_name) {
		return response
			.status(400)
			.json({ error: "Bad Request! Missing perset name or new name!" });
	}

	fs.rename(
		`public/OpenAI Settings/${perset}.settings`,
		`public/OpenAI Settings/${new_name}.settings`,
		(error) => {
			if (error) return response.status(500).json({ error });
			return response.json({ status: "ok" });
		},
	);
});

app.post("/delete_openai_perset", jsonParser, function (request, response) {
	const perset = request.body.perset_name;

	if (!perset) {
		return response.status(400).json({ error: "Bad Request! Missing perset name!" });
	}

	fs.unlink(`public/OpenAI Settings/${perset}.settings`, (error) => {
		if (error) return response.status(501).json({ error });

		return response.json({ status: "ok" });
	});
});

function getCharaterFile(directories, response, i) {
	//old need del
	if (directories.length > i) {
		fs.stat(
			charactersPath + directories[i] + "/" + directories[i] + ".json",
			function (err, stat) {
				if (err == null) {
					fs.readFile(
						charactersPath + directories[i] + "/" + directories[i] + ".json",
						"utf8",
						(err, data) => {
							if (err) {
								console.error(err);
								return;
							}
							//console.log(data);

							characters[character_i] = {};
							characters[character_i] = data;
							i++;
							character_i++;
							getCharaterFile(directories, response, i);
						},
					);
				} else {
					i++;
					getCharaterFile(directories, response, i);
				}
			},
		);
	} else {
		response.send(JSON.stringify(characters));
	}
}
function getImages(path) {
	return fs
		.readdirSync(path)
		.sort(function (a, b) {
			return (
				new Date(fs.statSync(path + "/" + a).mtime) -
				new Date(fs.statSync(path + "/" + b).mtime)
			);
		})
		.reverse();
}
function getKoboldSettingFiles(path) {
	return fs
		.readdirSync(path)
		.sort(function (a, b) {
			return (
				new Date(fs.statSync(path + "/" + a).mtime) -
				new Date(fs.statSync(path + "/" + b).mtime)
			);
		})
		.reverse();
}
function getDirectories(path) {
	return fs
		.readdirSync(path)
		.sort(function (a, b) {
			return (
				new Date(fs.statSync(path + "/" + a).mtime) -
				new Date(fs.statSync(path + "/" + b).mtime)
			);
		})
		.reverse();
}

//***********Novel.ai API

app.post("/getstatus_novelai", jsonParser, function (request, response_getstatus_novel = response) {
	if (!request.body) return response_getstatus_novel.sendStatus(400);
	api_key_novel = request.body.key;
	var data = {};
	var args = {
		data: data,

		headers: { "Content-Type": "application/json", Authorization: "Bearer " + api_key_novel },
	};
	client
		.get(api_novelai + "/user/subscription", args, function (data, response) {
			if (response.statusCode == 200) {
				//console.log(data);
				response_getstatus_novel.send(data); //data);
			}
			if (response.statusCode == 401) {
				console.log("Access Token is incorrect.");
				response_getstatus_novel.send({
					error: true,
					error_message: "Access token is incorrect.",
				});
			}
			if (
				response.statusCode == 500 ||
				response.statusCode == 501 ||
				response.statusCode == 501 ||
				response.statusCode == 503 ||
				response.statusCode == 507
			) {
				console.log(data);
				response_getstatus_novel.send({
					error: true,
					error_message: "Error. Status code: " + response.statusCode,
				});
			}
		})
		.on("error", function (err) {
			//console.log('');
			//console.log('something went wrong on the request', err.request.options);
			response_getstatus_novel.send({
				error: true,
				error_message: "Unspecified error while sending the request.\n" + err,
			});
		});
});

app.post("/generate_novelai", jsonParser, function (request, response_generate_novel = response) {
	if (!request.body) return response_generate_novel.sendStatus(400);

	console.log(request.body);
	var data = {
		input: request.body.input,
		model: request.body.model,
		parameters: {
			use_string: request.body.use_string,
			temperature: request.body.temperature,
			max_length: request.body.max_length,
			min_length: request.body.min_length,
			top_a: request.body.top_a,
			top_k: request.body.top_k,
			top_p: request.body.top_p,
			typical_p: request.body.typical_p,
			tail_free_sampling: request.body.tail_free_sampling,
			repetition_penalty: request.body.repetition_penalty,
			repetition_penalty_range: request.body.repetition_penalty_range,
			repetition_penalty_slope: request.body.repetition_penalty_slope,
			repetition_penalty_frequency: request.body.repetition_penalty_frequency,
			repetition_penalty_presence: request.body.repetition_penalty_presence,
			//"stop_sequences": {{187}},
			//bad_words_ids = {{50256}, {0}, {1}};
			//generate_until_sentence = true;
			use_cache: request.body.use_cache,
			//use_string = true;
			return_full_text: request.body.return_full_text,
			prefix: request.body.prefix,
			order: request.body.order,
		},
	};

	var args = {
		data: data,
		headers: { "Content-Type": "application/json", Authorization: "Bearer " + api_key_novel },
		requestConfig: {
			timeout: connectionTimeoutMS,
		},
	};
	client
		.post(api_novelai + "/ai/generate", args, function (data, response) {
			if (response.statusCode == 201) {
				console.log(data);
				response_generate_novel.send(data);
			}
			if (response.statusCode == 400) {
				console.log("Validation error");
				response_generate_novel.send({ error: true, error_message: "Validation error" });
			}
			if (response.statusCode == 401) {
				console.log("Access Token is incorrect");
				response_generate_novel.send({
					error: true,
					error_message: "Access token is incorrect.",
				});
			}
			if (response.statusCode == 402) {
				console.log("An active subscription is required to access this endpoint");
				response_generate_novel.send({
					error: true,
					error_message: "An active subscription is required to access this endpoint",
				});
			}
			if (response.statusCode == 500 || response.statusCode == 409) {
				console.log(data);
				response_generate_novel.send({
					error: true,
					error_message: "Error. Status code: " + response.statusCode,
				});
			}
		})
		.on("error", function (err) {
			//console.log('');
			//console.log('something went wrong on the request', err.request.options);
			response_generate_novel.send({
				error: true,
				error_message: "Unspecified error while sending the request.\n" + err,
			});
		});
});

//***********Horde API
app.post("/generate_horde", jsonParser, function (request, response_generate_horde) {
	hordeActive = true;
	hordeData = null;
	hordeError = null;
	hordeQueue = 0;
	// Throw validation error if nothing sent/fails?
	if (!request.body) return response_generate_horde.sendStatus(400);
	//console.log(request.body.prompt); // debug

	// Prompt variable
	let request_prompt = request.body.prompt;

	var this_settings = {
		prompt: request_prompt,
		params: {
			n: request.body.n,
			frmtadsnsp: request.body.frmtadsnsp,
			frmtrmblln: request.body.frmtrmblln,
			frmtrmspch: request.body.frmtrmspch,
			frmttriminc: request.body.frmttriminc,
			max_context_length: request.body.max_context_length,
			max_length: request.body.max_length,
			rep_pen: request.body.rep_pen,
			rep_pen_range: request.body.rep_pen_range,
			rep_pen_slope: request.body.rep_pen_slope,
			singleline: request.body.singleline,
			temperature: request.body.temperature,
			tfs: request.body.tfs,
			top_a: request.body.top_a,
			top_k: request.body.top_k,
			top_p: request.body.top_p,
			typical: request.body.typical,
			sampler_order: [
				request.body.s1,
				request.body.s2,
				request.body.s3,
				request.body.s4,
				request.body.s5,
				request.body.s6,
				request.body.s7,
			],
		},
		models: request.body.models,
	};

	var args = {
		data: this_settings,
		headers: { "Content-Type": "application/json", apikey: request.body.horde_api_key },
		requestConfig: {
			timeout: 10 * 600 * 1000,
		},
	};

	console.log(this_settings);

	client
		.post(api_horde + "/v2/generate/text/async", args, function (data, response) {
			if (response.statusCode == 202) {
				console.log(data);
				pollHordeStatus(data.id, args).then(
					(resolve) => {
						response_generate_horde.send({ started: true });
					},
					(reject) => {
						response_generate_horde.send({ error: true, message: reject });
					},
				);
			}
			if (response.statusCode == 401) {
				console.log("Validation error");
				response_generate_horde.send({ error: true, error_message: "Validation error." });
			}
			if (
				response.statusCode == 429 ||
				response.statusCode == 503 ||
				response.statusCode == 507
			) {
				console.log(data);
				if (data.detail && data.detail.msg) {
					response_generate.send({ error: true, error_message: data.detail.msg });
				} else {
					response_generate.send({
						error: true,
						error_message: "Error. Status code: " + response.statusCode,
					});
				}
			}
		})
		.on("error", function (err) {
			hordeActive = false;
			console.log(err);
			//console.log('something went wrong on the request', err.request.options);
			response_generate_horde.send({
				error: true,
				error_message: "Unspecified error while sending the request.\n" + err,
			});
		});
});

function pollHordeStatus(id, args, callback) {
	return new Promise((resolve, reject) => {
		client
			.get(api_horde + "/v2/generate/text/status/" + id, args, function (gen, response) {
				hordeData = gen;
				hordeWaitProgress(gen);
				if ((gen.done || gen.finished) && gen.generations != undefined) {
					hordeActive = false;
					hordeQueue = 0;
					hordeError = null;
					console.log({ Kudos: gen.kudos });
					console.log(gen.generations);
					resolve();
					return;
				} else if (gen.faulted || (!gen.processing && !gen.waiting && !gen.is_possible)) {
					hordeActive = false;
					hordeQueue = 0;
					hordeError = gen.message;
					console.log(hordeData);
					console.error("Horde error", gen.message);
					reject(gen.message);
					return;
				}
				setTimeout(() => pollHordeStatus(id, args), 3000);
				resolve();
			})
			.on("error", function (err) {
				hordeActive = false;
				hordeData = null;
				hordeError = err;
				console.log(err);
				reject(err);
			});
	});
}

function hordeWaitProgress(data) {
	if (data.queue_position !== undefined) {
		hordeQueue = data.queue_position;
	}
	try {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		hordeTicker = hordeTicker > 2 ? 0 : hordeTicker + 1;
		let ticker = ["/", "-", "\\", "|"][hordeTicker];
		if (data.queue_position > 0) {
			process.stdout.write(ticker + " Queue position: " + data.queue_position);
		} else if (data.wait_time > 0) {
			process.stdout.write(ticker + " Wait time: " + data.wait_time);
		}
	} catch (error) {
		return;
	}
}

app.post("/getstatus_horde", jsonParser, function (request, response_getstatus_horde) {
	if (!request.body) return response_getstatus_horde.sendStatus(400);
	horde_api_key = request.body.horde_api_key;
	var args = { type: "text" };
	client
		.get(api_horde + "/v2/status/models?type=text", args, function (data, response) {
			if (response.statusCode == 200) {
				console.log({ Models: "List fetched and updated." });
				response_getstatus_horde.send(data); //data);
			} else {
				console.log(data);
				response_getstatus_horde.send({
					error: true,
					error_message: "Could not fetch model list.",
				});
			}
		})
		.on("error", function (err) {
			response_getstatus_horde.send({
				error: true,
				error_message: "Unspecified error while sending the request.\n" + err,
			});
		});
});

app.get("/gethordeinfo", jsonParser, function (request, response) {
	response.send({
		running: hordeActive,
		queue: hordeQueue,
		hordeData: hordeData,
		error: hordeError,
	});
});

//***********Open.ai API

app.post("/getstatus_openai", jsonParser, function (request, response_getstatus_openai) {
	if (!request.body) return response_getstatus_openai.sendStatus(400);

	api_key_openai = request.body.key;
	api_url_openai = request.body.url;

	const controller = new AbortController();

	request.socket.removeAllListeners("close");
	request.socket.on("close", () => controller.abort());

	/**
	 * @type {RequestInit}
	 */
	const data = {
		signal: controller.signal,
		cache: "no-cache",
		keepalive: true,
		headers: {
			Authorization: api_key_openai ? `Beaner ${api_key_openai}` : undefined,
		},
	};

	fetch(api_url_openai + "/models", data)
		.then(async (response) => {
			if (response.status <= 299) {
				response_getstatus_openai.send({ success: true });
				return;
			}

			const errorJson = await response.json();
			const errorMessage = errorJson.proxy_note
				? errorJson.proxy_note
				: errorJson.error && errorJson.error.message
				? errorJson.error.message
				: response.statusText;

			console.log(errorJson);

			if (response.status == 401) {
				console.log("Access Token is incorrect");
			} else if (response.status == 404) {
				console.log("Endpoint not found.");
			} else if (response.status == 500 || response.status == 409 || response.status == 504) {
				console.log("The server had an error while processing your request");
			} else {
				console.log("An unknown error occurred: ", {
					status: response.status,
					statusText: response.statusText,
					...errorJson,
				});
			}
			response_getstatus_openai.send({ error: true, message: errorMessage });
		})
		.catch((err) => {
			const error = Error(err);
			console.log("🚀 ~ file: server.js:1724 ~ err:", err);

			if (response_getstatus_openai.writable && !response_getstatus_openai.headersSent) {
				if (controller.signal.aborted) {
					response_getstatus_openai.send({ error: true, message: "Request aborted." });
				} else if (error.message) {
					response_getstatus_openai.send({ error: true, message: error.message });
				}
			}
		})
		.finally(() => response_getstatus_openai.end());
});

app.post("/generate_openai", jsonParser, function (request, response_generate_openai) {
	if (!request.body) return response_generate_openai.sendStatus(400);
	console.log(request.body);

	const controller = new AbortController();
	request.socket.removeAllListeners("close");
	request.socket.on("close", () => controller.abort());

	const isGPT = request.body.model.toLowerCase().startsWith("gpt");

	let body = {
		model: request.body.model,
		temperature: request.body.temperature,
		top_p: request.body.top_p,
		presence_penalty: request.body.presence_penalty,
		frequency_penalty: request.body.frequency_penalty,
		stop: request.body.stop,
		stream: request.body.stream,
	};

	if (isGPT) {
		body = {
			...body,
			max_tokens: request.body.max_tokens,
			messages: request.body.messages,
		};
	} else {
		body = {
			...body,
			max_tokens_to_sample: request.body.max_tokens,
			prompt: request.body.messages,
		};
	}

	/**
	 * @type {RequestInit}
	 */
	let data = {
		method: "POST",
		signal: controller.signal,
		cache: "no-cache",
		keepalive: true,
		body: JSON.stringify(body),
		headers: {
			"Content-Type": "application/json",
			Authorization: api_key_openai ? `Beaner ${api_key_openai}` : undefined,
		},
	};

	const apiUrl = api_url_openai + (isGPT ? "/v1/chat/completions" : "/v1/complete");

	fetch(apiUrl, data)
		.then(async (response) => {
			if (response.status <= 299) {
				response_generate_openai.setHeader("cache-control", "no-cache");

				if (request.body.stream) {
					console.log("Streaming request in progress");

					const valueList = [];
					const reader = response.body.getReader();
					const decoder = new TextDecoder("utf-8");

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value);
						if (!chunk.startsWith("data:") && chunk.trim()) {
							console.log("Event" + chunk.trim().replace("\n\n", ""));
						}

						valueList.push(chunk);
						response_generate_openai.write(value);
					}
					console.log("Streaming request ended");

					let content = "",
						jsonData;
					for (const value of valueList) {
						const lines = value.split("\n\n");
						lines.pop();

						for (const line of lines) {
							if (!line.startsWith("data")) continue;
							if (line == "data: [DONE]") break;

							jsonData = JSON.parse(line.substring(6));

							if (isGPT) {
								content += jsonData.choices[0]["delta"]["content"] || "";
							} else {
								content = jsonData.completion;
							}
						}
					}

					if (isGPT) {
						const prompt = body.messages.reduce(
							(p, c) => p + `${c.role}: ${c.content}\r\n\n`,
							"",
						);

						const prompt_tokens = encodeGPT(prompt).length,
							completion_tokens = encodeGPT(content).length,
							total_tokens = prompt_tokens + completion_tokens;

						const { id, object, created, model } = jsonData;

						console.log({
							id,
							object,
							created,
							created_date: new Date(created * 1000).toTimeString(),
							model,
							usages: { prompt_tokens, completion_tokens, total_tokens },
							completion: content,
						});
					} else {
						const prompt_tokens = encodeGPT(body.prompt).length,
							completion_tokens = encodeGPT(content).length,
							total_tokens = prompt_tokens + completion_tokens;

						const { completion, stop_reason, model, truncated, log_id, exception } =
							jsonData;

						console.log({
							id: log_id,
							stop_reason,
							created: Date.now() / 1000,
							created_date: new Date(Date.now()).toTimeString(),
							model,
							truncated,
							exception,
							usages: { prompt_tokens, completion_tokens, total_tokens },
							completion,
						});
					}
				} else {
					const originalMessage = await response.json();
					response_generate_openai.send(originalMessage);

					if (isGPT) {
						const { id, object, created, model, usage, choices } = originalMessage;

						console.log({
							id,
							object,
							created,
							created_date: new Date(created * 1000).toTimeString(),
							model,
							usage,
							completion: choices[0]?.message.content,
						});
					} else {
						const prompt_tokens = encodeGPT(body.prompt).length,
							completion_tokens = encodeGPT(originalMessage.completion).length,
							total_tokens = prompt_tokens + completion_tokens;

						const { completion, stop_reason, model, truncated, log_id, exception } =
							originalMessage;

						console.log({
							id: log_id,
							stop_reason,
							created: Date.now() / 1000,
							created_date: new Date(Date.now()).toTimeString(),
							model,
							truncated,
							exception,
							usages: { prompt_tokens, completion_tokens, total_tokens },
							completion,
						});
					}
				}

				return response_generate_openai.end();
			}

			const errorJson = await response.json();
			const errorMessage = errorJson.proxy_note
				? errorJson.proxy_note
				: errorJson.error && errorJson.error.message
				? errorJson.error.message
				: response.statusText;

			console.log(errorJson);

			if (response.status == 400) {
				console.log(`Status: ${response.status} ~ Error: Validation error`);
			} else if (response.status == 401) {
				console.log(`Status: ${response.status} ~ Error: Access Token is incorrect`);
			} else if (response.status == 402) {
				console.log(
					`Status: ${response.status} ~ Error: An active subscription is required to access this endpoint`,
				);
			} else if (response.status == 429) {
				console.log(`Status: ${response.status} ~ Error: Rate limit reached for requests`);
			} else if (response.status == 500 || response.status == 409 || response.status == 504) {
				console.log(
					`Status: ${response.status} ~ Error: The server had an error while processing your request`,
				);
				if (request.body.stream) {
					// response.data.on("data", (chunk) => {
					// 	console.log(chunk.toString());
					// });
				}
			} else {
				console.log("🚀 ~ file: server.js:1885 ~ An unknown error occurred: ", {
					status: response.status,
					statusText: response.statusText,
					...errorJson,
				});
			}
			response_generate_openai.send({ error: true, message: errorMessage });
		})
		.catch(function (err) {
			const error = err instanceof Error ? err : Error(err);
			console.log("🚀 ~ file: server.js:1892 ~ err:", err);

			if (response_generate_openai.writable) {
				if (request.body.stream) {
					console.log("🚀 ~ file: server.js:1899 ~ error.message:", error.message);

					response_generate_openai.write(
						JSON.stringify({ error: true, message: error.message }) + "\n\n",
					);
				} else if (response_generate_openai.headersSent) {
					if (controller.signal.aborted) {
						response_generate_openai.send({ error: true, message: "Request aborted." });
					}

					if (error.message) {
						response_generate_openai.send({ error: true, message: error.message });
					}
				}
			}
		})
		.finally(() => response_generate_openai.end());
});

app.post("/getallchatsofchatacter", jsonParser, function (request, response) {
	if (!request.body) return response.sendStatus(400);

	var char_dir = request.body.filename.replace(`.${characterFormat}`, "");
	fs.readdir(chatsPath + char_dir, (err, files) => {
		if (err) {
			console.error(err);
			response.send({ error: true });
			return;
		}

		// filter for JSON files
		const jsonFiles = files.filter((file) => path.extname(file) === ".jsonl");

		// sort the files by name
		//jsonFiles.sort().reverse();

		// print the sorted file names
		var chatData = {};
		let totalChatNumbers = jsonFiles.length;
		for (let i = jsonFiles.length - 1; i >= 0; i--) {
			const file = jsonFiles[i];

			const fileStream = fs.createReadStream(chatsPath + char_dir + "/" + file);
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			});

			let lastLine;

			rl.on("line", (line) => {
				lastLine = line;
			});

			rl.on("close", () => {
				if (lastLine) {
					let jsonData = json5.parse(lastLine);
					if (jsonData.name !== undefined) {
						chatData[i] = {};
						chatData[i]["file_name"] = file;
						chatData[i]["mes"] = jsonData["mes"];

						totalChatNumbers -= 1;
						if (totalChatNumbers === 0) {
							response.send(chatData);
						}
					} else {
						return;
					}
				}
				rl.close();
			});
		}
	});
});
function setCardName(character_name) {
	let target_img = sanitize_filename(character_name);
	if (target_img.length === 0) {
		return (target_img = uuid.v4().replace(/-/g, ""));
	}
	let i = 1;
	let base_name = target_img;
	while (fs.existsSync(charactersPath + target_img + `.${characterFormat}`)) {
		target_img = base_name + i;
		i++;
	}
	return target_img;
}
app.post("/importcharacter", urlencodedParser, async function (request, response) {
	if (!request.body) return response.sendStatus(400);

	let img_name = "";
	let filedata = request.file;
	var format = request.body.file_type;

	if (filedata) {
		if (format == "json") {
			fs.readFile("./uploads/" + filedata.filename, "utf8", async (err, data) => {
				if (err) {
					response.send({ error: true });
				}
				const jsonData = json5.parse(data);

				if (jsonData.name !== undefined) {
					img_name = setCardName(jsonData.name);
					let pre_data = {
						name: jsonData.name,
						description: jsonData.description,
						personality: jsonData.personality,
						first_mes: jsonData.first_mes,
						avatar: "none",
						chat: Date.now(),
						mes_example: jsonData.mes_example,
						scenario: jsonData.scenario,
					};
					let char = JSON.stringify(charaFormatData(pre_data));
					await charaWrite(
						"./public/img/fluffy.png",
						char,
						charactersPath + img_name,
						characterFormat,
					);
					response.status(200).send({ file_name: img_name });
				} else if (jsonData.char_name !== undefined) {
					//json Pygmalion notepad
					img_name = setCardName(jsonData.char_name);
					let pre_data = {
						name: jsonData.char_name,
						description: jsonData.char_persona,
						personality: "",
						first_mes: jsonData.char_greeting,
						avatar: "none",
						chat: Date.now(),
						mes_example: jsonData.example_dialogue,
						scenario: jsonData.world_scenario,
					};
					let char = JSON.stringify(charaFormatData(pre_data));
					await charaWrite(
						"./public/img/fluffy.png",
						char,
						charactersPath + img_name,
						characterFormat,
					);
					response.status(200).send({ file_name: img_name });
				} else {
					console.log("Incorrect character format .json");
					response.send({ error: true });
				}
			});
		} else {
			try {
				var img_data = await charaRead("./uploads/" + filedata.filename, format);
				let jsonData = json5.parse(img_data);
				img_name = setCardName(jsonData.name);
				if (checkCharaProp(img_name).length > 0) {
					let char = charaFormatData(jsonData);
					char.add_date_local = Date.now();
					char.last_action_date = Date.now();
					char = JSON.stringify(char);
					await charaWrite(
						"./uploads/" + filedata.filename,
						char,
						charactersPath + img_name,
						characterFormat,
						response,
						{ file_name: img_name },
					);
					response.status(200).send({ file_name: img_name });
				} else {
					console.log("Incorrect character card");
					response.send({ error: true });
				}
			} catch (err) {
				console.log(err);
				response.send({ error: true });
			}
		}
	}
});

app.post("/importchat", urlencodedParser, function (request, response) {
	if (!request.body) return response.sendStatus(400);
	var format = request.body.file_type;
	let filedata = request.file;
	let avatar_url = request.body.filename.replace(`.${characterFormat}`, "");
	let ch_name = request.body.character_name; //console.log(filedata.filename);
	//var format = request.body.file_type;
	//console.log(format);
	//console.log(1);
	if (filedata) {
		/** Raw format; assumes:
		 * You: Hello! *Waves*
		 * Them: *Smiles* Hello!
		 */
		if (format === "txt") {
			const fileStream = fs.createReadStream("./uploads/" + filedata.filename, "utf8");
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			});
			let created = Date.now();
			var new_chat = [];
			new_chat.push({
				user_name: "You",
				character_name: ch_name,
				create_date: created,
			});
			rl.on("line", (line) => {
				if (line && line.length) {
					let is_user = !!line.match(/^You:/);
					const text = line.replace(/^[^:]*: ?/, "").trim();
					if (text) {
						new_chat.push({
							name: is_user ? "You" : ch_name,
							is_user: is_user,
							is_name: true,
							send_date: ++created,
							mes: text,
						});
					}
				}
			});
			rl.on("close", () => {
				const chatJsonlData = new_chat.map((i) => JSON.stringify(i)).join("\n");
				fs.writeFile(
					chatsPath + avatar_url + "/" + Date.now() + ".jsonl",
					chatJsonlData,
					"utf8",
					function (err) {
						if (err) {
							response.send(err);
							return console.log(err);
						} else {
							response.send({ res: true });
						}
					},
				);
			});
		} else if (format === "json") {
			fs.readFile("./uploads/" + filedata.filename, "utf8", (err, data) => {
				if (err) {
					console.log(err);
					response.send({ error: true });
				}

				const jsonData = json5.parse(data);
				var new_chat = [];
				/** Collab format: array of alternating exchanges, e.g.
				 *  { chat: [
				 *      "You: Hello there.",
				 *      "Them: \"Oh my! Hello!\" *They wave.*"
				 *  ] }
				 */
				if (jsonData.chat && Array.isArray(jsonData.chat)) {
					let created = Date.now();
					new_chat.push({
						user_name: "You",
						character_name: ch_name,
						create_date: created,
					});
					jsonData.chat.forEach((snippet) => {
						let is_user = !!snippet.match(/^You:/);
						// replace all quotes around text, but not inside it
						const text = snippet
							.replace(/^[^:]*: ?/, "")
							.trim()
							.replace(/ +/g, " ")
							.replace(/" *$/g, "")
							.replace(/" *\n/g, "\n")
							.replace(/\n"/g, "\n")
							.replace(/^"/g, "")
							.replace(/" ?\*/g, " *")
							.replace(/\* ?"/g, "* ");
						new_chat.push({
							name: is_user ? "You" : ch_name,
							is_user: is_user,
							is_name: true,
							send_date: ++created,
							mes: text,
						});
					});
					const chatJsonlData = new_chat.map((i) => JSON.stringify(i)).join("\n");
					fs.writeFile(
						chatsPath + avatar_url + "/" + Date.now() + ".jsonl",
						chatJsonlData,
						"utf8",
						function (err) {
							if (err) {
								response.send(err);
								return console.log(err);
							} else {
								response.send({ res: true });
							}
						},
					);
				} else if (jsonData.histories !== undefined) {
					const chat = {
						from(history) {
							return [
								{
									user_name: "You",
									character_name: ch_name,
									create_date: Date.now(),
								},
								...history.msgs.map((message) => ({
									name: message.src.is_human ? "You" : ch_name,
									is_user: message.src.is_human,
									is_name: true,
									send_date: Date.now(),
									mes: message.text,
								})),
							];
						},
					};

					const chats = [];
					(jsonData.histories.histories ? jsonData.histories.histories : []).forEach(
						(history) => {
							chats.push(chat.from(history));
						},
					);

					const errors = [];
					let chat_name_i = 1;
					chats.forEach((chat) =>
						fs.writeFile(
							`${chatsPath}${avatar_url}/${Date.now() + chat_name_i++}.jsonl`,
							chat.map(JSON.stringify).join("\n"),
							"utf8",
							(err) => {
								if (err) {
									errors.push(err);
								}
							},
						),
					);

					if (0 < errors.length) {
						return response.send(
							"One or more errors occurred while writing character files. Errors: " +
								JSON.stringify(errors),
						);
					}

					return response.send({ res: true });
				} else {
					response.send({ error: true });
				}
			});
		} else if (format === "jsonl") {
			const fileStream = fs.createReadStream("./uploads/" + filedata.filename);
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			});

			rl.once("line", (line) => {
				let jsonData = json5.parse(line);

				if (jsonData.user_name !== undefined) {
					fs.copyFile(
						"./uploads/" + filedata.filename,
						chatsPath + avatar_url + "/" + Date.now() + ".jsonl",
						(err) => {
							if (err) {
								response.send({ error: true });
								return console.log(err);
							} else {
								response.send({ res: true });
								return;
							}
						},
					);
				} else {
					//response.send({error:true});
					return;
				}
				rl.close();
			});
		}
	}
});

app.post("/deletechat", jsonParser, function (request, response) {
	try {
		if (!request.body) return response.sendStatus(400);

		let { chat_file, character_filename } = request.body;
		fs.unlinkSync(`${chatsPath}${character_filename}/${chat_file}`);
		return response.status(200).send({ res: true });
	} catch (err) {
		console.error(err);
		return response.sendStatus(400).send({ error: err });
	}
});

//Server start
module.exports.express = express;
module.exports.path = path;
module.exports.fs = fs;
module.exports.jsonParser = jsonParser;
module.exports.charaCloudServer = charaCloudServer;
module.exports.client = client;
module.exports.json5 = json5;
module.exports.http = http;
module.exports.https = https;
module.exports.crypto = crypto;
module.exports.updateSettings = updateSettings;
module.exports.urlencodedParser = urlencodedParser;
module.exports.sharp = sharp;
module.exports.charaRead = charaRead;
module.exports.charaWrite = charaWrite;
module.exports.uuid = uuid;
module.exports.characterFormat = characterFormat;
module.exports.charaFormatData = charaFormatData;
module.exports.setCardName = setCardName;
module.exports.utf8Encode = utf8Encode;
module.exports.utf8Decode = utf8Decode;
module.exports.extract = extract;
module.exports.encode = encode;
module.exports.PNGtext = PNGtext;
module.exports.ExifReader = ExifReader;
module.exports.charactersPath = charactersPath;

const charaCloudRoute = require("./routes/characloud");
const e = require("express");

app.use("/api/characloud", charaCloudRoute);

app.listen(server_port, listenIp, function () {
	if (process.env.colab !== undefined) {
		if (process.env.colab == 2) {
			is_colab = true;
		}
	}
	console.log("Launching...");
	initializationCards();
	clearUploads();
	initCardeditor();

	if (autorun) open("http://127.0.0.1:" + server_port);
	console.log("TavernAI started: http://127.0.0.1:" + server_port);
});

function initializationCards() {
	const folderPath = charactersPath;
	// get all files in folder
	let this_format;
	let old_format;
	if (characterFormat === "webp") {
		this_format = "webp";
		old_format = "png";
	} else {
		this_format = "png";
		old_format = "webp";
	}
	fs.readdir(folderPath, async (err, files) => {
		try {
			if (err) {
				console.error("Error reading folder:", err);
				return;
			}
			// add public_id
			for (const file of files) {
				try {
					const filePath = path.join(folderPath, file);
					// check if file is png image
					if (!file.endsWith(`.${this_format}`)) {
						continue;
					}

					// read metadata
					const json_metadata = await charaRead(filePath);
					let metadata = json5.parse(json_metadata);
					// check if metadata contains chara.name
					if (!metadata || !metadata.name) {
						continue;
					}

					if (metadata.public_id) {
						// Check if public_id already exist then pass to next card
						if (metadata.public_id.length === 32) {
							continue;
						}
					}

					metadata = charaFormatData(metadata);
					await charaWrite(
						filePath,
						JSON.stringify(metadata),
						charactersPath + file.replace(`.${this_format}`, ""),
						this_format,
					);
				} catch (error) {
					console.log("Init card error " + file);
					console.log(error);
				}
			}

			// Change format
			for (const file of files) {
				try {
					const filePath = path.join(folderPath, file);
					// check if file is png image
					if (!file.endsWith(`.${old_format}`)) {
						continue;
					}

					// read metadata
					const json_metadata = await charaRead(filePath);
					const metadata = json5.parse(json_metadata);
					// check if metadata contains chara.name
					if (!metadata || !metadata.name) {
						continue;
					}

					// choose target filename
					let targetName = setCardName(file.replace(`.${old_format}`, ""));
					let targetPath = path.join(folderPath, targetName + `.${this_format}`);

					// write image
					await charaWrite(
						filePath,
						JSON.stringify(metadata),
						charactersPath + targetName,
						this_format,
					);

					// delete original file
					if (fs.existsSync(targetPath)) {
						//make to check (need to meake charaWrite is )
						// delete original file
						fs.unlink(filePath, (err) => {
							if (err) {
								console.error("Error deleting file:", err);
							} else {
								console.log(targetName + " has been converted to ." + this_format);
								//console.log('Deleted file:', filePath);
							}
						});
					} else {
						console.error("Error writing file:", targetPath);
					}
				} catch (error) {
					console.log("Convert card error " + file);
					console.log(error);
				}
			}
		} catch (error) {
			console.log(error);
		}
	});
}

function clearUploads() {
	let folderPath = "./uploads";
	fs.readdir(folderPath, (err, files) => {
		if (err) {
			console.error("Error reading folder:", err);
			return;
		}

		for (const file of files) {
			const filePath = path.join(folderPath, file);

			fs.unlink(filePath, (err) => {
				if (err) {
					console.error("Error deleting file:", err);
				} else {
					//console.log('Deleted file:', filePath);
				}
			});
		}
	});
}

function initCardeditor() {
	const folderPath = path.join(process.cwd(), "public", "cardeditor");

	if (fs.existsSync(folderPath)) {
		// Folder exists, delete files created more than 1 hour ago
		fs.readdirSync(folderPath).forEach((file) => {
			try {
				const filePath = path.join(folderPath, file);
				const stats = fs.statSync(filePath);
				const creationTime = stats.birthtime.getTime();
				const hourAgo = Date.now() - 1 * 60 * 60 * 1000;
				if (creationTime < hourAgo) {
					fs.unlinkSync(filePath);
				}
			} catch (err) {
				console.log(err);
			}
		});
	} else {
		// Folder does not exist, create it
		fs.mkdirSync(folderPath);
	}
}

/*

async function processImage(imagePath) {
  for (let i = 0; i < 500; i++) {
    const processedImagePath = imagePath;
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      let qwer = crypto.randomBytes(Math.floor(Math.random() * 2000)).toString('hex');
      let aaa = `{"public_id":"undefined",${qwer}"}`;
      const processedImage = await sharp(imageBuffer).resize(400, 600).webp({'quality':95}).withMetadata({
                        exif: {
                            IFD0: {
                                UserComment: aaa
                            }
                        }
                    }).toBuffer();
      fs.writeFileSync(processedImagePath, processedImage);
      console.log(`Iteration ${i}: Success`);
    } catch (err) {
      console.log(`Iteration ${i}: Error: ${err}`);
    }
  }
}

const imagePath = 'image.webp';
processImage(imagePath);
*/
