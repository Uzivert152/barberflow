@'
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title><%= title %></title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">

<link rel="stylesheet" href="/css/style.css">

</head>

<body>

<%- body %>

</body>
</html>
'@ | Set-Content src/views/layouts/main.ejs


@'
<section class="hero">

<nav class="navbar navbar-expand-lg navbar-dark premium-nav">
<div class="container">

<a class="navbar-brand premium-logo" href="/">
BarberFlow
</a>

<div class="ms-auto d-flex gap-3">

<a href="/login" class="nav-link text-light">
Ingresar
</a>

<a href="/dashboard" class="btn btn-gold">
Dashboard
</a>

</div>

</div>
</nav>

<div class="container">

<div class="row align-items-center min-vh-100">

<div class="col-lg-6">

<span class="premium-badge">
Sistema premium para barberías
</span>

<h1 class="hero-title">
Barbería moderna.
Gestión elegante.
Experiencia premium.
</h1>

<p class="hero-text">
Controla reservas, clientes, pagos, horarios y estadísticas en un solo lugar.
</p>

<div class="hero-buttons">

<a href="/dashboard" class="btn btn-gold btn-lg">
Ver plataforma
</a>

<a href="/login" class="btn btn-outline-light btn-lg">
Iniciar sesión
</a>

</div>

</div>

<div class="col-lg-6">

<div class="dashboard-preview">

<div class="card-premium">
<p>Reservas hoy</p>
<h2>42</h2>
</div>

<div class="card-premium">
<p>Clientes VIP</p>
<h2>128</h2>
</div>

<div class="card-premium">
<p>Ingresos</p>
<h2>$580.000</h2>
</div>

</div>

</div>

</div>

</div>

</section>
'@ | Set-Content src/views/pages/index.ejs


@'
<section class="login-page">

<div class="login-card">

<h1>Ingresar</h1>

<p>
Accede al sistema premium de BarberFlow.
</p>

<form>

<input type="email" placeholder="Correo electrónico">

<input type="password" placeholder="Contraseña">

<button class="btn btn-gold w-100">
Ingresar
</button>

</form>

</div>

</section>
'@ | Set-Content src/views/pages/login.ejs


@'
<div class="dashboard-layout">

<aside class="sidebar">

<div class="sidebar-logo">
BarberFlow
</div>

<nav>

<a href="#">Dashboard</a>
<a href="#">Reservas</a>
<a href="#">Clientes</a>
<a href="#">Barberos</a>
<a href="#">Pagos</a>
<a href="#">Servicios</a>

</nav>

</aside>

<main class="dashboard-main">

<header class="topbar">

<div>
<h3>Gentleman Barber Club</h3>
<p>Panel administrativo premium</p>
</div>

<button class="btn btn-gold">
Nueva reserva
</button>

</header>

<section class="dashboard-content">

<div class="metrics-grid">

<div class="metric-card">
<p>Reservas</p>
<h2>48</h2>
</div>

<div class="metric-card">
<p>Clientes</p>
<h2>284</h2>
</div>

<div class="metric-card">
<p>Ingresos</p>
<h2>$2.4M</h2>
</div>

<div class="metric-card">
<p>Ocupación</p>
<h2>89%</h2>
</div>

</div>

<div class="table-card">

<h3>Reservas recientes</h3>

<table>

<thead>
<tr>
<th>Cliente</th>
<th>Servicio</th>
<th>Hora</th>
<th>Estado</th>
</tr>
</thead>

<tbody>

<tr>
<td>Matías</td>
<td>Fade Premium</td>
<td>12:30</td>
<td><span class="status confirmed">Confirmada</span></td>
</tr>

<tr>
<td>Felipe</td>
<td>Barba</td>
<td>13:00</td>
<td><span class="status pending">Pendiente</span></td>
</tr>

</tbody>

</table>

</div>

</section>

</main>

</div>
'@ | Set-Content src/views/pages/dashboard.ejs


@'
*{
margin:0;
padding:0;
box-sizing:border-box;
}

body{
background:#0b0b0b;
color:#f5f5f5;
font-family:Arial, Helvetica, sans-serif;
}

.hero{
min-height:100vh;
background:
radial-gradient(circle at top right,rgba(201,164,92,.15),transparent 30%),
linear-gradient(135deg,#0b0b0b,#15120e);
}

.premium-nav{
padding:25px 0;
}

.premium-logo{
font-size:30px;
font-weight:800;
color:#d6a85f !important;
}

.premium-badge{
display:inline-block;
padding:10px 18px;
border-radius:999px;
background:rgba(214,168,95,.1);
border:1px solid rgba(214,168,95,.2);
color:#d6a85f;
margin-bottom:20px;
}

.hero-title{
font-size:72px;
font-weight:900;
line-height:1;
margin-bottom:25px;
}

.hero-text{
color:#b6a78f;
font-size:20px;
margin-bottom:35px;
max-width:550px;
}

.hero-buttons{
display:flex;
gap:15px;
}

.btn-gold{
background:#d6a85f;
border:none;
padding:14px 28px;
border-radius:14px;
font-weight:700;
color:#111;
}

.dashboard-preview{
display:grid;
gap:20px;
}

.card-premium{
background:#121212;
padding:30px;
border-radius:24px;
border:1px solid rgba(214,168,95,.1);
}

.login-page{
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
background:#0b0b0b;
}

.login-card{
width:100%;
max-width:420px;
background:#121212;
padding:40px;
border-radius:28px;
}

.login-card input{
width:100%;
padding:16px;
margin-bottom:15px;
background:#0b0b0b;
border:1px solid rgba(255,255,255,.08);
border-radius:14px;
color:white;
}

.dashboard-layout{
display:flex;
min-height:100vh;
}

.sidebar{
width:260px;
background:#101010;
padding:30px;
}

.sidebar-logo{
font-size:28px;
font-weight:900;
color:#d6a85f;
margin-bottom:40px;
}

.sidebar nav{
display:flex;
flex-direction:column;
gap:12px;
}

.sidebar nav a{
color:#b6a78f;
padding:14px;
border-radius:14px;
text-decoration:none;
}

.dashboard-main{
flex:1;
}

.topbar{
height:90px;
display:flex;
align-items:center;
justify-content:space-between;
padding:0 35px;
}

.dashboard-content{
padding:35px;
}

.metrics-grid{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:20px;
margin-bottom:30px;
}

.metric-card{
background:#121212;
padding:28px;
border-radius:22px;
}

.table-card{
background:#121212;
padding:30px;
border-radius:22px;
}

table{
width:100%;
margin-top:20px;
border-collapse:collapse;
}

th,td{
padding:16px;
border-bottom:1px solid rgba(255,255,255,.06);
text-align:left;
}

.status{
padding:6px 12px;
border-radius:999px;
font-size:12px;
font-weight:700;
}

.confirmed{
background:rgba(34,197,94,.15);
color:#22c55e;
}

.pending{
background:rgba(234,179,8,.15);
color:#eab308;
}
'@ | Set-Content src/public/css/style.css