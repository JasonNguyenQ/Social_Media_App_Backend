const express = require('express')
const Authenticate = require("./Auth")
const bcrypt = require('bcryptjs')
const connection = require("../database/database")

const app = express.Router()

app.get('/api/users/', async (req,res)=>{
    const { id } = req.query
    connection.execute(
        'SELECT username, firstName, lastName, profilePicture, backgroundImage, description FROM `users` WHERE id = ?',
        [id]
    )
    .then(([rows])=>{
        res.status(200).send(rows[0])
    })
    .catch((err)=>{
        res.status(500).send("ERROR FETCHING USERS")
    })
})

app.get('/api/users/search', async (req,res)=>{
    const { username } = req.query
    connection.execute(
        "SELECT username, id FROM `users` WHERE username LIKE CONCAT('%',?,'%') LIMIT 10",
        [username]
    )
    .then(([rows])=>{
        res.status(200).send(rows)
    })
    .catch((err)=>{
        res.status(500).send("ERROR SEARCHING")
    })
})

app.post('/api/users/register', async (req,res)=>{
    const { username, password, firstName, lastName } = req.body
    const hash = await bcrypt.hash(password,13)
    
    connection.execute(
        'INSERT INTO `users` (username, password, firstName, lastName) VALUES (?,?,?,?)',
        [username, hash, firstName, lastName]
    )
    .then(([rows, fields])=>{
        res.status(200).send("SUCCESSFULLY CREATED USER")
    })
    .catch((err)=>{
        res.status(500).send("ERROR REGISTERING USER")
    })
})

module.exports = app