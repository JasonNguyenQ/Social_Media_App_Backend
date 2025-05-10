const express = require("express")
const asyncHandler = require('express-async-handler')
const {Authenticate} = require("./Auth")
const {DBConnection} = require("../database/database")
const crypto = require('crypto')

const app = express.Router()

const CreateThread = asyncHandler(async (req,res,next)=>{
    const threadId = crypto.randomUUID()
    const date = new Date()

    await DBConnection.execute(`
        INSERT INTO threads (threadId, createdAt, owner) 
        VALUES (?,?,?)`,
        [threadId, date, req.id]
    )
    req.threadId = threadId
    next()
})

const Subscribe = asyncHandler(async (req,res,next)=>{
    const { threadId, threadName } = req.body

    await DBConnection.execute(`
        INSERT INTO subscriptions (threadId, threadName, uid) 
        VALUES (?,?,?)`,
        [threadId, threadName, req.id]
    )
    next()
});

const isSubscribed = async (threadId, uid)=>{
    try{
        const [rows] = await DBConnection.execute(`
            SELECT 1 
            FROM subscriptions 
            WHERE threadId = ? AND uid = ?`,
            [threadId, uid]
        )
        return rows.length > 0
    }
    catch(err){
        return false
    }
}

const PrivateDM = asyncHandler(async (req,res,next)=>{
    const threadId = req.threadId

    await DBConnection.execute(`
        INSERT INTO subscriptions (threadId, threadName, threadIcon, uid) 
        WITH userInfo AS (
            SELECT username, profilePicture
            FROM users 
            WHERE id = ?
        )
        SELECT ?,username,profilePicture,?
        FROM userInfo`,
        [req.friend, threadId, req.id]
    )
    await DBConnection.execute(
        `
        INSERT INTO subscriptions (threadId, threadName, threadIcon, uid) 
        WITH userInfo AS (
            SELECT username, profilePicture 
            FROM users WHERE id = ?
        )
        SELECT ?,username,profilePicture,? 
        FROM userInfo`,
        [req.id, threadId, req.friend]
    )
    next()
});

app.get('/threads', Authenticate, asyncHandler(async (req,res)=>{
    const [rows] = await DBConnection.execute(`
        SELECT threadId, threadName, threadIcon 
        FROM subscriptions 
        WHERE uid = ?`,
        [req.id]
    )
    res.status(200).json(rows)
}));

app.post('/threads', Authenticate, CreateThread, (req,res)=>{
    res.status(200).send(req.threadId)
})

app.post('/subscriptions', Authenticate, Subscribe, ()=>{
    res.status(200).send("SUCCESSFULLY SUBSCRIBED")
})

app.post('/', Authenticate, asyncHandler(async (req, res)=>{
    const { threadId, message } = req.body
    if (!(await isSubscribed(threadId, req.id))) throw new Error("Internal Server Error")
    
    await DBConnection.execute(`
        INSERT INTO messages (threadId, sender, message, createdAt) 
        VALUES (?,?,?,?)`,
        [threadId, req.id, message.slice(0,2000), new Date()]
    )
    res.status(200).send("SUCCESS")
}));

app.get('/:threadId', Authenticate, asyncHandler(async (req,res)=>{
    const threadId = req.params.threadId
    if (!(await isSubscribed(threadId, req.id))) throw new Error("Internal Server Error")
    
    const [rows] = await DBConnection.execute(`
        SELECT u.username, m.message, m.createdAt, m.messageId
        FROM messages m 
        JOIN users u 
        ON m.sender = u.id 
        WHERE m.threadId = ? 
        ORDER BY m.createdAt`,
        [threadId]
    )
    res.status(200).json(rows)
}));

app.use((err,req,res,next)=>{
    res.status(500).send(err)
})

module.exports = { app, CreateThread, Subscribe, PrivateDM, isSubscribed }