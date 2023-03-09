// const name = require('./script2');
// import { name } from './script2'
// export const number = ...
//If you are using Express 4.16+ you can now replace that with:
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// req.query are in the url query params
// req.params are encoded in url, ex /profile:myprofile
// Can have req.body, req.headers
// Can send status res.status(404).send("not found")

app.get('/profile', (req, res) => {
    console.log(req.query);
    res.send("test get");
});

app.post('/profile', (req, res) => {
    console.log(req.body);
    const user = {
        name: "Martin",
    }
    res.send(user);
});

app.put('/profile', (req, res) => {
    res.send("test put");
});

app.delete('/profile', (req, res) => {
    res.send("test delete");
});

