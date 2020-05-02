'use strict'

var express = require('express');
var UserController = require('../controllers/user-controller');

var api = express.Router();
var auth = require('../middlewares/authenticated');

var multipart = require('connect-multiparty');
var md_upload = multipart( {uploadDir: './uploads/users'});

api.get('/home', UserController.home);
api.post('/register', UserController.saveUser);
api.post('/login', UserController.loginUser);
api.get('/user/:id', auth.ensureAuth, UserController.getUser);
api.get('/users/:page', auth.ensureAuth, UserController.getUsers);
api.put('/update_user/:id', auth.ensureAuth, UserController.updateUser);
api.post('/update_image_user/:id', [auth.ensureAuth, md_upload], UserController.uploadImage);
api.get('/get_image_user/:imageFile', UserController.getImageFile);

module.exports = api;