const express = require("express")
const Authenticate = require("./Auth")
const connection = require("../database/database")
const crypto = require('crypto')

const app = express.Router()

const CreateThread = async (req,res,next)=>{
    const threadId = crypto.randomUUID()
    const date = new Date()

    try{
        await connection.execute(
            'INSERT INTO `threads` (threadId, createdAt, owner) VALUES (?,?,?)',
            [threadId, date, req.id]
        )
        req.threadId = threadId
        next()
    }
    catch(err){
        res.status(500).send(err)
    }
}

const Subscribe = async (req,res,next)=>{
    try{
        const { threadId, threadName } = req.body

        await connection.execute(
            'INSERT INTO `subscriptions` (threadId, threadName, uid) VALUES (?,?,?)',
            [threadId, threadName, req.id]
        )
        next()
    }
    catch(err){
        res.status(500).send(err)
    }
}

const isSubscribed = async (threadId, uid)=>{
    try{
        const [rows] = await connection.execute(
            'SELECT * `subscriptions` WHERE threadId = ? AND uid = ?',
            [threadId, uid]
        )
        return rows.length > 0
    }
    catch(err){
        return false
    }
}

const PrivateDM = async (req,res,next)=>{
    try{
        const threadId = req.threadId
        const [user1] = await connection.execute(
            'SELECT username FROM `users` WHERE id = ?',
            [req.id]
        )
        const [user2] = await connection.execute(
            'SELECT username FROM `users` WHERE id = ?',
            [req.friend]
        )

        await connection.execute(
            'INSERT INTO `subscriptions` (threadId, threadName, uid) VALUES (?,?,?)',
            [threadId, user2[0].username, req.id]
        )
        await connection.execute(
            'INSERT INTO `subscriptions` (threadId, threadName, uid) VALUES (?,?,?)',
            [threadId, user1[0].username, req.friend]
        )
        next()
    }
    catch(err){
        res.status(500).send(err)
    }
}

app.get('/api/messages/threads', Authenticate, async (req,res)=>{
    try{
        const [rows] = await connection.execute(
            'SELECT threadId, threadName FROM `subscriptions` WHERE uid = ?',
            [req.id]
        )
        res.status(200).json(rows)
    }
    catch(err){
        res.status(500).send(err)
    }
})

app.post('/api/messages/threads', Authenticate, CreateThread, (req,res)=>{
    res.status(200).send(req.threadId)
})

app.post('/api/messages/subscriptions', Authenticate, Subscribe, ()=>{
    res.status(200).send("SUCCESSFULLY SUBSCRIBED")
})

app.post('/api/messages', Authenticate, async (req, res)=>{
    try{
        const { threadId, message } = req.body
        if (!isSubscribed(threadId, req.id)) res.status(500).send(err)
        await connection.execute(
            'INSERT INTO `messages` (threadId, sender, message, createdAt) VALUES (?,?,?,?)',
            [threadId, req.id, message.slice(0,2000), new Date()]
        )
        res.status(200).send("SUCCESS")
    }
    catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

app.get('/api/messages/:threadId', Authenticate, async (req,res)=>{
    try{
        const threadId = req.params.threadId
        if (!isSubscribed(threadId, req.id)) res.status(500).send(err)
        const [rows] = await connection.execute(
            'SELECT u.username, m.message, m.createdAt FROM `messages` m JOIN `users` u ON m.sender = u.id WHERE m.threadId = ? ORDER BY m.createdAt',
            [threadId]
        )
        res.status(200).json(rows)
    }
    catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

module.exports = { app, CreateThread, Subscribe, PrivateDM }