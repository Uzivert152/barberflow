const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'barberflow.sqlite');

const db = new sqlite3.Database(dbPath);

const schema = fs.readFileSync(
path.join(__dirname, 'schema.sql'),
'utf8'
);

db.exec(schema);

function run(query, params = []) {

return new Promise((resolve, reject) => {

db.run(query, params, function(err) {

if (err) reject(err);

else resolve({
id:this.lastID,
changes:this.changes
});

});

});

}

function get(query, params = []) {

return new Promise((resolve, reject) => {

db.get(query, params, (err, row) => {

if (err) reject(err);

else resolve(row);

});

});

}

function all(query, params = []) {

return new Promise((resolve, reject) => {

db.all(query, params, (err, rows) => {

if (err) reject(err);

else resolve(rows);

});

});

}

async function seedDatabase() {

const existingShop = await get(`
SELECT * FROM barbershops
LIMIT 1
`);

if (!existingShop) {

const shop = await run(`
INSERT INTO barbershops(
name,
email,
phone
)
VALUES(?,?,?)
`, [
'Gentleman Barber Club',
'admin@barberflow.cl',
'+56911111111'
]);

const shopId = shop.id;

await run(`
INSERT INTO services(
barbershop_id,
name,
duration,
price,
description
)
VALUES(?,?,?,?,?)
`, [
shopId,
'Corte de pelo',
45,
15000,
'Corte premium profesional'
]);

await run(`
INSERT INTO services(
barbershop_id,
name,
duration,
price,
description
)
VALUES(?,?,?,?,?)
`, [
shopId,
'Cejas',
20,
5000,
'Perfilado profesional'
]);

await run(`
INSERT INTO services(
barbershop_id,
name,
duration,
price,
description
)
VALUES(?,?,?,?,?)
`, [
shopId,
'Barba',
35,
12000,
'Perfilado de barba'
]);

await run(`
INSERT INTO services(
barbershop_id,
name,
duration,
price,
description
)
VALUES(?,?,?,?,?)
`, [
shopId,
'Completo',
90,
28000,
'Corte + barba + cejas'
]);

await run(`
INSERT INTO barbers(
barbershop_id,
name,
email,
phone,
specialty
)
VALUES(?,?,?,?,?)
`, [
shopId,
'Barbero 1',
'barbero1@barberflow.cl',
'',
'Fade'
]);

await run(`
INSERT INTO barbers(
barbershop_id,
name,
email,
phone,
specialty
)
VALUES(?,?,?,?,?)
`, [
shopId,
'Barbero 2',
'barbero2@barberflow.cl',
'',
'Clásico'
]);

}

}

seedDatabase();

module.exports = {
db,
run,
get,
all
};
