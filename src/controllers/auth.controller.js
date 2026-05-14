const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/database');

const register = async (req, res) => {
    try {
        const { barbershop_id, name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        const allowedRoles = ['admin', 'barber', 'client'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol no válido'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (barbershop_id, name, email, password, role)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.run(sql, [barbershop_id || null, name, email, hashedPassword, role], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({
                        success: false,
                        message: 'El correo ya está registrado'
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: 'Error al registrar usuario',
                    error: err.message
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Usuario registrado correctamente',
                user_id: this.lastID
            });
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

const login = (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son obligatorios'
            });
        }

        const sql = `SELECT * FROM users WHERE email = ?`;

        db.get(sql, [email], async (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error consultando usuario',
                    error: err.message
                });
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales incorrectas'
                });
            }

            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales incorrectas'
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    barbershop_id: user.barbershop_id,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                success: true,
                message: 'Login correcto',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    barbershop_id: user.barbershop_id
                }
            });
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login
};