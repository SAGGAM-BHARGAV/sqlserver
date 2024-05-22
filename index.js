const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nearby',
});

// POST route to add user details
app.post('/userdata', upload.single('image'), (req, res) => {
  const { Textarea, Mobile, password, State, District, Category, duration } = req.body;
  const imagePath = req.file ? req.file.path : '';
  console.log('Request Body:', req.body);
  const query = 'INSERT INTO userdata (Textarea, Mobile, password, Image, State, District, Category, duration, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())';
  db.query(query, [Textarea || '', Mobile || '', password || '', imagePath, State || '', District || '', Category || '', duration || ''], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error adding user details');
    }
    res.send('User details added successfully');
  });
});

// GET route to fetch all user details
app.get('/', (req, res) => {
  const query = 'SELECT * FROM userdata';
  db.query(query, (err, results) => {
    if (err) throw err;
    const filteredResults = results.map(post => {
      const filteredPost = {};
      for (const key in post) {
        if (post[key] !== '' && post[key] !== 0) {
          filteredPost[key] = post[key];
        }
      }
      return filteredPost;
    });
    res.json(filteredResults);
  });
});

// PUT route to update user details
app.put('/userdata/:id', upload.single('image'), (req, res) => {
  const userId = req.params.id;
  const { Textarea, Mobile, password, State, District, Category } = req.body;
  const imagePath = req.file ? req.file.path : '';

  let query;
  let queryParams;

  if (imagePath) {
    query = 'UPDATE userdata SET Textarea = ?, Mobile = ?,  password = ?, Image = ?, State = ?, District = ?, Category = ? WHERE ID = ?';
    queryParams = [Textarea || '', Mobile || '', password || '', imagePath, State || '', District || '', Category || '', userId];
  } else {
    query = 'UPDATE userdata SET Textarea = ?, Mobile = ?, password = ?, State = ?, District = ?, Category = ? WHERE ID = ?';
    queryParams = [Textarea || '', Mobile || '', password || '', State || '', District || '', Category || '', userId];
  }

  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error adding user details');
    }
    res.send('User details added successfully');
  });
});

// DELETE route to delete user details
app.delete('/userdata/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT Image FROM userdata WHERE ID = ?';
  db.query(query, [userId], (err, result) => {
    if (err) throw err;
    const imagePath = result[0].Image;
    if (imagePath) {
      fs.unlink(imagePath, (err) => {
        if (err) throw err;
        const deleteQuery = 'DELETE FROM userdata WHERE ID = ?';
        db.query(deleteQuery, [userId], (err, result) => {
          if (err) throw err;
          res.send('User details deleted successfully');
        });
      });
    } else {
      const deleteQuery = 'DELETE FROM userdata WHERE ID = ?';
      db.query(deleteQuery, [userId], (err, result) => {
        if (err) throw err;
        res.send('User details deleted successfully');
      });
    }
  });
});

// Function to delete expired posts
const deleteExpiredPosts = () => {
  const query = 'SELECT ID, Image FROM userdata WHERE NOW() > DATE_ADD(createdAt, INTERVAL duration SECOND)';
  db.query(query, (err, results) => {
    if (err) throw err;
    results.forEach((post) => {
      const deleteQuery = 'DELETE FROM userdata WHERE ID = ?';
      db.query(deleteQuery, [post.ID], (err, result) => {
        if (err) throw err;
        if (post.Image) {
          fs.unlink(post.Image, (err) => {
            if (err) console.error(`Failed to delete image file: ${err.message}`);
          });
        }
      });
    });
  });
};
 
setInterval(deleteExpiredPosts, 5000);

// New route to search posts based on state, district, and category
app.get('/search', (req, res) => {
  const { state, district, category, Mobile, password } = req.query;
  let query = 'SELECT * FROM userdata WHERE 1=1';
  const queryParams = [];

  if (state) {
    query += ' AND State = ?';
    queryParams.push(state);
  }
  if (district) {
    query += ' AND District = ?';
    queryParams.push(district);
  }
  if (category) {
    query += ' AND Category = ?';
    queryParams.push(category);
  }
  if (Mobile) {
    query += ' AND Mobile = ?';
    queryParams.push(Mobile);
  }
  if (password) {
    query += ' AND password = ?';
    queryParams.push(password);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) throw err;
    const filteredResults = results.map(post => {
      const filteredPost = {};
      for (const key in post) {
        if (post[key] !== '' && post[key] !== 0) {
          filteredPost[key] = post[key];
        }
      }
      return filteredPost;
    });
    res.json(filteredResults);
  });
});
 
 


 