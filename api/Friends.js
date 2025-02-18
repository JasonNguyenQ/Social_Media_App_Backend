const express = require('express')
const Authenticate = require("./Auth")
const { CreateThread, PrivateDM } = require('./Messages')
const connection = require("../database/database")

const app = express.Router()

app.get('/api/friends', Authenticate, async (req,res)=>{
    try{
        const [friends] = await connection.execute(
            'SELECT * FROM `friends` WHERE sender = ? OR receiver = ?',
            [req.id, req.id]
        )

        return res.status(200).json(friends)
    }
    catch(err){
        return res.status(500).send(err)
    }
})

app.get('/api/friends/:id', Authenticate, async (req,res)=>{
    const { id } = req.params
    try{
        if (req.id === parseInt(id)) return res.status(200).json({state: "You"})

        const [rows] = await connection.execute(
            'SELECT sender, receiver, state FROM `friends` WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
            [req.id, id, id, req.id]
        )

        if(rows.length > 0){
            const state = (
                rows[0].sender === parseInt(id) && 
                rows[0].state !== "Friends") ? 
                "Awaiting" : rows[0].state
                
            return res.status(200).json({state: state})
        }

        return res.status(200).json({state: "Strangers"})
    }
    catch(err){
        return res.status(500).send(err)
    }
})

app.post('/api/friends', Authenticate, async (req, res)=>{
    const { id } = req.body
    if (req.id === id){
        res.status(500).send("ERROR SENDING FRIEND REQUEST")
        return
    }
    try{
        const [outgoing] = await connection.execute(
            'SELECT * FROM `friends` WHERE sender = ? AND receiver = ?',
            [req.id, id]
        )

        if (outgoing.length > 0) {
            res.status(500).send("ERROR SENDING FRIEND REQUEST")
            return
        }

        await connection.execute(
            'INSERT INTO `friends` (sender, receiver) VALUES (?,?)',
            [req.id, id]
        )
    }
    catch(err){
        res.status(500).send(err)
        return
    }

    return res.status(200).send("FRIEND REQUEST SENT")
})

app.put('/api/friends/:id', Authenticate, async (req,res,next)=>{
    const { id } = req.params
    try{
        const [incoming] = await connection.execute(
            'SELECT * FROM `friends` WHERE sender = ? AND receiver = ?',
            [id, req.id]
        )
        if( incoming.length > 0 ){
            await connection.execute(
                'UPDATE `friends` SET state = "Friends" WHERE sender = ? AND receiver = ? AND state = "Pending"',
                [id, req.id]
            )
            req.friend = id
        }
        next()
    }
    catch(err){
        res.status(500).send(err)
        return
    }
    
}, CreateThread, PrivateDM, (req,res)=>{res.status(200).send("ACCEPTED FRIEND REQUEST")})

app.delete('/api/friends/:id', Authenticate, async (req,res)=>{
    const { id } = req.params
    try{
        await connection.execute(
            'DELETE FROM `friends` WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)',
            [id, req.id, req.id, id]
        )
    }
    catch(err){
        res.status(500).send("ERROR REMOVING")
        return
    }

    return res.status(200).send("SUCCESSFULLY REMOVED")
})

module.exports = app