const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KYE);

//middleware
app.use(cors());
app.use(express.json());

// mongo setup 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.d64dkmr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// JWt verify 
function verifyJWT(req, res, next) {
    // console.log('token inside JWT', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        // console.log(err, decoded);
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


// main function 
async function run() {
    try {
        const carCollection = client.db('vroomCar').collection('carDetails');
        const productCollection = client.db('vroomCar').collection('products');
        const bookingsCollection = client.db('vroomCar').collection('bookings');
        const usersCollection = client.db('vroomCar').collection('users');
        const paymentsCollection = client.db('vroomCar').collection('payments');
        const advertiseCollection = client.db('vroomCar').collection('advertise');

        // categories data lode 
        app.get('/catagories', async (req, res) => {
            const query = {}
            const cursor = carCollection.find(query);
            const catagories = await cursor.toArray();
            res.send(catagories);
        });

        // product data lode 
        app.get('/products', async (req, res) => {
            const query = {}
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })


        //just seller product see the my product
        app.get('/productsMy', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email };
            const result = await productCollection.find(query).toArray();
            res.send(result);

        });

        // delete myProduct 
        app.delete('/productsMy/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        app.post('/products', async (req, res) => {
            const products = req.body;
            const result = await productCollection.insertOne(products);
            res.send(result);
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

        // booking data get 
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })

        // payment 
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        // send mongo data 
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

        // * seller my products advertise
        app.post('/advertise', async (req, res) => {
            const advertise = req.body;
            const query = {
                product_name: advertise.product_name,
                email: advertise.email
            }
            const alreadyAdvertise = await advertiseCollection.find(query).toArray();

            if (alreadyAdvertise.length > 2) {
                const message = `You already have a advertise`;
                console.log(message);
                return res.send({ acknowledged: false, message });
            }

            const result = await advertiseCollection.insertOne(advertise);
            res.send(result);
        });

        // // * seller advertisement products get the client side
        app.get('/advertise', async (req, res) => {
            const query = {}
            const advertise = await advertiseCollection.find(query).toArray();
            res.send(advertise);
        });


        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = parseInt(booking.price);
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // jwt token make 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '20d' })
                return res.send({ accessToken: token });
            }
            return res.status(403).send({ accessToken: '' })
        })



        // delete button 
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        // specific admin 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        })

        app.get('/users', async (req, res) => {
            let query = {}
            if (req.query.role) {
                query = {
                    role: req.query.role
                }
            };
            const cursor = usersCollection.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            return res.send(result);
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