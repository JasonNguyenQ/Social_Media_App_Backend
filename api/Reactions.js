const express = require("express")
const asyncHandler = require('express-async-handler')
const {Authenticate, isAuthenticated} = require("./Auth")
const {DBConnection} = require("../database/database")

const app = express.Router()

app.get('/api/reactions', isAuthenticated, asyncHandler(async (req, res)=>{
    if(!req.authenticated) return res.status(200).send([])

    const { type, id } = req.query
    const [rows] = await DBConnection.execute(`
        SELECT reaction
        FROM reactions
        WHERE contentType = ? AND contentId = ? AND userId = ?`,
        [type, id, req.id]
    )
    
    return res.status(200).send(rows.map((row)=>row['reaction']))
}))

app.get('/api/reactions/:type/:id', asyncHandler(async (req, res)=>{
    const { reaction } = req.query
    const { type, id } = req.params

    const [rows] = await DBConnection.execute(`
        SELECT COUNT(*) AS Total
        FROM reactions
        WHERE contentType = ? AND contentId = ? AND reaction = ?`,
        [type, id, reaction]
    )

    if(rows[0]) return res.status(200).send(rows[0]["Total"].toString())
    return res.status(200).send('0')
}))

app.post('/api/reactions', Authenticate, asyncHandler(async (req, res)=>{
    const { type, id, reaction } = req.body
    
    const tables = ["post","message"]
    if(!tables.includes(type)) throw new Error("Invalid content type")

    if(type === "message"){
        const [rows] = await DBConnection.execute(`
            SELECT 1
            FROM messages m
            JOIN threads t ON m.threadId = t.threadId
            JOIN subscriptions s ON t.threadId = s.threadId
            WHERE uid = ?`,
            [req.id]
        )
        if(rows.length === 0) throw new Error("Reaction Failed")
    }

    const [rows] = await DBConnection.execute(`
        SELECT 1
        FROM ${type+"s"}
        WHERE ${type+"Id"} = ?`,
        [id]
    )

    if(rows.length === 0) throw new Error("Invalid content id")

    await DBConnection.execute(`
        INSERT INTO reactions (contentType, contentId, userId, reaction, createdAt)
        VALUES (?,?,?,?,?)`,
        [type, id, req.id, reaction, new Date()]
    )

    res.status(200).send(`Successfully reacted to ${type}`)
}))

app.delete('/api/reactions', Authenticate, asyncHandler(async (req, res)=>{
    const { type, id, reaction } = req.body

    await DBConnection.execute(`
        DELETE FROM reactions
        WHERE contentType = ? AND contentId = ? AND reaction = ? AND userId = ?`,
        [type, id, reaction, req.id]
    )
    
    res.status(200).send(`Successfully Deleted ${reaction} Reaction`)
}))

module.exports = app