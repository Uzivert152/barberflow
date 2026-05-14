async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Error inesperado");
  }

  return data;
}

function getForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function money(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP"
  }).format(value || 0);
}

function normalizePhone(phone = "") {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (!clean.startsWith("56")) clean = "56" + clean;
  return clean;
}

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(getForm(loginForm))
      });

      location.href = data.redirect || "/admin";
    } catch (err) {
      document.querySelector("#authMsg").textContent = err.message;
    }
  });
}

const registerForm = document.querySelector("#registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const form = getForm(registerForm);

      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });

      const login = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });

      location.href = login.redirect || "/admin";
    } catch (err) {
      document.querySelector("#authMsg").textContent = err.message;
    }
  });
}

async function loadPublicData() {
  const serviceSelect = document.querySelector("#publicServices, #bookingServices");
  const barberSelect = document.querySelector("#publicBarbers, #bookingBarbers");
  const filterBarber = document.querySelector("#filterBarber");

  if (serviceSelect) {
    const services = await fetch("/api/services-public").then(r => r.json());

    serviceSelect.innerHTML =
      '<option value="">Seleccionar servicio</option>' +
      services.data.map(item => `
        <option value="${item.id}">
          ${item.name} - ${money(item.price)}
        </option>
      `).join("");
  }

  const barbers = await fetch("/api/barbers-public").then(r => r.json());

  if (barberSelect) {
    barberSelect.innerHTML =
      '<option value="">Seleccionar barbero</option>' +
      barbers.data.map(item => `
        <option value="${item.id}">
          ${item.name}
        </option>
      `).join("");
  }

  if (filterBarber) {
    filterBarber.innerHTML =
      '<option value="">Todos los barberos</option>' +
      barbers.data.map(item => `
        <option value="${item.id}">
          ${item.name}
        </option>
      `).join("");
  }
}

function buildBookingCalendar() {
  const dateInput = document.querySelector('input[name="booking_date"]');

  if (!dateInput) return;

  dateInput.type = "hidden";

  if (document.querySelector(".booking-calendar")) return;

  const calendar = document.createElement("div");
  calendar.className = "booking-calendar";

  calendar.innerHTML = `
    <div class="calendar-title">Selecciona un día</div>
    <div class="calendar-grid"></div>
  `;

  const grid = calendar.querySelector(".calendar-grid");
  const today = new Date();

  for (let i = 0; i <= 14; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);

    const value = date.toISOString().split("T")[0];

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";

    button.innerHTML = `
      <span>${date.toLocaleDateString("es-CL", { weekday: "short" })}</span>
      <strong>${date.toLocaleDateString("es-CL", { day: "2-digit" })}</strong>
      <small>${date.toLocaleDateString("es-CL", { month: "short" })}</small>
    `;

    button.addEventListener("click", async () => {
      dateInput.value = value;

      document.querySelectorAll(".calendar-day").forEach(item => {
        item.classList.remove("selected");
      });

      button.classList.add("selected");

      await loadAvailableSlots();
    });

    grid.appendChild(button);
  }

  dateInput.parentNode.insertBefore(calendar, dateInput);
}

async function loadAvailableSlots() {
  const barberSelect = document.querySelector("#publicBarbers, #bookingBarbers");
  const dateInput = document.querySelector('input[name="booking_date"]');
  const timeSelect = document.querySelector('select[name="booking_time"]');

  if (!barberSelect || !dateInput || !timeSelect) return;

  if (!barberSelect.value || !dateInput.value) {
    timeSelect.innerHTML = '<option value="">Seleccionar hora</option>';
    return;
  }

  const slots = await api(`/api/bookings/slots?barber_id=${barberSelect.value}&booking_date=${dateInput.value}`);

  timeSelect.innerHTML =
    '<option value="">Seleccionar hora</option>' +
    slots.data.map(slot => `
      <option value="${slot.time}" ${!slot.available ? "disabled" : ""}>
        ${slot.time} ${!slot.available ? "ocupado" : ""}
      </option>
    `).join("");
}

document.addEventListener("change", event => {
  if (
    event.target.matches("#publicBarbers") ||
    event.target.matches("#bookingBarbers")
  ) {
    loadAvailableSlots().catch(() => {});
  }
});

const publicBookingForm = document.querySelector("#publicBookingForm");
const bookingForm = document.querySelector("#bookingForm");

async function handleBookingSubmit(form) {
  const data = getForm(form);

  if (!data.booking_date) {
    alert("Selecciona un día en el calendario");
    return;
  }

  if (!data.booking_time) {
    alert("Selecciona una hora disponible");
    return;
  }

  await api(form.id === "publicBookingForm" ? "/api/public/bookings" : "/api/bookings", {
    method: "POST",
    body: JSON.stringify(data)
  });

  alert("Reserva enviada correctamente");
  form.reset();

  document.querySelectorAll(".calendar-day").forEach(item => {
    item.classList.remove("selected");
  });

  await loadBookings();
  await loadMetricsPro();
}

if (publicBookingForm) {
  publicBookingForm.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      await handleBookingSubmit(publicBookingForm);
    } catch (err) {
      alert(err.message);
    }
  });
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      await handleBookingSubmit(bookingForm);
    } catch (err) {
      alert(err.message);
    }
  });
}

function getFilters() {
  return {
    date: document.querySelector("#filterDate")?.value || "",
    status: document.querySelector("#filterStatus")?.value || "",
    barber: document.querySelector("#filterBarber")?.value || ""
  };
}

function applyFilters(bookings) {
  const filters = getFilters();

  return bookings.filter(item => {
    if (filters.date && item.booking_date !== filters.date) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.barber && String(item.barber_id) !== String(filters.barber)) return false;
    return true;
  });
}

async function loadMetricsPro() {
  const todayEl = document.querySelector("#mToday");
  if (!todayEl) return;

  const data = await api("/api/bookings");
  const bookings = data.data.filter(item => item.status !== "cancelled");

  const today = new Date().toISOString().split("T")[0];

  const todayBookings = bookings.filter(item => item.booking_date === today);
  const pendingBookings = bookings.filter(item => item.status === "pending");

  const totalMinutes = bookings.reduce((sum, item) => {
    return sum + Number(item.duration || 0);
  }, 0);

  const revenue = bookings.reduce((sum, item) => {
    return sum + Number(item.price || 0);
  }, 0);

  document.querySelector("#mToday").textContent = todayBookings.length;
  document.querySelector("#mHours").textContent = (totalMinutes / 60).toFixed(1) + "h";
  document.querySelector("#mRevenue").textContent = money(revenue);
  document.querySelector("#mPending").textContent = pendingBookings.length;
}

async function loadBookings() {
  const table = document.querySelector("#bookingsTable");
  const cards = document.querySelector("#adminCutsGrid");

  if (!table && !cards) return;

  const data = await api("/api/bookings");
  const filtered = applyFilters(data.data);

  if (table) {
    table.innerHTML = filtered.map(item => `
      <tr>
        <td>${item.client_name || ""}</td>
        <td>
          ${item.client_phone ? `<a class="wa-link" target="_blank" href="https://wa.me/${normalizePhone(item.client_phone)}">WhatsApp</a>` : ""}
          <br>
          <small>${item.client_email || ""}</small>
        </td>
        <td>${item.service_name || ""}</td>
        <td>${item.barber_name || ""}</td>
        <td>${item.booking_date || ""}</td>
        <td>${item.booking_time || ""}</td>
        <td><span class="status ${item.status}">${item.status}</span></td>
        <td class="actions-cell">
          <button class="btn ghost" onclick="updateBookingStatus(${item.id}, 'confirmed')">Confirmar</button>
          <button class="btn ghost" onclick="updateBookingStatus(${item.id}, 'completed')">Completada</button>
          <button class="btn ghost" onclick="updateBookingStatus(${item.id}, 'no_show')">No asistió</button>
          <button class="btn ghost" onclick="cancelBooking(${item.id})">Cancelar</button>
        </td>
      </tr>
    `).join("");
  }

  if (cards) {
    cards.innerHTML = filtered.length
      ? filtered.map(item => `
        <div class="cut-card">
          <div>
            <span class="cut-date">${item.booking_date} · ${item.booking_time}</span>
            <h3>${item.service_name}</h3>
            <p>Cliente: ${item.client_name}</p>
            <p>Barbero: ${item.barber_name}</p>
            <p>Contacto: ${item.client_phone || "Sin teléfono"}</p>
            <p>Comentario: ${item.notes || "Sin comentario"}</p>
          </div>

          <div class="card-actions">
            <span class="status ${item.status}">${item.status}</span>
            ${item.client_phone ? `<a class="btn gold" target="_blank" href="https://wa.me/${normalizePhone(item.client_phone)}">WhatsApp</a>` : ""}
          </div>
        </div>
      `).join("")
      : `<div class="empty-card">No hay reservas con estos filtros.</div>`;
  }
}

async function updateBookingStatus(id, status) {
  await api("/api/bookings/" + id + "/status", {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  await loadBookings();
  await loadMetricsPro();
}

async function cancelBooking(id) {
  await api("/api/bookings/" + id, {
    method: "DELETE"
  });

  await loadBookings();
  await loadMetricsPro();
}

async function loadServices() {
  const list = document.querySelector("#servicesList");

  if (!list) return;

  const data = await api("/api/services");

  list.innerHTML = data.data.map(item => `
    <div class="list-item">
      <span><strong>${item.name}</strong> · ${item.duration} min · ${money(item.price)}</span>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  buildBookingCalendar();

  await loadPublicData().catch(() => {});
  await loadBookings().catch(() => {});
  await loadServices().catch(() => {});
  await loadMetricsPro().catch(() => {});

  document.querySelector("#filterDate")?.addEventListener("change", loadBookings);
  document.querySelector("#filterStatus")?.addEventListener("change", loadBookings);
  document.querySelector("#filterBarber")?.addEventListener("change", loadBookings);

  document.querySelector("#clearFilters")?.addEventListener("click", async () => {
    document.querySelector("#filterDate").value = "";
    document.querySelector("#filterStatus").value = "";
    document.querySelector("#filterBarber").value = "";
    await loadBookings();
  });
});
function fillDefaultHours() {
  const timeSelect = document.querySelector('select[name="booking_time"]');
  if (!timeSelect) return;

  const hours = ["09:00","10:00","11:00","12:00","15:00","16:00","17:00","18:00"];

  timeSelect.innerHTML =
    '<option value="">Seleccionar hora</option>' +
    hours.map(hour => `<option value="${hour}">${hour}</option>`).join("");
}

async function loadAvailableSlots() {
  const barberSelect = document.querySelector("#publicBarbers, #bookingBarbers");
  const dateInput = document.querySelector('input[name="booking_date"]');
  const timeSelect = document.querySelector('select[name="booking_time"]');

  if (!timeSelect) return;

  if (!barberSelect || !dateInput || !barberSelect.value || !dateInput.value) {
    fillDefaultHours();
    return;
  }

  try {
    const slots = await api(`/api/bookings/slots?barber_id=${barberSelect.value}&booking_date=${dateInput.value}`);

    timeSelect.innerHTML =
      '<option value="">Seleccionar hora</option>' +
      slots.data.map(slot => `
        <option value="${slot.time}" ${!slot.available ? "disabled" : ""}>
          ${slot.time} ${!slot.available ? "ocupado" : ""}
        </option>
      `).join("");

  } catch (err) {
    fillDefaultHours();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fillDefaultHours();

  setTimeout(() => {
    loadAvailableSlots().catch(() => fillDefaultHours());
  }, 500);
});

document.addEventListener("change", event => {
  if (
    event.target.matches("#publicBarbers") ||
    event.target.matches("#bookingBarbers") ||
    event.target.matches('input[name="booking_date"]')
  ) {
    loadAvailableSlots().catch(() => fillDefaultHours());
  }
});
