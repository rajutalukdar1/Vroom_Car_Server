const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());

// mongo setup 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.d64dkmr.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const carCollection = client.db('vroomCar').collection('carDetails');
        const productCollection = client.db('vroomCar').collection('products');


        app.get('/catagories', async (req, res) => {
            const query = {}
            const cursor = carCollection.find(query);
            const catagories = await cursor.toArray();
            res.send(catagories);
        })
    }
    finally {

    }
}
run().catch(error => console.log(error))


app.get('/', async (req, res) => {
    res.send('vroom server is running');
})

app.listen(port, () => console.log(`vroom server is running ${port}`))