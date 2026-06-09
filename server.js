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
});

let db;

async function connectDB() {
  await client.connect();
  db = client.db(process.env.MONGO_DB_NAME);
  console.log("Connected to MongoDB");
}

async function startServer() {
  try {
    await connectDB().catch(console.dir);
    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  } catch (error) {
    console.log("Failed to connect.", error);
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
  const posts = await db.collection("posts").find().toArray();
  res.json(posts);
});

app.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: "../megaphone-frontend" });
});

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
      if (err) {
        return res.status(500).json({ message: "Failed to hash password." });
      }

      const insertResult = await db.collection("users").insertOne({
        username: username,
        hashed_password: hashedPassword.toString("base64"),
        salt: salt.toString("base64"),
      });

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
