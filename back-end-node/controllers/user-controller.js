'use strict'

var bcrypt = require('bcrypt-nodejs');
var mongoosePagination = require('mongoose-pagination');

var User = require('../models/user');
var jwt = require('../services/jwt-service');

var fs = require('fs');
var path = require('path');

// Metodo de prueba
function home(req, res) {
    res.status(200).send({
        message: 'Servidor NodeJS activo.'
    });
}

// Registro de usuarios
function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        // Controlar usuarios duplicados
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error en la peticion de usuarios' });

            if (users && users.length >= 1) {
                return res.status(500).send({ message: 'Usuario ya existente' });
            } else {
                // Cifra contraseña y guarda datos
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar el usuario' });

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario' });
                        }
                    })
                }
                );
            }
        });
    } else {
        res.status(500).send({
            message: 'Favor de completar todos los campos'
        });
    }
}

// Login y generación de token
function loginUser(req, res) {
    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({ email: email}, (err, user) => {
        if (err) return res.status(500).send({message: 'Error en la peticion'});

        if(user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if(check) {
                    if(params.getToken) {
                        // generar y devolver token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    } else {
                        return res.status(200).send({message: 'A Chuchita la bolsearon y fue ' + user.name});
                    }
                } else {
                    return res.status(500).send({message: 'Credenciales incorrectas'});
                }
            })
        } else {
            return res.status(500).send({message: 'Credenciales incorrectas'});
        }
    });
}

// Consultar datos de un usuario
function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if(err) return res.status(500).send({ message: 'Error en la petición.'});

        if(!user) return res.status(404).send({ message: 'Usuario no existe'});

        return res.status(200).send({ user });
    });
}

// Obtener usuarios paginados
function getUsers(req, res) {
    var identity_user_id = req.user.sub;

    var page = 1;
    if(req.params.page) {
        page = req.params.page;
    }

    var itemPerPage = 2;

    User.find().sort('_id').paginate(page, itemPerPage, (err, users, total) => {
        if(err) return res.status(500).send({ message: 'Error en la petición.'});

        if(!users) return res.status(404).send({ message: 'No hay usuarios disponibles'});

        return res.status(200).send({
            users,
            total,
            pags: Math.ceil(total/itemPerPage)
        });
    });
}

// Actualizar usuario
function updateUser(req, res) {
    var userId = req.params.id;
    var update = req.body;

    delete update.password;

    if(userId != req.user.sub) {
        return res.status(403).send({ message: 'No tienes permiso para actualizar este usuario'});
    }

    User.findByIdAndUpdate(userId, update, { new:true }, (err, userUpdated) => {
        if(err) return res.status(500).send({ message: 'Error en la petición.'});

        if(!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario'});

        return res.status(200).send({ user: userUpdated });
    });
}

// Subir avatar de usuario
function uploadImage(req, res) {
    var userId = req.params.id;

    if(req.files) {
        var file_path = req.files.image.path;
        var file_split = file_path.split('\\');
        var file_name = file_split[2];
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];

        if(userId != req.user.sub) {
            return removeFilesOfUpload(res, file_path, 'No tienes permiso para actualizar este usuario');
        }

        if(file_ext == "png" || file_ext == "jpg" || file_ext == "jpeg" || file_ext == "gif") {
            User.findByIdAndUpdate(userId, { image : file_name }, { new:true }, (err, userUpdated) => {
                if(err) return res.status(500).send({ message: 'Error en la petición.'});
        
                if(!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario'});
        
                return res.status(200).send({ user: userUpdated });
            });

        } else {
            return removeFilesOfUpload(res, file_path, 'Extensión no válida');
        }
    } else {
        return res.status(500).send({ message: 'No se han subido imágenes'});
    }
}

// Obtener imagenes subidas
function getImageFile(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if(exists) {
            return res.sendFile(path.resolve(path_file));
        } else {
            return res.status(404).send({ message: 'Imágen no existe'});
        }
    });
}

function removeFilesOfUpload(res, filePath, message) {
    fs.unlink(filePath, (err) => {
        return res.status(500).send({ message: message});
    });
}

module.exports = {
    home,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    updateUser,
    uploadImage,
    getImageFile
}