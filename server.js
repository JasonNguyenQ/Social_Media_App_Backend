const express = require('express')
const asyncHandler = require('express-async-handler')
const jwt = require("jsonwebtoken")
const http = require('http')
const { Server } = require('socket.io')
const cookieParser = require('cookie-parser')
const cors = require('cors');
const bcrypt = require('bcryptjs')
const connection = require('./database/database')

const app = express()

app.use(express.json())
app.use(cookieParser())

const corsOptions = {
    origin: [`http://localhost:3000`,`http://localhost:5173`],
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

const friendsRouter = require('./api/Friends')
const usersRouter = require('./api/Users')
const { app: messagesRouter } = require('./api/Messages')

app.use(friendsRouter)
app.use(usersRouter)
app.use(messagesRouter)

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origins: ["http://localhost:5173","http://localhost:4173"],
        methods: ["GET", "POST"]
    }
})

io.on("connection", (socket)=>{
    socket.on("send", (event)=>{
        const { token, message } = event
        try {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user)=>{
                if(err) return
                socket.username = user.preferred_username
            })
        }
        catch { return }

        if(typeof message === "string"){
            const packet = {
                from: socket.username, 
                message: message.slice(0,2000),
                timeStamp: Date.now()
            }

            socket.to(socket.thread).emit("receive", packet)
        }
    })

    socket.on("join", (thread)=>{
        socket.thread = thread
        socket.join(thread)
    })

    socket.on("leave", (thread)=>{
        socket.leave(thread)
    })
})

app.get('/', (req,res)=>{
    res.status(200).send("please use the API routes /api/")
})

app.post('/auth/login', asyncHandler(async (req,res)=>{
    const { username, password } = req.body
    
    const [result] = await connection.execute(
        'SELECT id, password FROM `users` WHERE username = ?',
        [username]
    )
    
    const hashedPassword = result[0].password
    const success = await bcrypt.compare(password,hashedPassword)

    if(success){
        const user = { sub: result[0].id, preferred_username: username }
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 1000*60*60*24*60,
            path: '/'
        })
        res.status(200).json({ access_token : accessToken })
    }
    else{
        res.status(401).send("UNAUTHORIZED")
    }
}))

app.get('/auth/authenticate', (req,res)=>{
    const header = req.headers['authorization']
    const token = header?.split(' ')[1] //REMOVES PREFIX - BEARER ACCESS_TOKEN -> ACCESS_TOKEN

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,user)=>{
        if(err) return res.status(403).send(err)

        res.status(200).send({ id: user.sub, username: user.preferred_username })
    })
})

app.use((err,req,res,next)=>{
    console.error(err.stack)
    res.status(500).send(err)
})

server.listen(process.env.SERVER_PORT, ()=>{
    console.log(`SERVER STARTED ON PORT ${process.env.SERVER_PORT}`)
})