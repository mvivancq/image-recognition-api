// req.query are in the url query params
// req.params are encoded in url, ex /profile:myprofile
// Can have req.body, req.headers
// Can send status res.status(404).send("not found")
import express from "express";
import cors from "cors";
import { database } from './testData.js';
import bcrypt from "bcrypt";
import { ClarifaiStub, grpc } from "clarifai-nodejs-grpc";
import { Knex } from "knex";

const app = express();
const port = 3001;
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());

const db = Knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 3306,
    user : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
});

app.post('/signin', async (req, res) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(async data => {
      const isValid = await bcrypt.compare(req.body.password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
});

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    bcrypt.hash(password, saltRounds, function(err, hash) {
        db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0].email,
                name: name,
                joined: new Date()
            })
            .then(user => {
                res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
        })
        .catch(err => res.status(400).json('unable to register'))
    });
});

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0].entries);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})

app.get('/imageData', (req, res) => {
    const { IMAGE_URL } = req.query; 
    const YOUR_PERSONAL_ACCESS_TOKEN = '803636ae8c3d4ea5b55e00f12f4242cc';

    const stub = ClarifaiStub.grpc();
    // This will be used by every Clarifai endpoint call
    const metadata = new grpc.Metadata();
    metadata.set("authorization", "Key " + YOUR_PERSONAL_ACCESS_TOKEN);

    stub.PostModelOutputs(
        {
            user_app_id: {
                "user_id": 'anbu-kurama',
                "app_id": 'myFirstApp'
            },
            model_id: 'face-detection',
            inputs: [
                { data: { image: { url: IMAGE_URL } } }
            ]
        },
        metadata,
        (err, response) => {
            if (err) {
                return res.status(400).json(err);
            }
            if (response.status.code !== 10000) {
                return res.status(400).json("Post model outputs failed, status: " + response.status.description);
            }
            // Since we have one input, one output will exist here.
            const output = response.outputs[0].data;
            return res.json(output);
        }
    );
});

app.listen(port);
