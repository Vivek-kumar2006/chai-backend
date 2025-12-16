import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.service.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


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



const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    // 1. Validation
    if (
        [fullname, email, username, password].some((field) =>
            field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // 2. Check if user exists
    const ExistedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (ExistedUser) {
        throw new ApiError(409, "User with email or Username already exists.")
    }

    // 3. Handle Files
    // Safe check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    
    // FIX: Safe check for coverImage
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path; // <--- Accessed [0] correctly
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // 4. Upload to Cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath)
    
    // FIX: Only upload cover image if a local path exists
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadCloudinary(coverImageLocalPath)
    }

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required (Upload failed)")
    }

    // 5. Create User
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // <--- Handle empty cover image safely
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the User")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

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
     if (incomingRefreshToken!==user.refreshToken) 
      {
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

const changeCurrentPassword =asyncHandler(async(req,res)=>{
        const {oldPassword,newPassword}= req.body
        const user= User.findById( req.user._id)
        const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
        
        if (!isPasswordCorrect) {
            throw new ApiError(200,"Wrong Password Entered")
        }
        user.password=newPassword
              await user.save({validateBeforeSave:false})
        return res
                .status(200)
                .json(
                  new ApiResponse(
                    200,
                    {},
                     "Password Changed Successfully"
                 )
                )
                


})

const getCurrentUser= asyncHandler(async(req,res)=>{
     return res
     . status(200)
     .json(
      new ApiResponse(  200,
      req.user,
      "Current User fetched Successfully")
     )
      

})


const updateAccountDetails = asyncHandler(async(req,res)=>{
     const {fullname,email} = req.body

     if(!fullname || !email) {
      throw new ApiError(400,"All the fields are required")
     }

     const user=User.findByIdAndUpdate(
              req.user._id,
              {
                $set: {
                  fullname,
                  email
                }
              },
               {new: true} 
     ).select("-password")

     return res
     .status(200)
     .json(new ApiResponse(200,user,"Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
       const avatarLocalPath = req.file?.path
       if(!avatarLocalPath){
        throw new ApiError(200,"Avatar file is missing")
       }
       const avatar= await uploadCloudinary(avatarLocalPath)
       // const user= User.findById( req.user._id)

       if(!avatar.url){
          throw new ApiError(200,"Avatar file is not uploaded on cloudinary")
       }
        
     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
              avatar:avatar.url
            }
        },
        {new: true}
       ).select("-password")
      
       return res
       .status(200)
       .json(
           new ApiResponse(
                      200,
                      user,
            "Avatar updated successfully."
          )
       )


})

const updatecoverImage = asyncHandler(async(req,res)=>{
       const coverImageLocalPath = req.file?.path
       if(!coverImageLocalPath){
        throw new ApiError(200,"Cover Image file is missing")
       }
       const coverImage= await uploadCloudinary(coverImageLocalPath)
       // const user= User.findById( req.user._id)

       if(!coverImage.url){
          throw new ApiError(200,"Cover Image file is not uploaded on cloudinary")
       }
        
     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
           coverImage:coverImage.url
            }
        },
        {new: true}
       ).select("-password")
      
       return res
       .status(200)
       .json(
           new ApiResponse(
                      200,
                      user,
            "Cover image updated successfully."
          )
       )


})

const getChannelProfile =asyncHandler(async(req,res) =>{
      const {username} = req.params
       if(!username?.trim()){
        throw new ApiError(400,"username is missing")
       }
    const channel= await User.aggregate([
        {
            $match:{
               username:username?.toLowerCase()
            }
        },
        {
          $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
          }
        },
        {
           $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
          }
        },
        {
            $addFields: {
                 subscribersCount: {
                      $size: "$subscribers"
                 },
                 channelSubscribedToCount:{
                    $size: "$subscribedTo"
                 },
                 isSubscribed: {
                      $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                      }
                 }
            }
        },
        {
              $project:{
                  fullname:1,
                  username:1,
                  subscribersCount:1,
                  channelSubscribedToCount:1,
                  isSubscribed:1,
                  avatar:1,
                  coverImage:1,
                  email:1
              }
        }

      ])
        if(!channel?.length) {
          throw new ApiError(404,"channel does not exists")
        }
        return res
        .status(200)
        .json(
          new ApiResponse(200,channel[0],"User channel fetched successfully")
        )
})

const getWatchHistory =asyncHandler(async(req,res)=>{
         const user = await User.aggregate([
                {
                     $match: {
                      _id: new mongoose.Types.ObjectId(req.user._id)
                     }
                },
                {
                    $lookup: {
                        from:"videos",
                        localField:"watchHistory",
                        foreignField:"_id",
                        as:"watchHistory",
                        pipeline: [
                             {
                                $lookup: {
                                  from:"users",
                                  localField:"owner",
                                  foreignField:"_id",
                                  as:"owner",
                                  pipeline: [
                                    {
                                      $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar:1,

                                      }
                                    }
                                  ]
                                }
                             }
                        ]
                    }
                },
                {
                    $addFields:{
                        owner:{
                          $first: "$owner"
                        }
                    }
                }
         ])



})

console.log(getChannelProfile );
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updatecoverImage,
  getChannelProfile,
  getWatchHistory
}
