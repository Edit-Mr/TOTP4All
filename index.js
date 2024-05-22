const express = require('express');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const speakeasy = require('speakeasy');
const path = require('path');

const app = express();
app.use(express.json());

const db = new JsonDB(new Config(path.join(__dirname, '/token.json'), true, true, '/'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

let fakeCode = {};
let cleanCodeStart = false;

app.use('/static', express.static('static'));

// 主页
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/templates/home.html');
});

app.post('/create', (req, res) => {
    const { secret, name } = req.body;
    let keyName = name;
    if (!secret) {
        return res.status(400).send("Secret is required.");
    }
    if (!keyName) {
        keyName = Math.random().toString(36).substring(2, 12);
    }
    const data = db.getData(`/totp/`);
    if (data.hasOwnProperty(keyName)) {
        console.log("WTF");
        console.log(data);
        // 如果没有抛出错误，说明密钥已存在
        return res.status(400).send("Key name already exists.");
    } else {
        // 路径不存在，所以创建一个新的密钥
        db.push(`/totp/${keyName}`, { secret });
        // 可选地打印出数据库以进行调试
        console.log(db.getData("/totp"));
        res.send({ keyName, message: "Secret saved successfully." });
    }
});

app.get('/totp/:keyname', (req, res) => {
    const keyName = req.params.keyname;
    const data = db.getData(`/totp/`);
    let token = '';
    if (data.hasOwnProperty(keyName)) {
        token = speakeasy.totp({
            secret: data[keyName].secret,
            encoding: 'base32'
        });
    } else if (fakeCode.hasOwnProperty(keyName)) {
        token = fakeCode[keyName];
    } else {
        if (!cleanCodeStart) {
            clearFakeCode();
            cleanCodeStart = true;
        }
        token = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        fakeCode[keyName] = token;
        console.log(fakeCode);
    }
    res.render('totp', { token });
});

app.get('/create', (req, res) => {
    res.sendFile(__dirname + '/templates/create.html');
});

const clearFakeCode = () => {
    const countdown = 30 - new Date().getSeconds() % 30;
    setTimeout(() => {
        fakeCode = {};
        cleanCodeStart = false;
    }, countdown * 1000);
}

//404
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/templates/404.html');
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

