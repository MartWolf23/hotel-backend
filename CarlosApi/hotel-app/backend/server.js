const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// ===== DEBUG ENV - BORRAR DESPUÉS DE PROBAR =====
console.log('=== RAILWAY ENV CHECK ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL? 'OK' : 'FALTA');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY? 'OK' : 'FALTA');
console.log('JWT_SECRET:', process.env.JWT_SECRET? 'OK' : 'FALTA');
console.log('========================');

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// ===== SUPABASE CLIENT =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ===== RUTA RAIZ PARA HEALTH CHECK =====
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API Hotel funcionando',
    timestamp: new Date().toISOString()
  });
});

// ===== MIDDLEWARE PARA VERIFICAR TOKEN =====
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token requerido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

// ===== AUTH =====
// REGISTER
app.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre ||!email ||!password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const { data: existing } = await supabase
   .from('usuarios')
   .select('id')
   .eq('email', email)
   .maybeSingle();

  if (existing) {
    return res.status(400).json({ message: 'Usuario ya existe' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { error } = await supabase
   .from('usuarios')
   .insert([{ nombre, email, password: hash }]);

  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json({ message: 'Usuario creado' });
});

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email ||!password) {
    return res.status(400).json({ message: 'Email y password requeridos' });
  }

  const { data: user, error } = await supabase
   .from('usuarios')
   .select('*')
   .eq('email', email)
   .single();

  if (error ||!user) {
    return res.status(401).json({ message: 'No existe usuario' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: 'Password incorrecta' });
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email } });
});

// ===== DASHBOARD =====
app.get('/dashboard', verificarToken, async (req, res) => {
  const { count: clientesCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
  const { count: habitacionesCount } = await supabase.from('habitaciones').select('*', { count: 'exact', head: true });
  const { count: reservasCount } = await supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('estado', 'activa');
  const { count: disponiblesCount } = await supabase.from('habitaciones').select('*', { count: 'exact', head: true }).eq('estado', 'disponible');

  res.json({
    clientes: clientesCount || 0,
    habitaciones: habitacionesCount || 0,
    reservas: reservasCount || 0,
    disponibles: disponiblesCount || 0
  });
});

// ===== CLIENTES CRUD =====
app.get('/clientes', verificarToken, async (req, res) => {
  const { data, error } = await supabase
   .from('clientes')
   .select('*')
   .order('id', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post('/clientes', verificarToken, async (req, res) => {
  const { nombre, email, telefono } = req.body;

  if (!nombre ||!email) {
    return res.status(400).json({ message: 'Nombre y email son obligatorios' });
  }

  const { data, error } = await supabase
   .from('clientes')
   .insert([{ nombre, email, telefono }])
   .select()
   .single();

  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json({ message: 'Cliente creado', id: data.id });
});

app.put('/clientes/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono } = req.body;

  const { error } = await supabase
   .from('clientes')
   .update({ nombre, email, telefono })
   .eq('id', id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Cliente actualizado' });
});

app.delete('/clientes/:id', verificarToken, async (req, res) => {
  const { error } = await supabase
   .from('clientes')
   .delete()
   .eq('id', req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Cliente eliminado' });
});

// ===== HABITACIONES CRUD =====
app.get('/habitaciones', verificarToken, async (req, res) => {
  const { data, error } = await supabase
   .from('habitaciones')
   .select('*')
   .order('numero', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post('/habitaciones', verificarToken, async (req, res) => {
  const { numero, tipo, precio, estado } = req.body;

  if (!numero ||!tipo ||!precio) {
    return res.status(400).json({ message: 'Numero, tipo y precio son obligatorios' });
  }

  const { data, error } = await supabase
   .from('habitaciones')
   .insert([{ numero, tipo, precio, estado: estado || 'disponible' }])
   .select()
   .single();

  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json({ message: 'Habitación creada', id: data.id });
});

app.put('/habitaciones/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { numero, tipo, precio, estado } = req.body;

  const { error } = await supabase
   .from('habitaciones')
   .update({ numero, tipo, precio, estado })
   .eq('id', id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Habitación actualizada' });
});

app.delete('/habitaciones/:id', verificarToken, async (req, res) => {
  const { error } = await supabase
   .from('habitaciones')
   .delete()
   .eq('id', req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Habitación eliminada' });
});

// ===== RESERVAS CRUD =====
app.get('/reservas', verificarToken, async (req, res) => {
  const { data, error } = await supabase
   .from('reservas')
   .select(`
      *,
      clientes (nombre),
      habitaciones (numero)
    `)
   .order('id', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  const reservas = data.map(r => ({
   ...r,
    cliente_nombre: r.clientes?.nombre,
    habitacion_numero: r.habitaciones?.numero
  }));

  res.json(reservas);
});

app.post('/reservas', verificarToken, async (req, res) => {
  const { cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado } = req.body;
  const user_id = req.user.id;

  if (!cliente_id ||!habitacion_id ||!fecha_entrada ||!fecha_salida ||!total) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  if (new Date(fecha_salida) <= new Date(fecha_entrada)) {
    return res.status(400).json({ message: 'La fecha de salida debe ser mayor a la de entrada' });
  }

  const { data, error } = await supabase
   .from('reservas')
   .insert([{
      user_id,
      cliente_id,
      habitacion_id,
      fecha_entrada,
      fecha_salida,
      total,
      estado: estado || 'activa'
    }])
   .select()
   .single();

  if (error) {
    console.log('Error al crear reserva:', error);
    return res.status(400).json({ message: error.message || 'Error al crear reserva' });
  }

  await supabase
   .from('habitaciones')
   .update({ estado: 'ocupada' })
   .eq('id', habitacion_id);

  res.status(201).json({ message: 'Reserva creada', id: data.id });
});

app.put('/reservas/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado } = req.body;

  const { error } = await supabase
   .from('reservas')
   .update({ cliente_id, habitacion_id, fecha_entrada, fecha_salida, total, estado })
   .eq('id', id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Reserva actualizada' });
});

app.delete('/reservas/:id', verificarToken, async (req, res) => {
  const { data: reserva } = await supabase
   .from('reservas')
   .select('habitacion_id')
   .eq('id', req.params.id)
   .single();

  const { error } = await supabase
   .from('reservas')
   .delete()
   .eq('id', req.params.id);

  if (error) return res.status(500).json({ message: error.message });

  if (reserva?.habitacion_id) {
    await supabase
     .from('habitaciones')
     .update({ estado: 'disponible' })
     .eq('id', reserva.habitacion_id);
  }

  res.json({ message: 'Reserva eliminada' });
});

// SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en puerto ${PORT}`);
});