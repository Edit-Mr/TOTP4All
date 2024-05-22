const express = require('express');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const speakeasy = require('speakeasy');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const db = new JsonDB(new Config(path.join(__dirname, '/token.json'), true, true, '/'))

// static folder to /static
app.use('/static', express.static('static'));

//home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/templates/home.html');
});

// Endpoint to add a TOTP secret
app.post('/api/totp', (req, res) => {
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
        // If no error is thrown, it means the key already exists
        return res.status(400).send("Key name already exists.");
    } else {
        // Path does not exist, so create a new key
        db.push(`/totp/${keyName}`, { secret });
        // Optionally print out the database for debugging
        console.log(db.getData("/totp"));
        res.send({ keyName, message: "Secret saved successfully." });
    }

});

// Endpoint to retrieve the TOTP code
app.get('/totp/:keyname', (req, res) => {
    const keyName = req.params.keyname;

    try {
        const data = db.getData(`/totp/${keyName}`);
        const token = speakeasy.totp({
            secret: data.secret,
            encoding: 'base32'
        });
        res.render('totp', { token });

    } catch (error) {
        res.status(404).send("Key not found.");
    }
});

app.get('/create', (req, res) => {
    res.sendFile(__dirname + '/templates/create.html');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
