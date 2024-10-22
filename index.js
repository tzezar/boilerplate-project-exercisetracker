const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

//* Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Listening on port ${process.env.PORT || 3000}`);
    });
    return mongoose.connection.db.collection('urls').countDocuments();
  })
  .then(count => {
    console.log(`Document count in urls collection: ${count}`);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

//* Schemas
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, default: new Date().toISOString().substring(0, 10) },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

//* Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

//* Endpoints

// Delete all users
app.get('/api/users/delete', async (_req, res) => {
  console.log('### Delete all users ###');
  try {
    const result = await User.deleteMany({});
    res.json({ message: 'All users have been deleted!', result });
  } catch (err) {
    console.error('Error deleting users:', err);
    res.status(500).json({ message: 'Deleting all users failed!' });
  }
});

// Delete all exercises
app.get('/api/exercises/delete', async (_req, res) => {
  console.log('### Delete all exercises ###');
  try {
    const result = await Exercise.deleteMany({});
    res.json({ message: 'All exercises have been deleted!', result });
  } catch (err) {
    console.error('Error deleting exercises:', err);
    res.status(500).json({ message: 'Deleting all exercises failed!' });
  }
});

// Serve index file
app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Get all users
app.get('/api/users', async (_req, res) => {
  console.log('### Get all users ###');
  try {
    const users = await User.find({});
    if (users.length === 0) {
      return res.json({ message: 'There are no users in the database!' });
    }
    console.log('Users in database:', users.length);
    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ message: 'Getting all users failed!' });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const inputUsername = req.body.username;
  console.log('### Create a new user ###');

  try {
    const newUser = new User({ username: inputUsername });
    const user = await newUser.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'User creation failed!' });
  }
});

// Add a new exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date = new Date().toISOString().substring(0, 10) } = req.body;
  console.log('### Add a new exercise ###');

  try {
    const userInDb = await User.findById(userId);
    if (!userInDb) {
      return res.status(404).json({ message: 'User not found!' });
    }

    const newExercise = new Exercise({
      userId: userInDb._id,
      username: userInDb.username,
      description,
      duration: parseInt(duration, 10),
      date,
    });

    const exercise = await newExercise.save();
    res.json({
      username: userInDb.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: userInDb._id,
    });
  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).json({ message: 'Exercise creation failed!' });
  }
});

// Get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const from = req.query.from || new Date(0).toISOString().substring(0, 10);
  const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
  const limit = Number(req.query.limit) || 0;

  console.log('### Get the log from a user ###');

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    const exercises = await Exercise.find({
      userId: userId,
      date: { $gte: from, $lte: to },
    })
      .select('description duration date')
      .limit(limit)
      .exec();

    const parsedDatesLog = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: parsedDatesLog.length,
      log: parsedDatesLog,
    });
  } catch (err) {
    console.error('Error getting user logs:', err);
    res.status(500).json({ message: 'Error retrieving user logs!' });
  }
});
