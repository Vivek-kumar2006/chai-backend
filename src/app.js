import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app =express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended : true,limit:"16kb"}))
app.use(express.static("public"))    //koi bhi pdf ya images ho to usko public folder mein bhej do 
app.use(cookieParser())


export { app }