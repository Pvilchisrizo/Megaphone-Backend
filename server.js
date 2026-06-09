const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const uri = process.env.MONGO_URI;
const express = require("express");
const path = require("path");
const pwd = require("passwordjs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../megaphone-frontend")));

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
    res.set(`Access-Control-Allow-Methods`, `GET,POST,PATCH,DELETE`);
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

app.post("/signup", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  const existingUser = await db.collection("users").findOne({ username });
  if (existingUser) {
    return res.status(409).json({ message: "Username already exists." });
  }

  const hashedPassword = await pwd.encrypt(password, "bcrypt");
  const insertResult = await db.collection("users").insertOne({
    username,
    hashed_password: hashedPassword,
  });

  return res.status(201).json({
    _id: insertResult.insertedId,
    username,
  });
});

app.post("/login/password", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = await db.collection("users").findOne({ username });
  if (!user) {
    return res.status(401).json({ message: "Incorrect username or password." });
  }

  const isValid = await pwd.compare(password, user.hashed_password, "bcrypt");
  if (!isValid) {
    return res.status(401).json({ message: "Incorrect username or password." });
  }

  return res.json({
    _id: user._id,
    username: user.username,
  });
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
