const express = require('express')
const multer = require("multer")
const asyncHandler = require('express-async-handler')
const { validateBufferMIMEType } = require("validate-image-type")
const Authenticate = require("./Auth")
const bcrypt = require('bcryptjs')
const connection = require("../database/database")

const app = express.Router()
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/api/users/', asyncHandler(async (req,res)=>{
    const { id } = req.query
    const [rows] = await connection.execute(
        'SELECT username, firstName, lastName, profilePicture, backgroundImage, description FROM `users` WHERE id = ?',
        [id]
    )
    res.status(200).send(rows[0])
}));

app.get('/api/users/search', asyncHandler(async (req,res)=>{
    const { username } = req.query
    const [rows] = await connection.execute(
        "SELECT username, id FROM `users` WHERE username LIKE CONCAT('%',?,'%') LIMIT 10",
        [username]
    )
    res.status(200).send(rows)
}))

app.post('/api/users/register', asyncHandler(async (req,res)=>{
    const { username, password, firstName, lastName } = req.body
    const hash = await bcrypt.hash(password,13)
    
    await connection.execute(
        'INSERT INTO `users` (username, password, firstName, lastName) VALUES (?,?,?,?)',
        [username, hash, firstName, lastName]
    )
    res.status(200).send("SUCCESSFULLY CREATED USER")
}));

app.patch('/api/users', Authenticate, 
    upload.fields([
    { name: 'profilePicture', maxCount: 1 }, 
    { name: 'backgroundImage', maxCount: 1 }]),
    asyncHandler(async (req,res)=>{
    const id = req.id;
    const {profilePicture, backgroundImage} = req.files
    const allowedTypes = ['image/png', 'image/jpg', 'img/jpeg']

    let query = 'UPDATE `users` SET ';
    const params = []
    if(req.body.description){
        query += "description = ?, "
        params.push(req.body.description)
    }
    if(profilePicture && await validateBufferMIMEType(profilePicture[0].buffer, {allowMimeTypes: allowedTypes})){
        query += "profilePicture = ?, "
        params.push(profilePicture[0].buffer.toString('base64'))
    }
    if(backgroundImage && await validateBufferMIMEType(backgroundImage[0].buffer, {allowMimeTypes: allowedTypes})){
        query += "backgroundImage = ?, "
        params.push(backgroundImage[0].buffer.toString('base64'))
    }
    query = query.slice(0,-2) + " WHERE id = ?"
    params.push(id)
    console.log(profilePicture)
    await connection.execute(query, params)
    res.status(200).send("SUCCESSFULLY UPDATED USER")
}));

app.use((err,req,res,next)=>{
    console.log(err)
    res.status(500).send(err)
})

module.exports = app