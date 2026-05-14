const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

// DB - Usa variables de entorno
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

db.connect((err) => {
    if (err) {
        console.log('Error DB:', err);
    } else {
        console.log('Conectado a MySQL');
    }
});

// ===== MIDDLEWARE PARA VERIFICAR TOKEN =====
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token requerido' });

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
}

// ===== AUTH =====
// REGISTER
app.post('/register', (req, res) => {
    const { nombre, email, password } = req.body;

    if (!nombre ||!email ||!password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const sqlCheck = 'SELECT * FROM usuarios WHERE email =?';

    db.query(sqlCheck, [email], async (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        if (result.length > 0) {
            return res.status(400).json({ message: 'Usuario ya existe' });
        }

        const hash = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO usuarios(nombre,email,password) VALUES (?,?,?)`;

        db.query(sql, [nombre, email, hash], (err) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            res.status(201).json({ message: 'Usuario creado' });
        });
    });
});

// LOGIN
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email ||!password) {
        return res.status(400).json({ message: 'Email y password requeridos' });
    }

    const sql = 'SELECT * FROM usuarios WHERE email =?';

    db.query(sql, [email], async (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        if (result.length === 0) {
            return res.status(401).json({ message: 'No existe usuario' });
        }

        const user = result[0];
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: 'Password incorrecta' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email } });
    });
});

// ===== RUTA RAIZ PARA HEALTH CHECK =====
app.get('/', (req, res) => {
    res.json({ message: 'API Hotel funcionando' });
});

// ===== DASHBOARD =====
app.get('/dashboard', verificarToken, (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM clientes) as clientes,
            (SELECT COUNT(*) FROM habitaciones) as habitaciones,
            (SELECT COUNT(*) FROM reservas WHERE estado = 'activa') as reservas,
            (SELECT COUNT(*) FROM habitaciones WHERE estado = 'disponible') as disponibles
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.log('Error dashboard:', err);
            return res.status(500).json({ message: err.sqlMessage });
        }
        res.json(result[0]);
    });
});

// ===== CLIENTES CRUD =====
app.get('/clientes', verificarToken, (req, res) => {
    db.query('SELECT * FROM clientes ORDER BY id DESC', (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json(result);
    });
});

app.post('/clientes', verificarToken, (req, res) => {
    const { nombre, email, telefono } = req.body;

    if (!nombre ||!email) {
        return res.status(400).json({ message: 'Nombre y email son obligatorios' });
    }

    const sql = 'INSERT INTO clientes (nombre, email, telefono) VALUES (?,?,?)';
    db.query(sql, [nombre, email, telefono], (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.status(201).json({ message: 'Cliente creado', id: result.insertId });
    });
});

app.put('/clientes/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const { nombre, email, telefono } = req.body;
    const sql = 'UPDATE clientes SET nombre=?, email=?, telefono=? WHERE id=?';
    db.query(sql, [nombre, email, telefono, id], (err) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json({ message: 'Cliente actualizado' });
    });
});

app.delete('/clientes/:id', verificarToken, (req, res) => {
    db.query('DELETE FROM clientes WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json({ message: 'Cliente eliminado' });
    });
});

// ===== HABITACIONES CRUD =====
app.get('/habitaciones', verificarToken, (req, res) => {
    db.query('SELECT * FROM habitaciones ORDER BY numero', (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json(result);
    });
});

app.post('/habitaciones', verificarToken, (req, res) => {
    const { numero, tipo, precio, estado } = req.body;

    if (!numero ||!tipo ||!precio) {
        return res.status(400).json({ message: 'Numero, tipo y precio son obligatorios' });
    }

    const sql = 'INSERT INTO habitaciones (numero, tipo, precio, estado) VALUES (?,?,?,?)';
    db.query(sql, [numero, tipo, precio, estado || 'disponible'], (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.status(201).json({ message: 'Habitación creada', id: result.insertId });
    });
});

app.put('/habitaciones/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const { numero, tipo, precio, estado } = req.body;
    const sql = 'UPDATE habitaciones SET numero=?, tipo=?, precio=?, estado=? WHERE id=?';
    db.query(sql, [numero, tipo, precio, estado, id], (err) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json({ message: 'Habitación actualizada' });
    });
});

app.delete('/habitaciones/:id', verificarToken, (req, res) => {
    db.query('DELETE FROM habitaciones WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json({ message: 'Habitación eliminada' });
    });
});

// ===== RESERVAS CRUD =====
app.get('/reservas', verificarToken, (req, res) => {
    const sql = `
        SELECT r.*, c.nombre as cliente_nombre, h.numero as habitacion_numero
        FROM reservas r
        LEFT JOIN clientes c ON r.cliente_id = c.id
        LEFT JOIN habitaciones h ON r.habitacion_id = h.id
        ORDER BY r.id DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json(result);
    });
});

app.post('/reservas', verificarToken, (req, res) => {
    const { cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado } = req.body;
    const user_id = req.user.id;

    if (!cliente_id ||!habitacion_id ||!fecha_entrada ||!fecha_salida ||!total) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    if (new Date(fecha_salida) <= new Date(fecha_entrada)) {
        return res.status(400).json({ message: 'La fecha de salida debe ser mayor a la de entrada' });
    }

    const sql = `INSERT INTO reservas (user_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado)
                 VALUES (?,?,?,?,?,?,?)`;

    db.query(sql, [user_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado || 'activa'], (err, result) => {
        if (err) {
            console.log('Error al crear reserva:', err);
            return res.status(400).json({ message: err.sqlMessage || 'Error al crear reserva' });
        }

        db.query('UPDATE habitaciones SET estado = "ocupada" WHERE id =?', [habitacion_id]);
        res.status(201).json({ message: 'Reserva creada', id: result.insertId });
    });
});

app.put('/reservas/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const { cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado } = req.body;
    const sql = `UPDATE reservas SET cliente_id=?, habitacion_id=?, fecha_entrada=?,
                 fecha_salida=?, total=?, estado=? WHERE id=?`;
    db.query(sql, [cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado, id], (err) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json({ message: 'Reserva actualizada' });
    });
});

app.delete('/reservas/:id', verificarToken, (req, res) => {
    db.query('SELECT habitacion_id FROM reservas WHERE id=?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });

        const habitacion_id = result[0]?.habitacion_id;

        db.query('DELETE FROM reservas WHERE id=?', [req.params.id], (err) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });

            if (habitacion_id) {
                db.query('UPDATE habitaciones SET estado = "disponible" WHERE id =?', [habitacion_id]);
            }

            res.json({ message: 'Reserva eliminada' });
        });
    });
});

// SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor en puerto ${PORT}`);
});