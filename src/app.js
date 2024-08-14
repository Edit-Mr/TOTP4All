/** @format */

"use strict";
/** @format */
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected);
            }
            step(
                (generator = generator.apply(thisArg, _arguments || [])).next()
            );
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_json_db_1 = require("node-json-db");
var speakeasy = require("speakeasy");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path_1.default.join(__dirname, "templates"));
app.use(
    "/static",
    express_1.default.static(path_1.default.join(__dirname, "/static"))
);
const db = new node_json_db_1.JsonDB(
    new node_json_db_1.Config(
        path_1.default.join(__dirname, "/token.json"),
        true,
        true,
        "/"
    )
);
let fakeCode = {};
let cleanCodeStart = false;
// 主页
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "/templates/home.html"));
});
app.post("/create", (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const { secret, name } = req.body;
        let keyName = name || Math.random().toString(36).substring(2, 12);
        if (!secret) {
            return res
                .status(400)
                .json({ status: "error", message: "Secret is required." });
        }
        try {
            const data = yield db.getData(`/totp/${keyName}`);
            return res
                .status(400)
                .json({
                    status: "error",
                    keyName,
                    message: "Key already exists.",
                });
        } catch (error) {
            db.push(`/totp/${keyName}`, { secret });
            res.json({
                status: "success",
                keyName,
                message: "Secret saved successfully.",
            });
        }
    })
);
app.get("/totp/:keyname", (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const keyName = req.params.keyname;
        try {
            const data = yield db.getData(`/totp/${keyName}`);
            const token = speakeasy.totp({
                secret: data.secret,
                encoding: "base32",
            });
            res.render("totp", { token, keyName });
            db.push(`/totp/${keyName}/lastAccess`, new Date().toISOString());
        } catch (error) {
            console.log("lol");
            let token = fakeCode[keyName] || generateFakeCode(keyName);
            res.render("totp", { token, keyName });
            db.push(`/totp/${keyName}/lastAccess`, new Date().toISOString());
        }
    })
);
app.post("/totp/:keyname", (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const keyName = req.params.keyname;
        try {
            const data = yield db.getData(`/totp/${keyName}`);
            let { secret } = data;
            let { password } = req.body;
            if (password) {
                const all = "abcdefghijklmnopqrstuvwxyz0123456789";
                if (secret) {
                    secret = secret.split("");
                    for (var j = password.length - 1; j >= 0; j--) {
                        let index =
                            all.indexOf(secret[j % secret.length]) -
                            password[j].charCodeAt(0);
                        while (index < 0) {
                            index += all.length;
                        }
                        secret[j % secret.length] = all[index];
                    }
                    secret = secret.join("");
                }
            }
            const token = speakeasy.totp({
                secret: secret,
                encoding: "base32",
            });
            res.render("totp", { token, keyName });
            db.push(`/totp/${keyName}/lastAccess`, new Date().toISOString());
        } catch (error) {
            let token = fakeCode[keyName] || generateFakeCode(keyName);
            res.render("totp", { token, keyName });
            db.push(`/totp/${keyName}/lastAccess`, new Date().toISOString());
        }
    })
);
app.get("/create", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "/templates/create.html"));
});
function generateFakeCode(keyName) {
    if (!cleanCodeStart) clearFakeCode();
    const token = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
    fakeCode[keyName] = token;
    return token;
}
const clearFakeCode = () => {
    const countdown = 31 - (new Date().getSeconds() % 30);
    setTimeout(() => {
        fakeCode = {};
        cleanCodeStart = false;
    }, countdown * 1000);
};
//404
app.use((req, res, next) => {
    res.status(404).sendFile(
        path_1.default.join(__dirname, "/templates/404.html")
    );
});
app.listen(process.env.PORT || 3030, () => {
    console.log("Server listening on port");
});
