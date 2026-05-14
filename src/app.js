require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const Stripe = require('stripe');

const { run, get, all } = require('./database/database');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, barbershop_id: user.barbershop_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authPage(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.redirect('/login');
  }
}

function adminPage(req, res, next) {
  if (!['admin', 'barber'].includes(req.user.role)) return res.redirect('/client');
  next();
}

function clientPage(req, res, next) {
  if (req.user.role !== 'client') return res.redirect('/admin');
  next();
}

function authApi(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success:false, message:'No autenticado' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success:false, message:'Sesión inválida' });
  }
}

function only(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ success:false, message:'Sin permisos' });
    next();
  };
}

app.get('/', (req, res) => res.render('pages/index', { title:'BarberFlow | Barbería Premium' }));
app.get('/login', (req, res) => res.render('pages/login', { title:'Ingresar | BarberFlow' }));
app.get('/register', (req, res) => res.render('pages/register', { title:'Registro | BarberFlow' }));

app.get('/dashboard', authPage, (req, res) => {
  if (req.user.role === 'client') return res.redirect('/client');
  return res.redirect('/admin');
});

app.get('/admin', authPage, adminPage, (req, res) => {
  res.render('pages/admin', { title:'Panel Admin | BarberFlow', user:req.user });
});

app.get('/client', authPage, clientPage, (req, res) => {
  res.render('pages/client', { title:'Reservar Hora | BarberFlow', user:req.user });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { barbershop_name, name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success:false, message:'Completa todos los campos obligatorios' });
    }

    const finalRole = role || 'client';
    let barbershopId = null;

    if (finalRole === 'admin') {
      const shop = await run(
        'INSERT INTO barbershops(name,email,phone) VALUES(?,?,?)',
        [barbershop_name || 'Gentleman Barber Club', email, '']
      );

      barbershopId = shop.id;

      await run(
        'INSERT INTO subscriptions(barbershop_id,plan,status,amount) VALUES(?,?,?,?)',
        [barbershopId, 'premium', 'active', 29990]
      );
    } else {
      const shop = await get('SELECT id FROM barbershops ORDER BY id ASC LIMIT 1');
      if (!shop) return res.status(400).json({ success:false, message:'Primero debe existir una barbería admin' });
      barbershopId = shop.id;
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await run(
      'INSERT INTO users(barbershop_id,name,email,password,role) VALUES(?,?,?,?,?)',
      [barbershopId, name, email, hash, finalRole]
    );

    if (finalRole === 'admin') {
      await run('INSERT INTO services(barbershop_id,name,duration,price,description) VALUES(?,?,?,?,?)', [barbershopId,'Corte clásico',45,15000,'Corte tradicional premium']);
      await run('INSERT INTO services(barbershop_id,name,duration,price,description) VALUES(?,?,?,?,?)', [barbershopId,'Fade premium',60,22000,'Degradado profesional']);
      await run('INSERT INTO services(barbershop_id,name,duration,price,description) VALUES(?,?,?,?,?)', [barbershopId,'Barba ritual',35,14000,'Perfilado, navaja y cuidado']);
      await run('INSERT INTO services(barbershop_id,name,duration,price,description) VALUES(?,?,?,?,?)', [barbershopId,'Combo gentleman',90,32000,'Corte + barba + styling']);

      await run('INSERT INTO barbers(barbershop_id,name,email,phone,specialty) VALUES(?,?,?,?,?)', [barbershopId,'Tomás Herrera','tomas@barberflow.cl','','Fade & barba']);
      await run('INSERT INTO barbers(barbershop_id,name,email,phone,specialty) VALUES(?,?,?,?,?)', [barbershopId,'Andrés Silva','andres@barberflow.cl','','Corte clásico']);
    }

    res.json({ success:true, message:'Cuenta creada correctamente', user_id:user.id });
  } catch (err) {
    res.status(400).json({ success:false, message: err.message.includes('UNIQUE') ? 'Ese correo ya está registrado' : err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await get('SELECT * FROM users WHERE email=?', [email]);
  if (!user) return res.status(401).json({ success:false, message:'Credenciales incorrectas' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ success:false, message:'Credenciales incorrectas' });

  const token = createToken(user);

  res.cookie('token', token, { httpOnly:true, sameSite:'lax' });

  res.json({
    success:true,
    redirect:user.role === 'client' ? '/client' : '/admin'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success:true });
});

app.get('/api/metrics', authApi, only('admin','barber'), async (req, res) => {
  const shop = req.user.barbershop_id;
  const today = new Date().toISOString().slice(0,10);

  const todayBookings = await get('SELECT COUNT(*) total FROM bookings WHERE barbershop_id=? AND booking_date=? AND status!="cancelled"', [shop, today]);
  const revenue = await get('SELECT COALESCE(SUM(s.price),0) total FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.barbershop_id=? AND b.status!="cancelled"', [shop]);
  const clients = await get('SELECT COUNT(*) total FROM users WHERE barbershop_id=? AND role="client"', [shop]);
  const totalBookings = await get('SELECT COUNT(*) total FROM bookings WHERE barbershop_id=? AND status!="cancelled"', [shop]);

  res.json({
    success:true,
    metrics:{
      today:todayBookings.total,
      revenue:revenue.total,
      clients:clients.total,
      occupancy:Math.min(100, totalBookings.total * 8)
    }
  });
});

app.get('/api/services', authApi, async (req, res) => {
  const rows = await all('SELECT * FROM services WHERE barbershop_id=? AND active=1 ORDER BY id DESC', [req.user.barbershop_id]);
  res.json({ success:true, data:rows });
});

app.post('/api/services', authApi, only('admin'), async (req, res) => {
  const { name, duration, price, description } = req.body;
  if (!name || !duration || !price) return res.status(400).json({ success:false, message:'Faltan datos' });

  const item = await run(
    'INSERT INTO services(barbershop_id,name,duration,price,description) VALUES(?,?,?,?,?)',
    [req.user.barbershop_id, name, duration, price, description || '']
  );

  res.json({ success:true, id:item.id });
});

app.delete('/api/services/:id', authApi, only('admin'), async (req, res) => {
  await run('UPDATE services SET active=0 WHERE id=? AND barbershop_id=?', [req.params.id, req.user.barbershop_id]);
  res.json({ success:true });
});

app.get('/api/barbers', authApi, async (req, res) => {
  const rows = await all('SELECT * FROM barbers WHERE barbershop_id=? AND active=1 ORDER BY id DESC', [req.user.barbershop_id]);
  res.json({ success:true, data:rows });
});

app.post('/api/barbers', authApi, only('admin'), async (req, res) => {
  const { name, email, phone, specialty } = req.body;
  if (!name) return res.status(400).json({ success:false, message:'Nombre obligatorio' });

  const item = await run(
    'INSERT INTO barbers(barbershop_id,name,email,phone,specialty) VALUES(?,?,?,?,?)',
    [req.user.barbershop_id, name, email || '', phone || '', specialty || '']
  );

  res.json({ success:true, id:item.id });
});

app.delete('/api/barbers/:id', authApi, only('admin'), async (req, res) => {
  await run('UPDATE barbers SET active=0 WHERE id=? AND barbershop_id=?', [req.params.id, req.user.barbershop_id]);
  res.json({ success:true });
});

app.get('/api/bookings', authApi, async (req, res) => {
  let rows;

  if (req.user.role === 'client') {
    rows = await all(`
      SELECT b.*, s.name service_name, s.price, br.name barber_name
      FROM bookings b
      JOIN services s ON s.id=b.service_id
      JOIN barbers br ON br.id=b.barber_id
      WHERE b.barbershop_id=? AND b.client_id=?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `, [req.user.barbershop_id, req.user.id]);
  } else {
    rows = await all(`
      SELECT b.*, s.name service_name, s.price, br.name barber_name
      FROM bookings b
      JOIN services s ON s.id=b.service_id
      JOIN barbers br ON br.id=b.barber_id
      WHERE b.barbershop_id=?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `, [req.user.barbershop_id]);
  }

  res.json({ success:true, data:rows });
});

app.post('/api/bookings', authApi, async (req, res) => {
  try {
    const { client_name, client_email, barber_id, service_id, booking_date, booking_time, notes } = req.body;

    if (!client_name || !barber_id || !service_id || !booking_date || !booking_time) {
      return res.status(400).json({ success:false, message:'Completa los datos de la reserva' });
    }

    const exists = await get(
      'SELECT id FROM bookings WHERE barber_id=? AND booking_date=? AND booking_time=? AND status!="cancelled"',
      [barber_id, booking_date, booking_time]
    );

    if (exists) return res.status(409).json({ success:false, message:'Ese horario ya está ocupado' });

    const item = await run(`
      INSERT INTO bookings(barbershop_id,client_id,client_name,client_email,barber_id,service_id,booking_date,booking_time,notes,status)
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `, [
      req.user.barbershop_id,
      req.user.role === 'client' ? req.user.id : null,
      client_name,
      client_email || '',
      barber_id,
      service_id,
      booking_date,
      booking_time,
      notes || '',
      'confirmed'
    ]);

    res.json({ success:true, message:'Reserva creada correctamente', id:item.id });
  } catch (err) {
    res.status(400).json({ success:false, message: err.message.includes('UNIQUE') ? 'Horario ocupado' : err.message });
  }
});

app.patch('/api/bookings/:id/status', authApi, only('admin','barber'), async (req, res) => {
  await run(
    'UPDATE bookings SET status=? WHERE id=? AND barbershop_id=?',
    [req.body.status, req.params.id, req.user.barbershop_id]
  );

  res.json({ success:true });
});

app.delete('/api/bookings/:id', authApi, async (req, res) => {
  if (req.user.role === 'client') {
    await run(
      'UPDATE bookings SET status="cancelled" WHERE id=? AND barbershop_id=? AND client_id=?',
      [req.params.id, req.user.barbershop_id, req.user.id]
    );
  } else {
    await run(
      'UPDATE bookings SET status="cancelled" WHERE id=? AND barbershop_id=?',
      [req.params.id, req.user.barbershop_id]
    );
  }

  res.json({ success:true });
});

app.post('/api/payments/checkout', authApi, async (req, res) => {
  if (!stripe) {
    return res.json({
      success:true,
      demo:true,
      message:'Stripe está preparado. Agrega STRIPE_SECRET_KEY en .env para activar pagos reales.'
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode:'payment',
    payment_method_types:['card'],
    line_items:[{
      price_data:{
        currency:'clp',
        product_data:{ name:'Reserva BarberFlow' },
        unit_amount:req.body.amount || 15000
      },
      quantity:1
    }],
    success_url:'http://localhost:3000/client',
    cancel_url:'http://localhost:3000/client'
  });

  res.json({ success:true, url:session.url });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = app;
app.post('/api/public/bookings', async (req, res) => {

try {

const {
client_name,
client_email,
client_phone,
service_id,
barber_id,
booking_date,
booking_time,
notes
} = req.body;

if (
!client_name ||
!client_email ||
!service_id ||
!barber_id ||
!booking_date ||
!booking_time
) {
return res.status(400).json({
success:false,
message:'Faltan datos'
});
}

const shop = await get(`
SELECT barbershop_id
FROM services
WHERE id=?
`, [service_id]);

if (!shop) {
return res.status(404).json({
success:false,
message:'Servicio no encontrado'
});
}

const exists = await get(`
SELECT id
FROM bookings
WHERE barber_id=?
AND booking_date=?
AND booking_time=?
AND status!="cancelled"
`, [
barber_id,
booking_date,
booking_time
]);

if (exists) {
return res.status(409).json({
success:false,
message:'Horario ocupado'
});
}

const booking = await run(`
INSERT INTO bookings(
barbershop_id,
client_name,
client_email,
client_phone,
barber_id,
service_id,
booking_date,
booking_time,
notes,
status
)
VALUES(?,?,?,?,?,?,?,?,?,?)
`, [
shop.barbershop_id,
client_name,
client_email,
client_phone || '',
barber_id,
service_id,
booking_date,
booking_time,
notes || '',
'pending'
]);

res.json({
success:true,
message:'Reserva enviada correctamente',
id:booking.id
});

} catch (err) {

res.status(500).json({
success:false,
message:err.message
});

}

});
app.get('/api/services-public', async (req, res) => {

const rows = await all(`
SELECT *
FROM services
WHERE active=1
ORDER BY id DESC
`);

res.json({
success:true,
data:rows
});

});

app.get('/api/barbers-public', async (req, res) => {

const rows = await all(`
SELECT *
FROM barbers
WHERE active=1
ORDER BY id DESC
`);

res.json({
success:true,
data:rows
});

});
app.get('/api/services-public', async (req, res) => {

const rows = await all(`
SELECT *
FROM services
WHERE active=1
ORDER BY id ASC
`);

res.json({
success:true,
data:rows
});

});

app.get('/api/barbers-public', async (req, res) => {

const rows = await all(`
SELECT *
FROM barbers
WHERE active=1
ORDER BY id ASC
`);

res.json({
success:true,
data:rows
});

});

app.get('/api/bookings/slots', async (req, res) => {
  try {
    const { barber_id, booking_date } = req.query;

    if (!barber_id || !booking_date) {
      return res.status(400).json({
        success:false,
        message:'Falta barbero o fecha'
      });
    }

    const baseSlots = [
      '09:00','10:00','11:00','12:00',
      '15:00','16:00','17:00','18:00'
    ];

    const taken = await all(`
      SELECT booking_time
      FROM bookings
      WHERE barber_id=?
      AND booking_date=?
      AND status!="cancelled"
    `, [barber_id, booking_date]);

    const takenSet = new Set(taken.map(item => item.booking_time));

    const slots = baseSlots.map(slot => ({
      time:slot,
      available:!takenSet.has(slot)
    }));

    res.json({
      success:true,
      data:slots
    });

  } catch (err) {
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
});

app.patch('/api/bookings/:id/status', authApi, only('admin','barber'), async (req, res) => {
  const allowed = ['pending','confirmed','completed','no_show','cancelled'];
  const { status } = req.body;

  if (!allowed.includes(status)) {
    return res.status(400).json({
      success:false,
      message:'Estado no válido'
    });
  }

  await run(`
    UPDATE bookings
    SET status=?
    WHERE id=?
    AND barbershop_id=?
  `, [status, req.params.id, req.user.barbershop_id]);

  res.json({
    success:true,
    message:'Estado actualizado'
  });
});
