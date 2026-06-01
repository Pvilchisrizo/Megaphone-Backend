// importing packages
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const uri = process.env.MONGO_URI;
const express = require("express");
const crypto = require("crypto"); // we require this is package with node for crytography, no need to do nom star or anything

const app = express();
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: false,
});

let db;

async function connectDB() {
  await client.connect();
  db = client.db(process.env.MONGO_DB_NAME);
  console.log("Megaphone-Paloma");
}

async function startServer() {
  try {
    await connectDB();
    app.listen(process.env.PORT || 3000, () => {
      console.log("Server running");
    });
  } catch (error) {
    console.log("Failed to connect.", error);
    process.exit(1);
  }
}

app.use((req, res, next) => {
  res.set(`Access-Control-Allow-Origin`, `*`);

  if (req.method === `OPTIONS`) {
    res.set(`Access-Control-Allow-Methods`, `POST,PATCH,DELETE`);
    res.set(`Access-Control-Allow-Headers`, `Content-Type`);
    return res.sendStatus(204);
  }

  next();
});
startServer();

app.get("/", (req, res) => {
  res.send("The server is running 🔊.");
});

app.get("/posts", async (req, res) => {
  try {
    const posts = await db.collection("posts").find().toArray();
    res.json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/signin", async (req, res) => {
  res.sendFile("signin.html", { root: "../Megaphone-Frontend" });
  // root is telling where to go to get the file, up a level then Megaphone-Fronted
});

// we add a new route in order to create a user and we test it in postman
app.post("/users", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const salt = crypto.randomBytes(16);

  crypto.pbkdf2(
    password,
    salt,
    310000,
    32,
    "sha256",
    async (err, hashedPassword) => {
      //310000 is the standard number or iterations, 32 bits is how long the hash will be
      if (err) {
        return res.status(500).json({ message: "Failed to hash password." });
      }
      //if no errors then we can add our new user to the data base
      const insertResult = await db.collection("users").insertOne({
        //with MondoDB as soon as we run the insertResult the collection is created in this case users// we used underscore because camelcase is a js standard not a DB
        username: username,
        hashed_password: hashedPassword.toString("base64"),
        salt: salt.toString("base64"),
      });

      // the .status are the number of the browser response .....google it
      return res.status(201).json({
        _id: insertResult.insertId,
        username: username,
      });
    }
  );
});

app.post("/posts", async (req, res) => {
  const newPost = {
    body: req.body.body,
    author: req.body.author,
    timecreated: Date.now(),
  };

  const insertResult = await db.collection("posts").insertOne(newPost);

  res.status(201).json({
    _id: insertResult.insertedId,
    body: newPost.body,
    author: newPost.author,
    timecreated: newPost.timecreated,
  });
});

app.delete("/posts/:id", async (req, res) => {
  await db.collection("posts").deleteOne({
    _id: new ObjectId(req.params.id),
  });
  res.end();
});
