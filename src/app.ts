/** @format */

import express, { Request, Response, NextFunction } from "express";
import { JsonDB, Config } from "node-json-db";
var speakeasy = require("speakeasy");
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));
app.use("/static", express.static(path.join(__dirname, "/static")));
console.log(path.join(__dirname, "/static"));

interface TOTPEntry {
    secret: string;
}

const db = new JsonDB(
    new Config(path.join(__dirname, "/token.json"), true, true, "/")
);

let fakeCode: Record<string, string> = {};
let cleanCodeStart = false;

// 主页
app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "/templates/home.html"));
});

app.post("/create", async (req: Request, res: Response) => {
    const { secret, name } = req.body;
    let keyName = name || Math.random().toString(36).substring(2, 12);

    if (!secret) {
        return res
            .status(400)
            .json({ status: "error", message: "Secret is required." });
    }

    try {
        const data = await db.getData(`/totp/${keyName}`);
        return res
            .status(400)
            .json({ status: "error", keyName, message: "Key already exists." });
    } catch (error) {
        db.push(`/totp/${keyName}`, { secret });
        res.json({
            status: "success",
            keyName,
            message: "Secret saved successfully.",
        });
    }
});

app.get("/totp/:keyname", async (req: Request, res: Response) => {
    const keyName = req.params.keyname;
    try {
        const data = await db.getData(`/totp/${keyName}`);
        console.log(data);
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
});

app.post("/totp/:keyname", async (req: Request, res: Response) => {
    const keyName = req.params.keyname;
    try {
        const data = await db.getData(`/totp/${keyName}`);
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
                console.log(secret);
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
});

app.get("/create", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "/templates/create.html"));
});

function generateFakeCode(keyName: string): string {
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
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).sendFile(path.join(__dirname, "/templates/404.html"));
});

app.listen(process.env.PORT || 3030, () => {
    console.log("Server listening on port");
  });
  