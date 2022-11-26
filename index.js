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
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const carCollection = client.db('vroomCar').collection('carDetails');
        const productCollection = client.db('vroomCar').collection('products');
        const bookingsCollection = client.db('vroomCar').collection('bookings');
        const usersCollection = client.db('vroomCar').collection('users');


        app.get('/catagories', async (req, res) => {
            const query = {}
            const cursor = carCollection.find(query);
            const catagories = await cursor.toArray();
            res.send(catagories);
        });

        app.get('/products', async (req, res) => {
            const query = {}
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/products/:car_id', async (req, res) => {
            const query = req.params.car_id;
            // console.log(query);
            const filter = {
                product_id: query
            }
            const result = await productCollection.find(filter).toArray();
            res.send(result)
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const query = {
                product_name: booking.product_name,
                email: booking.email
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already ha a Booking this car ${booking.product_name}`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // app.get('/bookings', async (req, res) => {
        //     const query = {}
        //     const result = await bookingsCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
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