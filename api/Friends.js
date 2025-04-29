const express = require('express')
const asyncHandler = require('express-async-handler')
const {Authenticate} = require("./Auth")
const { CreateThread, PrivateDM } = require('./Messages')
const {DBConnection} = require("../database/database")

const app = express.Router()

app.get('/api/friends', Authenticate, asyncHandler(async (req,res)=>{
    const [friends] = await DBConnection.execute(`
        SELECT * 
        FROM friends 
        WHERE sender = ? OR receiver = ?`,
        [req.id, req.id]
    )

    res.status(200).json(friends)
}))

app.get('/api/friends/:id', Authenticate, asyncHandler(async (req,res)=>{
    const { id } = req.params
    if (req.id === parseInt(id)) return res.status(200).json({state: "You"})

    const [rows] = await DBConnection.execute(`
        SELECT sender, receiver, state 
        FROM friends 
        WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)`,
        [req.id, id, id, req.id]
    )

    if(rows.length > 0){
        const state = (
            rows[0].sender === parseInt(id) && 
            rows[0].state !== "Friends") ? 
            "Awaiting" : rows[0].state
            
        return res.status(200).json({state: state})
    }

    res.status(200).json({state: "Strangers"})
}))

app.post('/api/friends', Authenticate, asyncHandler(async (req, res)=>{
    const { id } = req.body
    if (req.id == id) return res.status(500).send("ERROR SENDING FRIEND REQUEST")

    await DBConnection.execute(`
        INSERT INTO friends (sender, receiver) 
        VALUES (?,?)`,
        [req.id, id]
    )

    res.status(200).send("FRIEND REQUEST SENT")
}))

app.put('/api/friends/:id', Authenticate, asyncHandler(async (req,res,next)=>{
    const { id } = req.params

    await DBConnection.execute(`
        UPDATE friends
        SET state = "Friends" 
        WHERE sender = ? AND receiver = ? AND state = "Pending"`,
        [id, req.id]
    )

    req.friend = id
    next()
}), CreateThread, PrivateDM, (req,res)=>{res.status(200).send("ACCEPTED FRIEND REQUEST")})

app.delete('/api/friends/:id', Authenticate, asyncHandler(async (req,res)=>{
    const { id } = req.params

    await DBConnection.execute(`
        DELETE FROM friends 
        WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)`,
        [id, req.id, req.id, id]
    )

    return res.status(200).send("SUCCESSFULLY REMOVED")
}))

app.use((err,req,res,next)=>{
    res.status(500).send(err)
})

module.exports = app