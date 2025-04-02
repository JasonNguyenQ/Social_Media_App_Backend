const express = require('express')
const { rateLimit } = require('express-rate-limit')
const multer = require("multer")
const asyncHandler = require('express-async-handler')
const { validateBufferMIMEType } = require("validate-image-type")
const Authenticate = require("./Auth")
const bcrypt = require('bcryptjs')
const connection = require("../database/database")
const { z } = require('zod')

const app = express.Router()
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10*1024*1024 }
 });

const createAccountLimiter = rateLimit({
    windowMs: 1000*60*60,
    max: 5,
    message: "Too many account creations, please try again later",
    headers: true
})

const userRegistrationSchema = z.object({
    username: z.
        string()
        .refine(data=>!data.includes(" "), { message: "Username must NOT include spaces"}),

    password: z
        .string()
        .min(8, { message: "Password MUST have 8 characters or more" })
        .regex(/[A-Z]/, { message: "Password MUST include at least one capital letter"})
        .regex(/[0-9]/, { message: "Password MUST include at least one digit"})
        .regex(/[^a-zA-Z0-9]/, { message: "Password MUST include at least one special character"}),

    firstName: z
        .string()
        .regex(/^[A-Z][a-z]*$/, { message: "First name MUST start with an uppercase and trail with lowercase English letters" }),

    lastName: z
        .string()
        .regex(/^[A-Z][a-z]*$/, { message: "Last name MUST start with an uppercase and trail with lowercase English letters" }),

    
})

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

app.post('/api/users/register', createAccountLimiter, asyncHandler(async (req,res)=>{
    const { username, password, firstName, lastName } = req.body
    const hash = await bcrypt.hash(password,13)
    
    const result = userRegistrationSchema.safeParse(req.body);
    if(result.success){
        await connection.execute(
            'INSERT INTO `users` (username, password, firstName, lastName) VALUES (?,?,?,?)',
            [username, hash, firstName, lastName]
        )
        res.status(200).send("SUCCESSFULLY CREATED USER")
    }
    else{
        res.status(400).send("INVALID INPUT FIELDS")
    }
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

    await connection.execute(query, params)
    res.status(200).send("SUCCESSFULLY UPDATED USER")
}));

app.use((err,req,res,next)=>{
    res.status(500).send(err)
})

module.exports = app