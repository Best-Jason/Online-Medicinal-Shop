const express = require('express'); // Import express
const mysql = require('mysql2'); // Import mysql
const multer = require('multer'); // Import multer

const app = express(); // Create express app

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/images');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Create MySQL connection 
const connection = mysql.createConnection({ 
    // host: 'localhost', // Your host, usually localhost
    // user: 'root',  // Your username
    // password: '',  // Your password
    // database: 'medschool'  // Your database name


    host: 'db4free.net', // Your host, usually localhost
    user: 'jason1234',  // Your username
    password: 'jason1234',  // Your password
    database: 'medschool123'  // Your database name
});

// Check MySQL connection
connection.connect((err) => {  
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
// Enable static files (img, video, css, js)
app.use(express.static('public'));  
// Enable form processing
app.use(express.urlencoded({ extended: true }));

// Routes

// Get index page
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM profile';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving products');
        }
        res.render('index', { profile: results });
    });
});

app.get('/viewProducts', (req, res) => {
    const searchQuery = req.query.search || '';
    let sql = 'SELECT * FROM medtable';
    if (searchQuery) {
        sql += ' WHERE name LIKE ?';
    }
    connection.query(sql, [`%${searchQuery}%`], (error, results) => {
        if (error) {
            console.error("Error fetching products:", error);
            res.status(500).send('Error fetching products');
        } else {
            res.render('viewProducts', { products: results, searchQuery });
        }
    });
});

app.get('/product/:id', (req, res) => { 
    const productId = req.params.id; 
    const sql = 'SELECT * FROM medtable WHERE productId = ?'; 
    connection.query(sql, [productId], (error, results) => {  
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving products by ID');
        }
        if (results.length > 0) {
            res.render('product', { product: results[0] });
        } else {
            res.status(404).send('Product not found'); 
        }
    });
});

app.get('/addProduct', (req, res) => { 
    res.render('addProduct', { page: 'addProduct' }); 
});

app.post('/addProduct', upload.single('image'), (req, res) => { 
    const { name, quantity, price } = req.body;
    let image = req.file ? req.file.filename : null;
    const sql = 'INSERT INTO medtable (name, quantity, price, image) VALUES (?, ?, ?, ?)';
    connection.query(sql, [name, quantity, price, image], (error, results) => {
        if (error) {
            console.error("Error adding product:", error);
            res.status(500).send('Error adding product');
        } else {
            res.redirect('/addProduct'); 
        }
    });
});

// retrieve first
app.get('/editProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM medtable WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving products by ID');
        }
        if (results.length > 0) {
            res.render('editProduct', { product: results[0] });
        } else {
            res.status(404).send('Product not found'); 
        }
    });
});


// post into database by updating
app.post('/editProduct/:id', upload.single('image'), (req, res) => {
    const { name, quantity, price, existingImage } = req.body;
    const productId = req.params.id;
    let image = req.file ? req.file.filename : existingImage;
    const sql = 'UPDATE medtable SET name = ?, quantity = ?, price = ?, image = ? WHERE productId = ?';
    connection.query(sql, [name, quantity, price, image, productId], (error, results) => {
        if (error) {
            console.error("Error updating product:", error);
            res.status(500).send('Error updating product');
        } else {
            res.redirect('/viewProducts');
        }
    });
});

app.get('/deleteProduct/:id', (req, res) => {
    const productId = req.params.id;
    const sql = 'DELETE FROM medtable WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error("Error deleting product:", error);
            res.status(500).send('Error deleting product');
        } else {
            res.redirect('/viewProducts');
        }
    });
});

// Basket routes
app.get('/basket', (req, res) => {
    const sql = 'SELECT * FROM basket';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving basket items');
        }
        res.render('basket', { basket: results });
    });
});

app.post('/add-to-basket', (req, res) => {
    console.log('Request body:', req.body);

    const { backetId, name, chosenQty, price, image } = req.body;

    if (!name || !chosenQty || !price || !image) {
        console.error('Missing required fields:', { name, chosenQty, price, image });
        return res.status(400).send('Missing required fields');
    }

    const sql = 'INSERT INTO basket (name, chosenQty, price, image) VALUES (?, ?, ?, ?)';
    connection.query(sql, [name, chosenQty, price, image], (error, results) => {
        if (error) {
            console.error("Error adding to basket:", error);
            return res.status(500).send('Error adding to basket');
        } else {
            res.redirect('/basket');
        }
    });
});


app.get('/deleteBasketItem/:id', (req, res) => {
    const basketId = req.params.id;
    
    if (!basketId) {
        return res.status(400).send('Missing basket ID');
    }

    const sql = 'DELETE FROM basket WHERE basketId = ?';
    connection.query(sql, [basketId], (error, results) => {
        if (error) {
            console.error("Error deleting item from basket:", error);
            return res.status(500).send('Error deleting item from basket');
        }
        
        res.redirect('/basket'); // Redirect to the basket page after deletion
    });
});

// Route to display the edit form for a basket item
app.get('/editBasketItem/:id', (req, res) => {
    const basketId = req.params.id;
    const sql = 'SELECT * FROM basket WHERE basketId = ?';
    connection.query(sql, [basketId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving basket item');
        }

        if (results.length > 0) {
            res.render('editBasket', { basketItem: results[0] });
        } else {
            res.status(404).send('Basket item not found');
        }
    });
});

// Route to handle updating the basket item quantity
app.post('/editBasketItem/:id', (req, res) => {
    const basketId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || isNaN(quantity)) {
        return res.status(400).send('Invalid quantity');
    }

    const sql = 'UPDATE basket SET chosenQty = ? WHERE basketId = ?';
    connection.query(sql, [quantity, basketId], (error, results) => {
        if (error) {
            console.error('Error updating basket item quantity:', error.message);
            return res.status(500).send('Error updating basket item');
        }

        res.redirect('/basket');
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
