import mongoose, {Schema} from "mongoose";
import bcrypt from  "bcrypt"
import { JsonWebTokenError } from "jsonwebtoken";
const userSchema =new Schema(
    {
        username: {
            type:String,
            required:true,
            unique: true,
            lowercase:true,
            trim: true,
            index:true
      },
        email: {
            type:String,
            required:true,
            unique: true,
            lowercase:true,
            trim: true,
        },
          fullname: {
            type:String,
            required:true,
            trim: true,
            index:true,
        },
        avatar: {
            type:String,   //cloudinary url
            required:true,
        },
        coverImage: {
            type:String,   //cloudinary url
        },
        watchHistory:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password: {
            type:String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }
   },
   {
      timestamps:true
   }
)
 userSchema.pre("save", async function (next) {
    if(!this.password.isModified("password")) return next()

      this.password = awaitbcrypt.hash(this.password,10)
      next()
 })

 // 2 methods left 

 userSchema.methods.createAccessToken= function(){
   return jwt.sign(
        {
         _id:this._id,
         email:this.email,
         username:this.username,
        fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
    
 }

 userSchema.methods.createRefreshToken= function(){
   return jwt.sign(
        {
         _id:this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
    
 }
export const User =mongoose.model("User",userSchema)