const express = require('express')
const asyncHandler = require('express-async-handler')
const Authenticate = require("./Auth")
const bcrypt = require('bcryptjs')
const connection = require("../database/database")

const app = express.Router()

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

app.use((err,req,res,next)=>{
    res.status(500).send(err)
})

module.exports = app