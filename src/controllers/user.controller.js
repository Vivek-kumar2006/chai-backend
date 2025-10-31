import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.service.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generatAccessandRefreshTokens= async(userId) =>{
    try {
      const user= await User.findById(userId)
      const accessToken =user.createAccessToken()
      const refreshToken= user.createRefreshToken()

     user.refreshToken=refreshToken
     await user.save({validateBeforeSave: false})
     
       return {accessToken,refreshToken}
    } 
    catch (error) {
      throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}



const registerUser =asyncHandler( async(req,res)=>{

    const {fullname,email,username,password} =req.body

    //console.log(req);
    
   if(
        [fullname,email,username,password].some((field) =>
            field?.trim()=== ""
        )
   ) {
      throw new ApiError(400,"All fields is required")
   }

 const ExistedUser= await User.findOne({
        $or:[{username},{email }]
   })
    
   if (ExistedUser) {
     throw  new ApiError(409,"User with email or Username already exists.")
   }
    // res.status(200).json({
    //     message:"Hitesh Sir"
    // })
    const avatarLocalPath= req.files?.avatar[0]?.path;
  //  const coverImageLocalPath= req.files?.coverImage[0]?.path;
   
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImage=req.files.coverImage.path
  }
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }
  const avatar = await uploadCloudinary(avatarLocalPath)
 const coverImage = await uploadCloudinary(coverImageLocalPath)

  

if(!avatar)
  {
     throw new ApiError(400,"Avatar file is required")
}

const user = await User.create({
  fullname,
  avatar:avatar.url,
  coverImage:coverImage?.url || "" ,
  email,
  password,
  username:username.toLowerCase()

})

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  //console.log(createdUser);
  
  if(!createdUser) {
    throw new ApiError(500,"Something went wrong while registering the User")
  }
   return res.status(201).json(
      new ApiResponse(200,createdUser,"User regu=istered Successfully")
    )
} )

const loginUser= asyncHandler(async(req,res) =>{
 const {username,email,password} =req.body
     if(!(username || email)){
           throw new ApiError(400,"Username or email is not registered.")
     }
     const user= await User.findOne({
      $or:[{username},{email}]
     })
     if(!user){
      throw new ApiError(400,"User is not registered")
     }
     const isPasswordValid = await  user.isPasswordCorrect(password)

     if (!isPasswordValid) {
       throw new ApiError(400,"Wrong Password! Please enter correct Password")
     }
      
const {refreshToken,accessToken} = await generatAccessandRefreshTokens(user._id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const options={
  httpOnly: true,
  secure: true
}

return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
     new ApiResponse(
      200,
      {
         user:loggedInUser,accessToken,refreshToken

      },
      "User logged In Successfully"
     )
)

})

const logoutUser= asyncHandler(async(req,res) =>{
  User.findByIdAndUpdate(
  await req.user._id,
    {
        $set:{
              refreshToken:undefined
        }
    },
    {
      new:true
    }

  )
  const options={
  httpOnly: true,
  secure: true
}
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(
    new ApiResponse(
      200,
      {},
      "User logged Out"
    )
  )
})


const refreshAccessToken=asyncHandler(async(req,res)=>{
     const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

     if(!incomingRefreshToken){
      throw new ApiError(400,"Unauthorized Request")
     }
 try {
    const decodedToken = jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET,
      )
      const user=User.findById(decodedToken._id)
     
      if (!user) {
          throw new ApiError(401,"Invalid refresh Token")
      }
     if (incomingRefreshToken!==user.refreshToken) {
       throw new ApiError(401,"Refresh token is expired ar used")
     }
       
     const options ={
       httpOnly:true,
       secure:true
 
     }
      const {accessToken,newRefreshToken}=  await generatAccessandRefreshTokens(user._id)
 
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
         new ApiResponse(
              200,
              {accessToken,refreshToken:newRefreshToken},
              "Access token refreshed Successfully"
         )
        )
 } catch (error) {
         throw new ApiError(401,error?.message || "Invalid refresh token")
 }
})

// const changeCurrentPassword =asyncHandler(async(req,res)=>{
          
// })

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
}
